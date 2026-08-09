-- 1. Ativa a extensão pgvector
create extension if not exists vector;

-- 2. Tabela de Memória Semântica dos Projetos (AgentDB)
create table if not exists public.projetos_embeddings (
  id uuid primary key default uuid_generate_v4(),
  projeto_id uuid references projetos(id) on delete cascade not null,
  conteudo_texto text not null, -- Resumo do que o projeto foi, escopo, e lições aprendidas
  embedding vector(768), -- Usaremos o modelo de embeddings do Gemini que gera 768 dimensões
  metadata jsonb default '{}'::jsonb, -- Dados extras como valor, tempo gasto, etc.
  criado_em timestamp with time zone default now()
);

-- Habilitar RLS
alter table public.projetos_embeddings enable row level security;

-- Políticas
drop policy if exists "Usuários autenticados podem ler embeddings" on public.projetos_embeddings;
drop policy if exists "embeddings_select_por_projeto" on public.projetos_embeddings;
create policy "embeddings_select_por_projeto"
on public.projetos_embeddings for select
to authenticated
using (
    public.get_my_perfil() in ('admin', 'equipe') or
    (
      public.get_my_perfil() = 'cliente' and
      exists (
        select 1
        from public.acessos_cliente ac
        where ac.usuario_id = auth.uid()
          and ac.projeto_id = projetos_embeddings.projeto_id
      )
    )
);

drop policy if exists "Admins e equipe técnica podem inserir/atualizar embeddings" on public.projetos_embeddings;
drop policy if exists "embeddings_write_staff" on public.projetos_embeddings;
create policy "embeddings_write_staff"
on public.projetos_embeddings for all
to authenticated
using (public.get_my_perfil() in ('admin', 'equipe'))
with check (public.get_my_perfil() in ('admin', 'equipe'));

-- 3. Função RPC de Similaridade (RAG Match)
-- Remover o overload legado evita ambiguidade no PostgREST. O quarto
-- argumento é opcional, portanto as chamadas atuais de três argumentos
-- continuam funcionando.
drop function if exists public.match_projetos(vector, double precision, integer);
drop function if exists public.match_projetos(vector, double precision, integer, uuid);
create function public.match_projetos (
  query_embedding vector(768),
  match_threshold double precision,
  match_count integer,
  filter_projeto_id uuid default null
)
returns table (
  projeto_id uuid,
  conteudo_texto text,
  metadata jsonb,
  similaridade double precision
)
language sql
stable
set search_path = public
as $$
  select
    pe.projeto_id,
    pe.conteudo_texto,
    pe.metadata,
    1 - (pe.embedding <=> query_embedding) as similaridade
  from public.projetos_embeddings pe
  where (filter_projeto_id is null or pe.projeto_id = filter_projeto_id)
    and 1 - (pe.embedding <=> query_embedding) > match_threshold
  order by pe.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function public.match_projetos(vector, double precision, integer, uuid) from public;
grant execute on function public.match_projetos(vector, double precision, integer, uuid) to authenticated, service_role;

-- 1. Ativa a extensão pgvector
create extension if not exists vector;

-- 2. Tabela de Memória Semântica dos Projetos (AgentDB)
create table if not exists projetos_embeddings (
  id uuid primary key default uuid_generate_v4(),
  projeto_id uuid references projetos(id) on delete cascade not null,
  conteudo_texto text not null, -- Resumo do que o projeto foi, escopo, e lições aprendidas
  embedding vector(768), -- Usaremos o modelo de embeddings do Gemini que gera 768 dimensões
  metadata jsonb default '{}'::jsonb, -- Dados extras como valor, tempo gasto, etc.
  criado_em timestamp with time zone default now()
);

-- Habilitar RLS
alter table projetos_embeddings enable row level security;

-- Políticas
create policy "Usuários autenticados podem ler embeddings"
on projetos_embeddings for select
to authenticated
using ( true );

create policy "Admins e equipe técnica podem inserir/atualizar embeddings"
on projetos_embeddings for all
to authenticated
using ( get_my_perfil() in ('admin', 'equipe') )
with check ( get_my_perfil() in ('admin', 'equipe') );

-- 3. Função RPC de Similaridade (RAG Match)
create or replace function match_projetos (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  projeto_id uuid,
  conteudo_texto text,
  metadata jsonb,
  similaridade float
)
language sql stable
as $$
  select
    pe.projeto_id,
    pe.conteudo_texto,
    pe.metadata,
    1 - (pe.embedding <=> query_embedding) as similaridade
  from projetos_embeddings pe
  where 1 - (pe.embedding <=> query_embedding) > match_threshold
  order by pe.embedding <=> query_embedding
  limit match_count;
$$;

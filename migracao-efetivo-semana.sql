-- ================================================================
-- MIGRAÇÃO · Histograma de Efetivo (Mão de Obra) por Semana
-- Gestão de Projetos
-- Rodar no Supabase SQL Editor:
--   https://supabase.com/dashboard/project/<PROJECT_REF>/sql
-- Seguro de rodar mais de uma vez (idempotente).
-- ================================================================

-- ========== TABELA: Efetivo Semanal (profissionais previstos x mobilizados) ==========
create table if not exists public.efetivo_semana (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  data_semana date not null,
  previstos integer default 0,    -- profissionais PREVISTOS para a semana
  mobilizados integer,            -- profissionais MOBILIZADOS (real); null = ainda não lançado
  semana_numero integer,          -- nº da semana do projeto (1, 2, 3, ...)
  criado_em timestamp default now(),
  unique (projeto_id, data_semana)
);

create index if not exists idx_efetivo_projeto on public.efetivo_semana(projeto_id);
create index if not exists idx_efetivo_data    on public.efetivo_semana(data_semana);

-- ========== RLS (mesmo padrão de atualizacoes_semana) ==========
alter table public.efetivo_semana enable row level security;

drop policy if exists "efetivo_select_staff"   on public.efetivo_semana;
drop policy if exists "efetivo_select_cliente" on public.efetivo_semana;
drop policy if exists "efetivo_write_staff"    on public.efetivo_semana;

-- admin e equipe veem o efetivo de todos os projetos
create policy "efetivo_select_staff" on public.efetivo_semana
  for select using (get_my_perfil() in ('admin', 'equipe'));

-- cliente vê só o efetivo dos projetos liberados a ele
create policy "efetivo_select_cliente" on public.efetivo_semana
  for select using (
    get_my_perfil() = 'cliente'
    and projeto_id in (
      select projeto_id from public.acessos_cliente where usuario_id = auth.uid()
    )
  );

-- admin e equipe inserem / editam / excluem
create policy "efetivo_write_staff" on public.efetivo_semana
  for all using (get_my_perfil() in ('admin', 'equipe'));

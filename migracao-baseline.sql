-- ============================================================
-- MIGRAÇÃO: baseline_projetos
-- Guarda o planejamento original congelado (início, fim, % previsto)
-- para comparação com o realizado ao longo da execução.
-- Rodar no SQL Editor do Supabase (projeto <PROJECT_REF>)
-- Data: 2026-06-23
-- ============================================================

create table if not exists public.baseline_projetos (
  id                uuid primary key default gen_random_uuid(),
  projeto_id        uuid not null references public.projetos(id) on delete cascade,
  data_congelamento date not null default current_date,
  inicio_original   date not null,
  fim_original      date not null,
  prev_original     numeric(5,2) not null default 0,  -- % previsto no momento do congelamento
  descricao         text,
  criado_em         timestamp default now(),
  criado_por        text
);

create index if not exists idx_baseline_projeto on public.baseline_projetos(projeto_id);

-- RLS
alter table public.baseline_projetos enable row level security;

drop policy if exists "baseline_admin_all"    on public.baseline_projetos;
drop policy if exists "baseline_equipe_select" on public.baseline_projetos;

create policy "baseline_admin_all" on public.baseline_projetos
  for all
  using      (get_my_perfil() = 'admin')
  with check (get_my_perfil() = 'admin');

create policy "baseline_equipe_select" on public.baseline_projetos
  for select
  using (get_my_perfil() in ('admin', 'equipe'));

-- ============================================================
-- MIGRAÇÃO: histórico de análises IA por projeto
-- Guarda cada análise gerada (não sobrescreve mais), permitindo
-- baixar PDF individual e manter trilha histórica conforme o
-- cronograma é reimportado e reanalisado.
-- Rodar no SQL Editor do Supabase (projeto uaooutzbxkkcyfuwijbi)
-- Data: 2026-07-03
-- ============================================================

create table if not exists public.analise_ia_historico (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  upload_id  uuid references public.uploads_xml(id) on delete set null,
  texto      text not null,
  criada_em  timestamptz not null default now(),
  criado_por text
);

create index if not exists idx_analise_ia_historico_projeto
  on public.analise_ia_historico(projeto_id, criada_em desc);

-- RLS
alter table public.analise_ia_historico enable row level security;

drop policy if exists "analise_ia_hist_admin_all"      on public.analise_ia_historico;
drop policy if exists "analise_ia_hist_equipe_select"  on public.analise_ia_historico;
drop policy if exists "analise_ia_hist_equipe_insert"  on public.analise_ia_historico;
drop policy if exists "analise_ia_hist_cliente_select" on public.analise_ia_historico;

create policy "analise_ia_hist_admin_all" on public.analise_ia_historico
  for all
  using      (public.get_my_perfil() = 'admin')
  with check (public.get_my_perfil() = 'admin');

create policy "analise_ia_hist_equipe_select" on public.analise_ia_historico
  for select
  using (public.get_my_perfil() = 'equipe');

create policy "analise_ia_hist_equipe_insert" on public.analise_ia_historico
  for insert
  with check (public.get_my_perfil() = 'equipe');

create policy "analise_ia_hist_cliente_select" on public.analise_ia_historico
  for select
  using (
    projeto_id in (
      select projeto_id from public.acessos_cliente
      where usuario_id = (select id from public.usuarios where email = auth.jwt()->>'email')
    )
  );

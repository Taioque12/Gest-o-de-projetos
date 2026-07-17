-- ============================================================
-- MIGRAÇÃO: funcionarios + programacao_semanal
-- Rodar no SQL Editor do Supabase (projeto <PROJECT_REF>)
-- Data: 2026-06-23
-- ============================================================

-- 1. Tabela funcionarios (cria se não existir)
create table if not exists public.funcionarios (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  cargo                text,
  equipe               text,
  sdai                 integer default 0 check (sdai between 0 and 10),
  instalacao_eletrica  integer default 0 check (instalacao_eletrica between 0 and 10),
  infraestrutura       integer default 0 check (infraestrutura between 0 and 10),
  instrumentacao       integer default 0 check (instrumentacao between 0 and 10),
  media_tensao         integer default 0 check (media_tensao between 0 and 10),
  alta_tensao          integer default 0 check (alta_tensao between 0 and 10),
  ativo                boolean default true,
  criado_em            timestamp default now(),
  atualizado_em        timestamp default now()
);

-- 2. Tabela programacao_semanal
create table if not exists public.programacao_semanal (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references public.projetos(id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  data_semana    date not null,
  dias           integer default 5 check (dias >= 0 and dias <= 7),
  criado_em      timestamp default now(),
  unique (projeto_id, funcionario_id, data_semana)
);

create index if not exists idx_prog_projeto    on public.programacao_semanal(projeto_id);
create index if not exists idx_prog_funcionario on public.programacao_semanal(funcionario_id);

-- 3. RLS: funcionarios
alter table public.funcionarios enable row level security;

drop policy if exists "func_admin_all"     on public.funcionarios;
drop policy if exists "func_equipe_select" on public.funcionarios;

create policy "func_admin_all" on public.funcionarios
  for all
  using      (get_my_perfil() = 'admin')
  with check (get_my_perfil() = 'admin');

create policy "func_equipe_select" on public.funcionarios
  for select
  using (get_my_perfil() = 'equipe');

-- 4. RLS: programacao_semanal
alter table public.programacao_semanal enable row level security;

drop policy if exists "prog_admin_all"   on public.programacao_semanal;
drop policy if exists "prog_equipe_all"  on public.programacao_semanal;

create policy "prog_admin_all" on public.programacao_semanal
  for all
  using      (get_my_perfil() = 'admin')
  with check (get_my_perfil() = 'admin');

create policy "prog_equipe_all" on public.programacao_semanal
  for all
  using      (get_my_perfil() = 'equipe')
  with check (get_my_perfil() = 'equipe');

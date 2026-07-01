-- ============================================================
-- MIGRAÇÃO: proteções de segurança — projeto SaaS (dev)
-- Alvo: gestao-projetos-dev (ndplkjgcogsmxvsyfunn)
-- NÃO rodar no projeto single-tenant (esse usa as migrations
-- migracao-protecao-perfil.sql / migracao-storage-rls.sql /
-- migracao-auditoria-completa.sql).
--
-- Corrige achados da inspeção de 2026-07-01:
--   1. CRÍTICO: policies ue_inserir_proprio/ue_insert_onboarding
--      só checavam auth_user_id = auth.uid() — qualquer usuário
--      autenticado podia se inserir como ADMIN de QUALQUER
--      empresa (takeover cross-tenant).
--   2. storage.objects sem NENHUMA policy e buckets públicos.
--   3. Funções SECURITY DEFINER sem search_path fixo.
--   4. Sem trilha de auditoria.
-- ============================================================

-- ============================================================
-- PARTE 1 — Anti-escalação em usuarios_empresa
-- ============================================================

-- Helper: empresa ainda sem membros (primeiro usuário do onboarding vira admin)
create or replace function public.empresa_sem_membros(p_empresa uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from usuarios_empresa where empresa_id = p_empresa);
$$;

drop policy if exists "ue_inserir_proprio" on public.usuarios_empresa;
drop policy if exists "ue_insert_onboarding" on public.usuarios_empresa;

-- Onboarding: só pode se auto-inserir em empresa que ainda não tem membros,
-- nunca como super_admin. Convites entram via ue_admin_gerenciar ou service role.
create policy "ue_insert_onboarding" on public.usuarios_empresa
  for insert to authenticated
  with check (
    auth_user_id = auth.uid()
    and coalesce(super_admin, false) = false
    and public.empresa_sem_membros(empresa_id)
  );

-- Trigger anti-escalação: campos sensíveis só mudam pela mão de admin da
-- própria empresa; super_admin só via service role (auth.uid() nulo).
create or replace function public.protege_usuarios_empresa()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- service role / triggers internos
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.super_admin, false) then
      raise exception 'super_admin só pode ser concedido pelo backend.';
    end if;
    return new;
  end if;

  if new.super_admin is distinct from old.super_admin then
    raise exception 'super_admin só pode ser alterado pelo backend.';
  end if;

  if new.empresa_id is distinct from old.empresa_id then
    raise exception 'Não é permitido mover usuário de empresa.';
  end if;

  if (new.perfil is distinct from old.perfil or new.ativo is distinct from old.ativo) then
    if public.get_meu_perfil() is distinct from 'admin'
       or old.empresa_id is distinct from public.get_empresa_id() then
      raise exception 'Sem permissão para alterar perfil ou ativação.';
    end if;
    if old.auth_user_id = auth.uid() then
      raise exception 'Você não pode alterar o próprio perfil ou status.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protege_usuarios_empresa on public.usuarios_empresa;
create trigger trg_protege_usuarios_empresa
  before insert or update on public.usuarios_empresa
  for each row execute procedure public.protege_usuarios_empresa();

-- Higiene: fixa search_path nas funções SECURITY DEFINER existentes
alter function public.get_meu_perfil() set search_path = public;
alter function public.get_empresa_id() set search_path = public;
alter function public.meu_funcionario_id() set search_path = public;
alter function public.projeto_permitido(uuid) set search_path = public;

-- ============================================================
-- PARTE 2 — Storage (bucket anexos privado + policies)
-- ATENÇÃO: exige frontend com signed URLs deployado junto.
-- ============================================================

update storage.buckets set public = false where id = 'anexos';

-- Helper: o path {projeto_id}/arquivo pertence a projeto da minha empresa?
create or replace function public.projeto_da_minha_empresa(p_projeto_texto text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from projetos
    where id::text = p_projeto_texto
      and empresa_id = public.get_empresa_id()
  );
$$;

drop policy if exists "storage_anexos_select" on storage.objects;
drop policy if exists "storage_anexos_insert" on storage.objects;
drop policy if exists "storage_anexos_update" on storage.objects;
drop policy if exists "storage_anexos_delete" on storage.objects;

create policy "storage_anexos_select" on storage.objects
  for select to authenticated using (
    bucket_id = 'anexos'
    and public.projeto_da_minha_empresa(split_part(name, '/', 1))
  );

create policy "storage_anexos_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'anexos'
    and public.get_meu_perfil() in ('admin', 'equipe')
    and public.projeto_da_minha_empresa(split_part(name, '/', 1))
  );

create policy "storage_anexos_update" on storage.objects
  for update to authenticated using (
    bucket_id = 'anexos'
    and public.get_meu_perfil() in ('admin', 'equipe')
    and public.projeto_da_minha_empresa(split_part(name, '/', 1))
  );

create policy "storage_anexos_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'anexos'
    and public.get_meu_perfil() in ('admin', 'equipe')
    and public.projeto_da_minha_empresa(split_part(name, '/', 1))
  );

-- Bucket funcionarios: leitura pública (fotos), escrita só admin/equipe
drop policy if exists "storage_func_insert" on storage.objects;
drop policy if exists "storage_func_update" on storage.objects;
drop policy if exists "storage_func_delete" on storage.objects;

create policy "storage_func_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'funcionarios'
    and public.get_meu_perfil() in ('admin', 'equipe')
  );

create policy "storage_func_update" on storage.objects
  for update to authenticated using (
    bucket_id = 'funcionarios'
    and public.get_meu_perfil() in ('admin', 'equipe')
  );

create policy "storage_func_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'funcionarios'
    and public.get_meu_perfil() in ('admin', 'equipe')
  );

-- ============================================================
-- PARTE 3 — Auditoria (audit_log + triggers)
-- ============================================================

create table if not exists public.audit_log (
  id           bigint generated always as identity primary key,
  tabela       text not null,
  operacao     text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id  text,
  usuario_id   uuid,          -- auth.uid(); nulo em chamadas via service_role
  dados_antes  jsonb,
  dados_depois jsonb,
  criado_em    timestamptz not null default now()
);

create index if not exists idx_audit_log_tabela   on public.audit_log(tabela, criado_em desc);
create index if not exists idx_audit_log_usuario  on public.audit_log(usuario_id, criado_em desc);
create index if not exists idx_audit_log_registro on public.audit_log(registro_id);

alter table public.audit_log enable row level security;

-- Admin vê só o log de registros da própria empresa
drop policy if exists "audit_select_admin" on public.audit_log;
create policy "audit_select_admin" on public.audit_log
  for select using (
    get_meu_perfil() = 'admin'
    and (
      dados_depois ->> 'empresa_id' = get_empresa_id()::text
      or dados_antes ->> 'empresa_id' = get_empresa_id()::text
    )
  );

create or replace function public.registra_auditoria()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_registro_id text;
begin
  if tg_op = 'DELETE' then
    v_registro_id := old.id::text;
  else
    v_registro_id := new.id::text;
  end if;

  insert into public.audit_log (tabela, operacao, registro_id, usuario_id, dados_antes, dados_depois)
  values (
    tg_table_name,
    tg_op,
    v_registro_id,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_projetos on public.projetos;
create trigger trg_audit_projetos
  after insert or update or delete on public.projetos
  for each row execute procedure public.registra_auditoria();

drop trigger if exists trg_audit_usuarios_empresa on public.usuarios_empresa;
create trigger trg_audit_usuarios_empresa
  after insert or update or delete on public.usuarios_empresa
  for each row execute procedure public.registra_auditoria();

drop trigger if exists trg_audit_acessos on public.acessos_cliente;
create trigger trg_audit_acessos
  after insert or update or delete on public.acessos_cliente
  for each row execute procedure public.registra_auditoria();

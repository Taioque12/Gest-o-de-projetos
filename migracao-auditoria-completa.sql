-- ============================================================
-- MIGRAÇÃO: auditoria completa (audit_log + triggers)
-- Rodar no SQL Editor do Supabase (projeto uaooutzbxkkcyfuwijbi)
--
-- Complementa a migracao-auditoria.sql (que só marca autoria de
-- lançamentos). Aqui todo INSERT/UPDATE/DELETE em tabelas
-- sensíveis vira uma linha imutável em audit_log com quem fez,
-- quando, e o antes/depois — base para investigar incidentes e
-- requisito comum de cliente enterprise.
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

-- Só admin lê; ninguém insere/edita/apaga via API (as linhas
-- entram pelo trigger, que roda como dono da tabela e ignora RLS)
alter table public.audit_log enable row level security;

drop policy if exists "audit_select_admin" on public.audit_log;
create policy "audit_select_admin" on public.audit_log
  for select using (get_my_perfil() = 'admin');

-- Função genérica de auditoria
create or replace function public.registra_auditoria()
returns trigger
language plpgsql
security definer set search_path = public
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

-- Triggers nas tabelas sensíveis
drop trigger if exists trg_audit_projetos on public.projetos;
create trigger trg_audit_projetos
  after insert or update or delete on public.projetos
  for each row execute procedure public.registra_auditoria();

drop trigger if exists trg_audit_acessos on public.acessos_cliente;
create trigger trg_audit_acessos
  after insert or update or delete on public.acessos_cliente
  for each row execute procedure public.registra_auditoria();

drop trigger if exists trg_audit_usuarios on public.usuarios;
create trigger trg_audit_usuarios
  after insert or update or delete on public.usuarios
  for each row execute procedure public.registra_auditoria();

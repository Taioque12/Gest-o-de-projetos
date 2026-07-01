-- ============================================================
-- MIGRAÇÃO: proteção contra escalação de privilégio no perfil
-- Rodar no SQL Editor do Supabase (projeto uaooutzbxkkcyfuwijbi)
--
-- A policy "usuarios_update_proprio" permite que o usuário edite
-- a própria linha — incluindo o campo perfil. Sem este trigger,
-- um cliente pode se promover a admin com um simples UPDATE via
-- API. O trigger bloqueia mudança de perfil por quem não é admin.
--
-- Nota: chamadas via service_role (edge functions) têm auth.uid()
-- nulo, então get_my_perfil() retorna NULL e a condição não
-- dispara — o backend continua podendo ajustar perfis.
-- ============================================================

create or replace function public.protege_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.perfil is distinct from old.perfil
     and public.get_my_perfil() <> 'admin' then
    raise exception 'Sem permissão para alterar o perfil de usuário.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protege_perfil on public.usuarios;
create trigger trg_protege_perfil
  before update on public.usuarios
  for each row execute procedure public.protege_perfil();

-- Também impede que o usuário mude o próprio flag "ativo"
-- (desativado por admin não pode se reativar sozinho)
create or replace function public.protege_ativo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.ativo is distinct from old.ativo
     and public.get_my_perfil() <> 'admin' then
    raise exception 'Sem permissão para alterar o status de ativação.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protege_ativo on public.usuarios;
create trigger trg_protege_ativo
  before update on public.usuarios
  for each row execute procedure public.protege_ativo();

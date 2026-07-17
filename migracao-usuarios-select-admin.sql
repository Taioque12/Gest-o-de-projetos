-- ============================================================
-- MIGRAÇÃO: admin enxerga todos os usuários da equipe
-- A policy "usuarios_select_proprio" (supabase_rls.sql) só deixa
-- cada usuário ver a própria linha — por isso a tela de Acessos
-- (só acessível a admin) não listava colegas recém-criados.
-- Rodar no SQL Editor do Supabase (projeto <PROJECT_REF>)
-- Data: 2026-07-03
-- ============================================================

drop policy if exists "usuarios_select_admin" on public.usuarios;

create policy "usuarios_select_admin" on public.usuarios
  for select using (get_my_perfil() = 'admin');

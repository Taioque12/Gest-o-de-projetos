-- ============================================================
-- MIGRAÇÃO FASE 9b: Remove tabela legada `usuarios`
-- Rodar DEPOIS de migracao-fase9-limpeza-rls.sql
-- Data: 2026-06-29
--
-- A tabela `usuarios` foi substituída por `usuarios_empresa`.
-- A única dependência era a FK acessos_cliente.usuario_id → usuarios(id).
-- Como o cliente loga via Supabase Auth, a coluna passa a referenciar
-- auth.users(id). Ambas as tabelas estavam vazias → sem migração de dados.
-- ============================================================

-- 1. Remove a FK legada
ALTER TABLE acessos_cliente DROP CONSTRAINT IF EXISTS acessos_cliente_usuario_id_fkey;

-- 2. Repõe a FK apontando para auth.users (uid do cliente)
ALTER TABLE acessos_cliente
  ADD CONSTRAINT acessos_cliente_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Remove a tabela legada
DROP TABLE IF EXISTS usuarios;

-- ============================================================
-- MIGRAÇÃO FASE 10b: Painel do Operador (super-admin)
-- Rodar DEPOIS de migracao-fase10-assinaturas-pagamentos.sql
-- Projeto: ndplkjgcogsmxvsyfunn (DEV)
-- ============================================================

-- 1. Flag de super-admin (operador do SaaS). Não tem RLS própria —
-- a leitura cross-empresa acontece só via Edge Function com
-- service_role, nunca direto do cliente.
ALTER TABLE usuarios_empresa
  ADD COLUMN IF NOT EXISTS super_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Marca o usuário operador (ajuste o e-mail antes de rodar).
UPDATE usuarios_empresa
  SET super_admin = true
  WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = 'lmachado2265@gmail.com');

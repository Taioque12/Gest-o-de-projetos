-- ============================================================
-- MIGRAÇÃO FASE 3: Onboarding + Convite de Usuários
-- Rodar DEPOIS de migracao-fase2-rls.sql
-- Data: 2026-06-26
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Colunas nome/email em usuarios_empresa
--    (usadas pela tela de Acessos e Edge Function admin-create-user)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE usuarios_empresa
  ADD COLUMN IF NOT EXISTS nome  TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- ─────────────────────────────────────────────────────────────
-- 2. Policy de INSERT em empresas (onboarding)
--    Usuário autenticado novo ainda não está em usuarios_empresa,
--    então get_empresa_id() é NULL. Precisa poder criar a empresa.
--    Remove policy duplicada antiga (empresas_criar) se existir.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "empresas_criar"             ON empresas;
DROP POLICY IF EXISTS "empresas_insert_onboarding" ON empresas;

CREATE POLICY "empresas_insert_onboarding" ON empresas
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 3. Policy de INSERT em usuarios_empresa (vínculo no onboarding)
--    Usuário só pode se vincular com o próprio auth.uid().
--    A policy admin (ue_admin_gerenciar) exige get_empresa_id(),
--    que é NULL antes do vínculo — por isso esta policy separada.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ue_insert_onboarding" ON usuarios_empresa;

CREATE POLICY "ue_insert_onboarding" ON usuarios_empresa
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- ============================================================
-- NOTA FRONTEND:
-- O INSERT em empresas deve gerar o UUID no cliente
-- (crypto.randomUUID()) e NÃO usar .select() no retorno —
-- o RETURNING dispara a SELECT policy (empresas_ver_propria),
-- que ainda bloqueia antes do vínculo existir.
-- Ver frontend/src/pages/OnboardingEmpresa.jsx
-- ============================================================

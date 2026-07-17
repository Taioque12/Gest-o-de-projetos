-- ============================================================
-- MIGRAÇÃO: cache de análise IA por projeto
-- Rodar no SQL Editor do Supabase (projeto <PROJECT_REF>)
-- ============================================================

ALTER TABLE projetos
  ADD COLUMN IF NOT EXISTS ultima_analise_ia TEXT,
  ADD COLUMN IF NOT EXISTS analise_ia_em TIMESTAMPTZ;

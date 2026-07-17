-- ============================================================
-- MIGRAÇÃO: rate limit da análise IA (Gemini) por usuário
-- Rodar no SQL Editor do Supabase (projeto <PROJECT_REF>)
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limit_analise_ia (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  janela_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  chamadas      INTEGER NOT NULL DEFAULT 1
);

-- RLS: ninguém lê/escreve direto — só a Edge Function via service role.
ALTER TABLE rate_limit_analise_ia ENABLE ROW LEVEL SECURITY;

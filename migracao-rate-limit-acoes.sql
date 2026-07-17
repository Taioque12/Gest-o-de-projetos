-- ============================================================
-- MIGRAÇÃO: rate limit genérico por usuário+ação
-- Rodar no SQL Editor do Supabase (projeto <PROJECT_REF>)
--
-- Generaliza o padrão já usado em rate_limit_analise_ia pra outras
-- Edge Functions sensíveis (admin-create-user) sem duplicar tabela
-- por função.
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limit_acoes (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acao          TEXT NOT NULL,
  janela_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  chamadas      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, acao)
);

ALTER TABLE rate_limit_acoes ENABLE ROW LEVEL SECURITY;

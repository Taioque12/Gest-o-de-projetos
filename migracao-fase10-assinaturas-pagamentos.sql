-- ============================================================
-- MIGRAÇÃO FASE 10 (pagamento): Tabelas assinaturas + pagamentos (Mercado Pago)
-- Rodar DEPOIS de migracao-fase9b-remove-usuarios-legado.sql
-- Data: 2026-06-29
--
-- Modelo de cobrança: assinatura recorrente (cartão) + PIX avulso mensal.
-- (MP não suporta recorrência automática via PIX — só cartão.)
--
-- Segurança: empresa só LÊ as próprias linhas (RLS por empresa_id).
-- Escrita (INSERT/UPDATE) é feita SOMENTE pelas Edge Functions via
-- service_role (que bypassa RLS) — cliente não pode forjar pagamento.
-- Validado: authenticated não consegue INSERT (sem policy = negado).
-- ============================================================

-- 1. assinaturas: vínculo empresa ↔ Mercado Pago
CREATE TABLE IF NOT EXISTS assinaturas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mp_preapproval_id  text,
  plano              text NOT NULL,              -- pro | enterprise
  metodo             text NOT NULL,              -- cartao | pix
  status             text NOT NULL DEFAULT 'pending', -- pending|authorized|paused|cancelled
  valor              numeric NOT NULL,
  proxima_cobranca   date,
  criado_em          timestamptz DEFAULT now(),
  atualizado_em      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assinaturas_empresa ON assinaturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_mp ON assinaturas(mp_preapproval_id);

-- 2. pagamentos: histórico de cada cobrança
CREATE TABLE IF NOT EXISTS pagamentos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  assinatura_id  uuid REFERENCES assinaturas(id) ON DELETE SET NULL,
  mp_payment_id  text,
  plano          text,
  metodo         text,                          -- cartao | pix | boleto
  valor          numeric,
  status         text NOT NULL,                 -- approved|pending|rejected|refunded
  pago_em        timestamptz,
  criado_em      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa ON pagamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mp ON pagamentos(mp_payment_id);

-- 3. RLS: cliente lê só as próprias; escrita só via service_role
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assinaturas_select" ON assinaturas;
CREATE POLICY "assinaturas_select" ON assinaturas
  FOR SELECT TO authenticated
  USING (empresa_id = get_empresa_id());

DROP POLICY IF EXISTS "pagamentos_select" ON pagamentos;
CREATE POLICY "pagamentos_select" ON pagamentos
  FOR SELECT TO authenticated
  USING (empresa_id = get_empresa_id());

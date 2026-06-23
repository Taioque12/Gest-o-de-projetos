-- ═══════════════════════════════════════════════════════════
-- MIGRAÇÃO: Habilidades dinâmicas por empresa (multi-tenant ready)
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════

-- 1. Catálogo de habilidades (futuro: tenant_id para multi-empresa)
CREATE TABLE IF NOT EXISTS habilidades (
  id        UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nome      TEXT    NOT NULL,
  ordem     INTEGER DEFAULT 0,
  ativo     BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
  -- FUTURO multi-tenant: adicionar tenant_id UUID REFERENCES auth.users(id)
);

-- 2. Notas de habilidades por funcionário
CREATE TABLE IF NOT EXISTS avaliacoes_habilidades (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE NOT NULL,
  habilidade_id  UUID REFERENCES habilidades(id)  ON DELETE CASCADE NOT NULL,
  nota           NUMERIC(3,1) DEFAULT 0 CHECK (nota >= 0 AND nota <= 10),
  UNIQUE(funcionario_id, habilidade_id)
);

-- 3. Seed com habilidades padrão
INSERT INTO habilidades (nome, ordem) VALUES
  ('Alarme de Incêndio (SDAI)', 1),
  ('Instalação Elétrica',       2),
  ('Montagem de Infraestrutura',3),
  ('Instrumentação',            4),
  ('Média Tensão',              5),
  ('Alta Tensão',               6)
ON CONFLICT DO NOTHING;

-- 4. Migrar dados das colunas antigas para nova tabela
INSERT INTO avaliacoes_habilidades (funcionario_id, habilidade_id, nota)
SELECT f.id, h.id,
  CASE h.nome
    WHEN 'Alarme de Incêndio (SDAI)'   THEN COALESCE(f.sdai, 0)
    WHEN 'Instalação Elétrica'         THEN COALESCE(f.instalacao_eletrica, 0)
    WHEN 'Montagem de Infraestrutura'  THEN COALESCE(f.infraestrutura, 0)
    WHEN 'Instrumentação'              THEN COALESCE(f.instrumentacao, 0)
    WHEN 'Média Tensão'                THEN COALESCE(f.media_tensao, 0)
    WHEN 'Alta Tensão'                 THEN COALESCE(f.alta_tensao, 0)
    ELSE 0
  END
FROM funcionarios f
CROSS JOIN habilidades h
ON CONFLICT (funcionario_id, habilidade_id) DO NOTHING;

-- 5. RLS (Row Level Security)
ALTER TABLE habilidades             ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_habilidades  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habilidades_leitura"  ON habilidades            FOR SELECT TO authenticated USING (true);
CREATE POLICY "habilidades_escrita"  ON habilidades            FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "avaliacoes_leitura"   ON avaliacoes_habilidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "avaliacoes_escrita"   ON avaliacoes_habilidades FOR ALL    TO authenticated USING (true) WITH CHECK (true);

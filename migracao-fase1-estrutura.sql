-- ============================================================
-- MIGRAÇÃO FASE 1: Estrutura Multi-Tenant
-- Rodar no SQL Editor do Supabase (projeto uaooutzbxkkcyfuwijbi)
-- Data: 2026-06-24
-- ============================================================
-- ORDEM DE EXECUÇÃO IMPORTANTE: rodar tudo de uma vez

-- ─────────────────────────────────────────────────────────────
-- 1. TABELA: empresas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj                 TEXT UNIQUE NOT NULL,
  nome_empresa         TEXT NOT NULL,
  nome_responsavel     TEXT,
  email_responsavel    TEXT,
  telefone             TEXT,
  plano                TEXT DEFAULT 'free' CHECK (plano IN ('free', 'pro', 'enterprise')),
  ativo                BOOLEAN DEFAULT true,
  data_criacao         TIMESTAMPTZ DEFAULT now(),
  data_cancelamento    TIMESTAMPTZ,
  limite_projetos      INTEGER DEFAULT 3,
  limite_funcionarios  INTEGER DEFAULT 10,
  limite_habilidades   INTEGER DEFAULT 5
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON empresas(ativo);

-- ─────────────────────────────────────────────────────────────
-- 2. TABELA: usuarios_empresa
-- Liga auth.users à empresa + define perfil
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios_empresa (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id     UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  perfil         TEXT NOT NULL CHECK (perfil IN ('admin', 'equipe', 'cliente')),
  ativo          BOOLEAN DEFAULT true,
  data_convite   TIMESTAMPTZ DEFAULT now(),
  data_aceite    TIMESTAMPTZ,
  criado_em      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(auth_user_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_auth_user ON usuarios_empresa(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_empresa   ON usuarios_empresa(empresa_id);

-- ─────────────────────────────────────────────────────────────
-- 3. ADICIONAR empresa_id NAS TABELAS EXISTENTES
-- ─────────────────────────────────────────────────────────────

-- projetos
ALTER TABLE projetos
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_projetos_empresa ON projetos(empresa_id);

-- funcionarios
ALTER TABLE funcionarios
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa ON funcionarios(empresa_id);

-- habilidades
ALTER TABLE habilidades
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_habilidades_empresa ON habilidades(empresa_id);

-- programacao_semanal
ALTER TABLE programacao_semanal
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_programacao_empresa ON programacao_semanal(empresa_id);

-- efetivo_semana
ALTER TABLE efetivo_semana
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_efetivo_empresa ON efetivo_semana(empresa_id);

-- uploads_xml
ALTER TABLE uploads_xml
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_uploads_empresa ON uploads_xml(empresa_id);

-- acessos_cliente — adiciona empresa_id (mantém usuario_id existente por compatibilidade)
ALTER TABLE acessos_cliente
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_acessos_empresa ON acessos_cliente(empresa_id);

-- ─────────────────────────────────────────────────────────────
-- 4. EMPRESA LEGADO — migrar dados existentes
-- ─────────────────────────────────────────────────────────────
-- Cria empresa para os dados atuais da MA CONEGLIAN
INSERT INTO empresas (cnpj, nome_empresa, nome_responsavel, email_responsavel, plano,
                      limite_projetos, limite_funcionarios, limite_habilidades)
VALUES ('00.000.000/0001-00', 'MA CONEGLIAN', 'Gestor', 'gestor@maconeglia.com', 'pro',
        100, 100, 50)
ON CONFLICT (cnpj) DO NOTHING;

-- Guarda o ID para usar abaixo
DO $$
DECLARE
  v_empresa_id UUID;
  v_user_id    UUID;
BEGIN
  SELECT id INTO v_empresa_id FROM empresas WHERE cnpj = '00.000.000/0001-00';

  -- Vincula gestor@maconeglia.com como admin
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'gestor@maconeglia.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO usuarios_empresa (auth_user_id, empresa_id, perfil, data_aceite)
    VALUES (v_user_id, v_empresa_id, 'admin', now())
    ON CONFLICT (auth_user_id, empresa_id) DO NOTHING;
  END IF;

  -- Vincula carlos@maconeglia.com como equipe
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'carlos@maconeglia.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO usuarios_empresa (auth_user_id, empresa_id, perfil, data_aceite)
    VALUES (v_user_id, v_empresa_id, 'equipe', now())
    ON CONFLICT (auth_user_id, empresa_id) DO NOTHING;
  END IF;

  -- Vincula patricia@maconeglia.com como equipe
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'patricia@maconeglia.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO usuarios_empresa (auth_user_id, empresa_id, perfil, data_aceite)
    VALUES (v_user_id, v_empresa_id, 'equipe', now())
    ON CONFLICT (auth_user_id, empresa_id) DO NOTHING;
  END IF;

  -- Vincula rafael@maconeglia.com como equipe
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'rafael@maconeglia.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO usuarios_empresa (auth_user_id, empresa_id, perfil, data_aceite)
    VALUES (v_user_id, v_empresa_id, 'equipe', now())
    ON CONFLICT (auth_user_id, empresa_id) DO NOTHING;
  END IF;

  -- Atualiza empresa_id em todas as tabelas de dados existentes
  UPDATE projetos            SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE funcionarios        SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE habilidades         SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE programacao_semanal SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE efetivo_semana      SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE uploads_xml         SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
  UPDATE acessos_cliente     SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
END $$;

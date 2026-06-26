-- ============================================================
-- MIGRAÇÃO FASE 8: Limites por plano (enforcement no banco)
-- Rodar DEPOIS de migracao-fase7-observabilidade.sql
-- Data: 2026-06-26
--
-- Limites:  free = 2 proj / 5 func / 5 hab
--           pro  = 15 proj / 30 func / 20 hab
--           enterprise = ilimitado (NULL)
--
-- Enforcement é no banco (trigger) — não pode ser burlado pelo
-- cliente. As funções de checagem são SECURITY DEFINER para contar
-- todas as linhas da empresa sem interferência de RLS (ex.: perfil
-- cliente, que via RLS só enxerga projetos liberados).
-- ============================================================

-- 1. Aplica limites conforme o plano (mantém colunas limite_* em sync)
CREATE OR REPLACE FUNCTION aplicar_limites_plano()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plano = 'free' THEN
    NEW.limite_projetos    := 2;
    NEW.limite_funcionarios := 5;
    NEW.limite_habilidades  := 5;
  ELSIF NEW.plano = 'pro' THEN
    NEW.limite_projetos    := 15;
    NEW.limite_funcionarios := 30;
    NEW.limite_habilidades  := 20;
  ELSIF NEW.plano = 'enterprise' THEN
    NEW.limite_projetos    := NULL;  -- ilimitado
    NEW.limite_funcionarios := NULL;
    NEW.limite_habilidades  := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aplicar_limites_plano ON empresas;
CREATE TRIGGER trg_aplicar_limites_plano
  BEFORE INSERT OR UPDATE OF plano ON empresas
  FOR EACH ROW EXECUTE FUNCTION aplicar_limites_plano();

-- 2. Enforcement por recurso (SECURITY DEFINER p/ contar sem RLS)
CREATE OR REPLACE FUNCTION checar_limite_projetos()
RETURNS TRIGGER AS $$
DECLARE lim INT; atual INT;
BEGIN
  SELECT limite_projetos INTO lim FROM empresas WHERE id = NEW.empresa_id;
  IF lim IS NOT NULL THEN
    SELECT COUNT(*) INTO atual FROM projetos WHERE empresa_id = NEW.empresa_id;
    IF atual >= lim THEN
      RAISE EXCEPTION 'Limite de projetos do seu plano atingido (%). Faça upgrade para adicionar mais.', lim
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION checar_limite_funcionarios()
RETURNS TRIGGER AS $$
DECLARE lim INT; atual INT;
BEGIN
  SELECT limite_funcionarios INTO lim FROM empresas WHERE id = NEW.empresa_id;
  IF lim IS NOT NULL THEN
    SELECT COUNT(*) INTO atual FROM funcionarios WHERE empresa_id = NEW.empresa_id;
    IF atual >= lim THEN
      RAISE EXCEPTION 'Limite de funcionários do seu plano atingido (%). Faça upgrade para adicionar mais.', lim
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION checar_limite_habilidades()
RETURNS TRIGGER AS $$
DECLARE lim INT; atual INT;
BEGIN
  SELECT limite_habilidades INTO lim FROM empresas WHERE id = NEW.empresa_id;
  IF lim IS NOT NULL THEN
    SELECT COUNT(*) INTO atual FROM habilidades WHERE empresa_id = NEW.empresa_id AND ativo = true;
    IF atual >= lim THEN
      RAISE EXCEPTION 'Limite de habilidades do seu plano atingido (%). Faça upgrade para adicionar mais.', lim
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_limite_projetos    ON projetos;
DROP TRIGGER IF EXISTS trg_limite_funcionarios ON funcionarios;
DROP TRIGGER IF EXISTS trg_limite_habilidades  ON habilidades;

CREATE TRIGGER trg_limite_projetos
  BEFORE INSERT ON projetos
  FOR EACH ROW EXECUTE FUNCTION checar_limite_projetos();

CREATE TRIGGER trg_limite_funcionarios
  BEFORE INSERT ON funcionarios
  FOR EACH ROW EXECUTE FUNCTION checar_limite_funcionarios();

CREATE TRIGGER trg_limite_habilidades
  BEFORE INSERT ON habilidades
  FOR EACH ROW EXECUTE FUNCTION checar_limite_habilidades();

-- 3. Reaplica limites nas empresas existentes conforme plano atual
UPDATE empresas SET plano = plano;

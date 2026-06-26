-- ============================================================
-- MIGRAÇÃO FASE 9 (pré-beta): Correção de RLS + limpeza
-- Rodar DEPOIS de migracao-fase8-limites-plano.sql
-- Data: 2026-06-26
--
-- Corrige 2 vazamentos cross-tenant encontrados na revisão pré-beta:
--   - baseline_projetos estava com RLS DESLIGADA
--   - indisponibilidades tinha policy USING(true) (liberava tudo)
-- E remove a tabela órfã `baselines` (schema antigo, sem uso).
--
-- NOTA: a tabela legada `usuarios` NÃO foi removida — há FK
-- acessos_cliente.usuario_id apontando para ela. Limpar isso exige
-- migrar/remover essa coluna antes. Tratar separadamente.
-- ============================================================

-- 1. baseline_projetos: liga RLS e isola por projeto_id → empresa_id
ALTER TABLE baseline_projetos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "baseline_projetos_select" ON baseline_projetos;
DROP POLICY IF EXISTS "baseline_projetos_modify" ON baseline_projetos;

CREATE POLICY "baseline_projetos_select" ON baseline_projetos
  FOR SELECT TO authenticated
  USING (projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id()));

CREATE POLICY "baseline_projetos_modify" ON baseline_projetos
  FOR ALL TO authenticated
  USING (projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
         AND get_meu_perfil() = ANY (ARRAY['admin','equipe']))
  WITH CHECK (projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
         AND get_meu_perfil() = ANY (ARRAY['admin','equipe']));

-- 2. indisponibilidades: troca USING(true) por isolamento via funcionario_id
DROP POLICY IF EXISTS "acesso_autenticado" ON indisponibilidades;

CREATE POLICY "indisp_select" ON indisponibilidades
  FOR SELECT TO authenticated
  USING (funcionario_id IN (SELECT id FROM funcionarios WHERE empresa_id = get_empresa_id()));

CREATE POLICY "indisp_modify" ON indisponibilidades
  FOR ALL TO authenticated
  USING (funcionario_id IN (SELECT id FROM funcionarios WHERE empresa_id = get_empresa_id())
         AND get_meu_perfil() = ANY (ARRAY['admin','equipe']))
  WITH CHECK (funcionario_id IN (SELECT id FROM funcionarios WHERE empresa_id = get_empresa_id())
         AND get_meu_perfil() = ANY (ARRAY['admin','equipe']));

-- 3. Remove tabela órfã (vazia, schema jsonb antigo; a real é baseline_projetos)
DROP TABLE IF EXISTS baselines;

-- ============================================================
-- NOTA FRONTEND:
-- useAnexos agora recebe empresaId e grava empresa_id no INSERT
-- (a policy anexos_insert exige empresa_id = get_empresa_id();
-- sem isso, todo upload falhava). Ver hooks/useAnexos.js +
-- components/ProjectModal.jsx.
-- ============================================================

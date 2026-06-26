-- ============================================================
-- MIGRAÇÃO FASE 7: Observabilidade
-- Rodar DEPOIS de migracao-fase3-onboarding.sql
-- Data: 2026-06-26
-- ============================================================

-- View de uso vs limites por empresa.
--
-- IMPORTANTE: security_invoker = on faz a view respeitar a RLS do
-- usuário que consulta. Sem isso (default no PG), a view rodaria como
-- dono (postgres) e BYPASSARIA a RLS — qualquer usuário autenticado
-- veria o uso de TODAS as empresas (vazamento cross-tenant).
--   - In-app (authenticated): cada tenant vê só a própria linha.
--   - Monitoramento global do operador: usar service-role (bypassa RLS).
DROP VIEW IF EXISTS uso_por_empresa;

CREATE VIEW uso_por_empresa
WITH (security_invoker = on) AS
SELECT
  e.id,
  e.nome_empresa,
  e.plano,
  e.ativo,
  -- Projetos
  (SELECT COUNT(*) FROM projetos     p WHERE p.empresa_id = e.id) AS num_projetos,
  e.limite_projetos,
  ROUND(100.0 * (SELECT COUNT(*) FROM projetos p WHERE p.empresa_id = e.id)
        / NULLIF(e.limite_projetos, 0), 1) AS pct_projetos,
  -- Funcionários
  (SELECT COUNT(*) FROM funcionarios f WHERE f.empresa_id = e.id) AS num_funcionarios,
  e.limite_funcionarios,
  ROUND(100.0 * (SELECT COUNT(*) FROM funcionarios f WHERE f.empresa_id = e.id)
        / NULLIF(e.limite_funcionarios, 0), 1) AS pct_funcionarios,
  -- Habilidades (ativas)
  (SELECT COUNT(*) FROM habilidades h WHERE h.empresa_id = e.id AND h.ativo = true) AS num_habilidades,
  e.limite_habilidades,
  -- Usuários (membros ativos)
  (SELECT COUNT(*) FROM usuarios_empresa u WHERE u.empresa_id = e.id AND u.ativo = true) AS num_usuarios,
  e.data_criacao
FROM empresas e;

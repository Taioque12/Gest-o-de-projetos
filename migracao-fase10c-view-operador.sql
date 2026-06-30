-- ============================================================
-- MIGRAÇÃO FASE 10c: View agregada pro painel do operador
-- Rodar DEPOIS de migracao-fase10b-painel-operador.sql
-- Projeto: ndplkjgcogsmxvsyfunn (DEV)
--
-- Defesa em profundidade: o painel do operador usava service_role
-- pra consultar projetos/funcionarios direto (só id+empresa_id, mas
-- ainda assim acesso à tabela de negócio). Esta view expõe SÓ
-- contagens agregadas — nenhuma coluna de conteúdo de projeto,
-- funcionário ou cliente. Mesmo um erro futuro de código que troque
-- a query da function por "select *" nesta view não vaza dado de
-- negócio, porque a view não TEM essas colunas.
-- ============================================================

CREATE OR REPLACE VIEW painel_operador_resumo AS
SELECT
  e.id,
  e.cnpj,
  e.nome_empresa,
  e.nome_responsavel,
  e.email_responsavel,
  e.telefone,
  e.plano,
  e.ativo,
  e.data_criacao,
  e.data_cancelamento,
  e.limite_projetos,
  e.limite_funcionarios,
  e.limite_habilidades,
  (SELECT COUNT(*) FROM projetos p WHERE p.empresa_id = e.id) AS num_projetos,
  (SELECT COUNT(*) FROM funcionarios f WHERE f.empresa_id = e.id) AS num_funcionarios,
  (SELECT COUNT(*) FROM usuarios_empresa u WHERE u.empresa_id = e.id AND u.ativo = true) AS num_usuarios
FROM empresas e;

-- Ninguém lê direto (nem authenticated, nem anon) — só a Edge Function
-- via service_role, que bypassa GRANT/REVOKE mas documenta a intenção.
REVOKE ALL ON painel_operador_resumo FROM PUBLIC;
REVOKE ALL ON painel_operador_resumo FROM authenticated;
REVOKE ALL ON painel_operador_resumo FROM anon;

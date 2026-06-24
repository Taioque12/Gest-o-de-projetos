-- ============================================================
-- MIGRAÇÃO FASE 2: Row Level Security Multi-Tenant
-- Rodar DEPOIS de migracao-fase1-estrutura.sql
-- Projeto: uaooutzbxkkcyfuwijbi
-- Data: 2026-06-24
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. FUNÇÕES AUXILIARES
-- ─────────────────────────────────────────────────────────────

-- Retorna empresa_id do usuário autenticado
CREATE OR REPLACE FUNCTION get_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id
  FROM usuarios_empresa
  WHERE auth_user_id = auth.uid()
    AND ativo = true
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Retorna perfil do usuário autenticado na sua empresa
CREATE OR REPLACE FUNCTION get_meu_perfil()
RETURNS TEXT AS $$
  SELECT perfil
  FROM usuarios_empresa
  WHERE auth_user_id = auth.uid()
    AND ativo = true
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 2. REMOVER POLÍTICAS ANTIGAS (baseadas em get_my_perfil)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_projetos"    ON projetos;
DROP POLICY IF EXISTS "equipe_all_projetos"   ON projetos;
DROP POLICY IF EXISTS "cliente_own_projetos"  ON projetos;
DROP POLICY IF EXISTS "all_atualizacoes"      ON atualizacoes_semana;
DROP POLICY IF EXISTS "all_frentes"           ON frentes_servico;
DROP POLICY IF EXISTS "func_admin_all"        ON funcionarios;
DROP POLICY IF EXISTS "func_equipe_select"    ON funcionarios;
DROP POLICY IF EXISTS "prog_admin_all"        ON programacao_semanal;
DROP POLICY IF EXISTS "prog_equipe_all"       ON programacao_semanal;
DROP POLICY IF EXISTS "habilidades_leitura"   ON habilidades;
DROP POLICY IF EXISTS "habilidades_escrita"   ON habilidades;
DROP POLICY IF EXISTS "avaliacoes_leitura"    ON avaliacoes_habilidades;
DROP POLICY IF EXISTS "avaliacoes_escrita"    ON avaliacoes_habilidades;

-- ─────────────────────────────────────────────────────────────
-- 3. RLS: empresas
-- ─────────────────────────────────────────────────────────────
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_ver_propria"    ON empresas;
DROP POLICY IF EXISTS "empresas_admin_atualizar" ON empresas;

CREATE POLICY "empresas_ver_propria" ON empresas
  FOR SELECT TO authenticated
  USING (id = get_empresa_id());

CREATE POLICY "empresas_admin_atualizar" ON empresas
  FOR UPDATE TO authenticated
  USING (id = get_empresa_id() AND get_meu_perfil() = 'admin')
  WITH CHECK (id = get_empresa_id() AND get_meu_perfil() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 4. RLS: usuarios_empresa
-- ─────────────────────────────────────────────────────────────
ALTER TABLE usuarios_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ue_ver_colegas"       ON usuarios_empresa;
DROP POLICY IF EXISTS "ue_admin_gerenciar"   ON usuarios_empresa;

CREATE POLICY "ue_ver_colegas" ON usuarios_empresa
  FOR SELECT TO authenticated
  USING (empresa_id = get_empresa_id());

CREATE POLICY "ue_admin_gerenciar" ON usuarios_empresa
  FOR ALL TO authenticated
  USING (empresa_id = get_empresa_id() AND get_meu_perfil() = 'admin')
  WITH CHECK (empresa_id = get_empresa_id() AND get_meu_perfil() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 5. RLS: projetos
-- ─────────────────────────────────────────────────────────────
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projetos_select"  ON projetos;
DROP POLICY IF EXISTS "projetos_insert"  ON projetos;
DROP POLICY IF EXISTS "projetos_update"  ON projetos;
DROP POLICY IF EXISTS "projetos_delete"  ON projetos;

-- SELECT: admin e equipe veem todos da empresa; cliente vê só os liberados
CREATE POLICY "projetos_select" ON projetos
  FOR SELECT TO authenticated
  USING (
    empresa_id = get_empresa_id() AND (
      get_meu_perfil() IN ('admin', 'equipe')
      OR id IN (
        SELECT projeto_id FROM acessos_cliente
        WHERE empresa_id = get_empresa_id()
          AND usuario_id = (SELECT id FROM usuarios WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
      )
    )
  );

CREATE POLICY "projetos_insert" ON projetos
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_empresa_id() AND get_meu_perfil() IN ('admin', 'equipe'));

CREATE POLICY "projetos_update" ON projetos
  FOR UPDATE TO authenticated
  USING (empresa_id = get_empresa_id() AND get_meu_perfil() IN ('admin', 'equipe'))
  WITH CHECK (empresa_id = get_empresa_id());

CREATE POLICY "projetos_delete" ON projetos
  FOR DELETE TO authenticated
  USING (empresa_id = get_empresa_id() AND get_meu_perfil() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 6. RLS: atualizacoes_semana e frentes_servico (herdadas de projetos via FK)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE atualizacoes_semana ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atualiz_select" ON atualizacoes_semana;
DROP POLICY IF EXISTS "atualiz_insert" ON atualizacoes_semana;
DROP POLICY IF EXISTS "atualiz_update" ON atualizacoes_semana;
DROP POLICY IF EXISTS "atualiz_delete" ON atualizacoes_semana;

CREATE POLICY "atualiz_select" ON atualizacoes_semana
  FOR SELECT TO authenticated
  USING (projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id()));

CREATE POLICY "atualiz_insert" ON atualizacoes_semana
  FOR INSERT TO authenticated
  WITH CHECK (
    projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND get_meu_perfil() IN ('admin', 'equipe')
  );

CREATE POLICY "atualiz_update" ON atualizacoes_semana
  FOR UPDATE TO authenticated
  USING (projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND get_meu_perfil() IN ('admin', 'equipe'));

CREATE POLICY "atualiz_delete" ON atualizacoes_semana
  FOR DELETE TO authenticated
  USING (projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND get_meu_perfil() = 'admin');

ALTER TABLE frentes_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "frentes_select" ON frentes_servico;
DROP POLICY IF EXISTS "frentes_modify" ON frentes_servico;

CREATE POLICY "frentes_select" ON frentes_servico
  FOR SELECT TO authenticated
  USING (projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id()));

CREATE POLICY "frentes_modify" ON frentes_servico
  FOR ALL TO authenticated
  USING (projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND get_meu_perfil() IN ('admin', 'equipe'))
  WITH CHECK (projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND get_meu_perfil() IN ('admin', 'equipe'));

-- ─────────────────────────────────────────────────────────────
-- 7. RLS: funcionarios
-- ─────────────────────────────────────────────────────────────
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "func_select"  ON funcionarios;
DROP POLICY IF EXISTS "func_insert"  ON funcionarios;
DROP POLICY IF EXISTS "func_update"  ON funcionarios;
DROP POLICY IF EXISTS "func_delete"  ON funcionarios;

CREATE POLICY "func_select" ON funcionarios
  FOR SELECT TO authenticated
  USING (empresa_id = get_empresa_id());

CREATE POLICY "func_insert" ON funcionarios
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_empresa_id() AND get_meu_perfil() IN ('admin', 'equipe'));

CREATE POLICY "func_update" ON funcionarios
  FOR UPDATE TO authenticated
  USING (empresa_id = get_empresa_id() AND get_meu_perfil() IN ('admin', 'equipe'))
  WITH CHECK (empresa_id = get_empresa_id());

CREATE POLICY "func_delete" ON funcionarios
  FOR DELETE TO authenticated
  USING (empresa_id = get_empresa_id() AND get_meu_perfil() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 8. RLS: habilidades
-- ─────────────────────────────────────────────────────────────
ALTER TABLE habilidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hab_select" ON habilidades;
DROP POLICY IF EXISTS "hab_modify" ON habilidades;

CREATE POLICY "hab_select" ON habilidades
  FOR SELECT TO authenticated
  USING (empresa_id = get_empresa_id() AND ativo = true);

CREATE POLICY "hab_modify" ON habilidades
  FOR ALL TO authenticated
  USING (empresa_id = get_empresa_id() AND get_meu_perfil() = 'admin')
  WITH CHECK (empresa_id = get_empresa_id() AND get_meu_perfil() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 9. RLS: avaliacoes_habilidades (herda via funcionario_id)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE avaliacoes_habilidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aval_select"  ON avaliacoes_habilidades;
DROP POLICY IF EXISTS "aval_modify"  ON avaliacoes_habilidades;

CREATE POLICY "aval_select" ON avaliacoes_habilidades
  FOR SELECT TO authenticated
  USING (funcionario_id IN (SELECT id FROM funcionarios WHERE empresa_id = get_empresa_id()));

CREATE POLICY "aval_modify" ON avaliacoes_habilidades
  FOR ALL TO authenticated
  USING (funcionario_id IN (SELECT id FROM funcionarios WHERE empresa_id = get_empresa_id())
    AND get_meu_perfil() IN ('admin', 'equipe'))
  WITH CHECK (funcionario_id IN (SELECT id FROM funcionarios WHERE empresa_id = get_empresa_id()));

-- ─────────────────────────────────────────────────────────────
-- 10. RLS: programacao_semanal
-- ─────────────────────────────────────────────────────────────
ALTER TABLE programacao_semanal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prog_select"  ON programacao_semanal;
DROP POLICY IF EXISTS "prog_modify"  ON programacao_semanal;

CREATE POLICY "prog_select" ON programacao_semanal
  FOR SELECT TO authenticated
  USING (empresa_id = get_empresa_id());

CREATE POLICY "prog_modify" ON programacao_semanal
  FOR ALL TO authenticated
  USING (empresa_id = get_empresa_id() AND get_meu_perfil() IN ('admin', 'equipe'))
  WITH CHECK (empresa_id = get_empresa_id());

-- ─────────────────────────────────────────────────────────────
-- 11. RLS: efetivo_semana
-- ─────────────────────────────────────────────────────────────
ALTER TABLE efetivo_semana ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "efetivo_select" ON efetivo_semana;
DROP POLICY IF EXISTS "efetivo_modify" ON efetivo_semana;

CREATE POLICY "efetivo_select" ON efetivo_semana
  FOR SELECT TO authenticated
  USING (empresa_id = get_empresa_id());

CREATE POLICY "efetivo_modify" ON efetivo_semana
  FOR ALL TO authenticated
  USING (empresa_id = get_empresa_id() AND get_meu_perfil() IN ('admin', 'equipe'))
  WITH CHECK (empresa_id = get_empresa_id());

-- ─────────────────────────────────────────────────────────────
-- 12. RLS: uploads_xml
-- ─────────────────────────────────────────────────────────────
ALTER TABLE uploads_xml ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xml_select"  ON uploads_xml;
DROP POLICY IF EXISTS "xml_insert"  ON uploads_xml;
DROP POLICY IF EXISTS "xml_delete"  ON uploads_xml;

CREATE POLICY "xml_select" ON uploads_xml
  FOR SELECT TO authenticated
  USING (empresa_id = get_empresa_id());

CREATE POLICY "xml_insert" ON uploads_xml
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_empresa_id() AND get_meu_perfil() IN ('admin', 'equipe'));

CREATE POLICY "xml_delete" ON uploads_xml
  FOR DELETE TO authenticated
  USING (empresa_id = get_empresa_id() AND get_meu_perfil() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 13. RLS: acessos_cliente
-- ─────────────────────────────────────────────────────────────
ALTER TABLE acessos_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acesso_select"  ON acessos_cliente;
DROP POLICY IF EXISTS "acesso_modify"  ON acessos_cliente;

CREATE POLICY "acesso_select" ON acessos_cliente
  FOR SELECT TO authenticated
  USING (empresa_id = get_empresa_id());

CREATE POLICY "acesso_modify" ON acessos_cliente
  FOR ALL TO authenticated
  USING (empresa_id = get_empresa_id() AND get_meu_perfil() = 'admin')
  WITH CHECK (empresa_id = get_empresa_id() AND get_meu_perfil() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 14. RLS: usuarios (tabela legado — leitura apenas)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_select" ON usuarios;

CREATE POLICY "usuarios_select" ON usuarios
  FOR SELECT TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 15. VIEW de monitoramento (opcional)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW uso_por_empresa AS
SELECT
  e.id,
  e.nome_empresa,
  e.plano,
  (SELECT COUNT(*) FROM projetos     WHERE empresa_id = e.id) AS num_projetos,
  (SELECT COUNT(*) FROM funcionarios WHERE empresa_id = e.id) AS num_funcionarios,
  (SELECT COUNT(*) FROM usuarios_empresa WHERE empresa_id = e.id) AS num_usuarios
FROM empresas e;

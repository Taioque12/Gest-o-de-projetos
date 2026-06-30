-- ============================================================
-- MIGRAÇÃO FASE 11: Restringe 'equipe' aos projetos onde está alocado
-- Rodar DEPOIS de migracao-fase9b-remove-usuarios-legado.sql
-- Projeto: ndplkjgcogsmxvsyfunn (DEV)
-- Data: 2026-06-30
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Liga funcionario (RH) ao login (usuarios_empresa)
-- Admin associa na tela de Equipes. Opcional/nullable: funcionário
-- sem login (ex: mão de obra terceirizada) continua existindo normal.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE funcionarios
  ADD COLUMN IF NOT EXISTS usuario_empresa_id UUID REFERENCES usuarios_empresa(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_func_usuario_empresa ON funcionarios(usuario_empresa_id) WHERE usuario_empresa_id IS NOT NULL;

-- Função: retorna o(s) id(s) de funcionário ligados ao usuário logado
CREATE OR REPLACE FUNCTION meu_funcionario_id()
RETURNS UUID AS $$
  SELECT f.id
  FROM funcionarios f
  JOIN usuarios_empresa ue ON ue.id = f.usuario_empresa_id
  WHERE ue.auth_user_id = auth.uid() AND ue.ativo = true
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 2. projetos: refaz SELECT/UPDATE
-- admin: todos. equipe: só onde está alocado (programacao_semanal).
-- cliente: só liberados (acessos_cliente) — corrige bug: policy
-- antiga referenciava tabela 'usuarios' já removida na fase 9b.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "projetos_select" ON projetos;
DROP POLICY IF EXISTS "projetos_update" ON projetos;

CREATE POLICY "projetos_select" ON projetos
  FOR SELECT TO authenticated
  USING (
    empresa_id = get_empresa_id() AND (
      get_meu_perfil() = 'admin'
      OR (
        get_meu_perfil() = 'equipe'
        AND id IN (SELECT projeto_id FROM programacao_semanal WHERE funcionario_id = meu_funcionario_id())
      )
      OR id IN (
        SELECT projeto_id FROM acessos_cliente
        WHERE empresa_id = get_empresa_id() AND usuario_id = auth.uid()
      )
    )
  );

CREATE POLICY "projetos_update" ON projetos
  FOR UPDATE TO authenticated
  USING (
    empresa_id = get_empresa_id() AND (
      get_meu_perfil() = 'admin'
      OR (
        get_meu_perfil() = 'equipe'
        AND id IN (SELECT projeto_id FROM programacao_semanal WHERE funcionario_id = meu_funcionario_id())
      )
    )
  )
  WITH CHECK (empresa_id = get_empresa_id());

-- ─────────────────────────────────────────────────────────────
-- 3. Helper: projeto está liberado pro usuário logado?
-- admin: sempre. equipe: só se alocado via programacao_semanal.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION projeto_permitido(p_projeto_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    get_meu_perfil() = 'admin'
    OR (
      get_meu_perfil() = 'equipe'
      AND EXISTS (
        SELECT 1 FROM programacao_semanal
        WHERE projeto_id = p_projeto_id AND funcionario_id = meu_funcionario_id()
      )
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 4. atualizacoes_semana — restringe equipe ao projeto alocado
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "atualiz_select" ON atualizacoes_semana;
DROP POLICY IF EXISTS "atualiz_insert" ON atualizacoes_semana;
DROP POLICY IF EXISTS "atualiz_update" ON atualizacoes_semana;
DROP POLICY IF EXISTS "atualiz_delete" ON atualizacoes_semana;

CREATE POLICY "atualiz_select" ON atualizacoes_semana
  FOR SELECT TO authenticated
  USING (
    projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND projeto_permitido(projeto_id)
  );

CREATE POLICY "atualiz_insert" ON atualizacoes_semana
  FOR INSERT TO authenticated
  WITH CHECK (
    projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND projeto_permitido(projeto_id)
  );

CREATE POLICY "atualiz_update" ON atualizacoes_semana
  FOR UPDATE TO authenticated
  USING (
    projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND projeto_permitido(projeto_id)
  );

CREATE POLICY "atualiz_delete" ON atualizacoes_semana
  FOR DELETE TO authenticated
  USING (
    projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND get_meu_perfil() = 'admin'
  );

-- ─────────────────────────────────────────────────────────────
-- 5. frentes_servico — restringe equipe ao projeto alocado
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "frentes_select" ON frentes_servico;
DROP POLICY IF EXISTS "frentes_modify" ON frentes_servico;

CREATE POLICY "frentes_select" ON frentes_servico
  FOR SELECT TO authenticated
  USING (
    projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND projeto_permitido(projeto_id)
  );

CREATE POLICY "frentes_modify" ON frentes_servico
  FOR ALL TO authenticated
  USING (
    projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND projeto_permitido(projeto_id)
  )
  WITH CHECK (
    projeto_id IN (SELECT id FROM projetos WHERE empresa_id = get_empresa_id())
    AND projeto_permitido(projeto_id)
  );

-- ─────────────────────────────────────────────────────────────
-- 6. efetivo_semana — restringe equipe ao projeto alocado
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "efetivo_select" ON efetivo_semana;
DROP POLICY IF EXISTS "efetivo_modify" ON efetivo_semana;

CREATE POLICY "efetivo_select" ON efetivo_semana
  FOR SELECT TO authenticated
  USING (
    empresa_id = get_empresa_id()
    AND projeto_permitido(projeto_id)
  );

CREATE POLICY "efetivo_modify" ON efetivo_semana
  FOR ALL TO authenticated
  USING (
    empresa_id = get_empresa_id()
    AND projeto_permitido(projeto_id)
  )
  WITH CHECK (
    empresa_id = get_empresa_id()
    AND projeto_permitido(projeto_id)
  );

-- NOTA: uploads_xml ficou de fora — projeto_id é nullable lá e o fluxo de
-- import (UploadXML.jsx) nem preenche essa coluna hoje (é só log do upload,
-- não dado do projeto em si). Restringir exigiria mudar a lógica de upload.

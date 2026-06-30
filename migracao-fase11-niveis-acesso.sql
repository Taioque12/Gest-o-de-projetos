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

-- NOTA: atualizacoes_semana, frentes_servico, efetivo_semana e uploads_xml
-- ainda usam "equipe vê/edita tudo da empresa" (não restrito por projeto).
-- O frontend só lista esses dados a partir da tela de projeto, então na
-- prática a UI já não expõe projetos não-alocados — mas para reforço total
-- de RLS, aplicar o mesmo padrão de meu_funcionario_id() nessas tabelas
-- depois, se necessário.

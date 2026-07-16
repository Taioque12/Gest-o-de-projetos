-- Habilitar Row Level Security para tabelas sensíveis
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atualizacoes_semana ENABLE ROW LEVEL SECURITY;
ALTER TABLE acessos_cliente ENABLE ROW LEVEL SECURITY;

-- Policy 1: Administradores e Equipe interna podem ver e editar tudo
CREATE POLICY "Admins_Equipe_Projetos" ON projetos
  FOR ALL
  USING (
    auth.jwt() ->> 'perfil' = 'admin' OR 
    auth.jwt() ->> 'perfil' = 'equipe'
  );

-- Policy 2: Clientes só veem projetos que têm permissão em acessos_cliente
CREATE POLICY "Clientes_Select_Projetos" ON projetos
  FOR SELECT
  USING (
    auth.jwt() ->> 'perfil' = 'cliente' AND
    id IN (
      SELECT projeto_id FROM acessos_cliente WHERE usuario_id = auth.uid()
    )
  );

-- Policy 3: Atualizações Semanais (Admins e Equipe)
CREATE POLICY "Admins_Equipe_Atualizacoes" ON atualizacoes_semana
  FOR ALL
  USING (
    auth.jwt() ->> 'perfil' = 'admin' OR 
    auth.jwt() ->> 'perfil' = 'equipe'
  );

-- Policy 4: Atualizações Semanais (Clientes só podem LER)
CREATE POLICY "Clientes_Select_Atualizacoes" ON atualizacoes_semana
  FOR SELECT
  USING (
    auth.jwt() ->> 'perfil' = 'cliente' AND
    projeto_id IN (
      SELECT projeto_id FROM acessos_cliente WHERE usuario_id = auth.uid()
    )
  );

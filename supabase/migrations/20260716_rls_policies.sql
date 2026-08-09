-- Habilitar Row Level Security para tabelas sensíveis
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atualizacoes_semana ENABLE ROW LEVEL SECURITY;
ALTER TABLE acessos_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins_Equipe_Projetos" ON public.projetos;
DROP POLICY IF EXISTS "Clientes_Select_Projetos" ON public.projetos;
DROP POLICY IF EXISTS "Admins_Equipe_Atualizacoes" ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "Clientes_Select_Atualizacoes" ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "acessos_select" ON public.acessos_cliente;
DROP POLICY IF EXISTS "acessos_write_admin" ON public.acessos_cliente;

-- O cliente precisa conseguir consultar o próprio vínculo para que as
-- policies por projeto funcionem; somente admin gerencia esses vínculos.
CREATE POLICY "acessos_select" ON public.acessos_cliente
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.get_my_perfil() = 'admin');

CREATE POLICY "acessos_write_admin" ON public.acessos_cliente
  FOR ALL TO authenticated
  USING (public.get_my_perfil() = 'admin')
  WITH CHECK (public.get_my_perfil() = 'admin');

-- Policy 1: Administradores e Equipe interna podem ver e editar tudo
CREATE POLICY "Admins_Equipe_Projetos" ON public.projetos
  FOR ALL TO authenticated
  USING (public.get_my_perfil() IN ('admin', 'equipe'))
  WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'));

-- Policy 2: Clientes só veem projetos que têm permissão em acessos_cliente
CREATE POLICY "Clientes_Select_Projetos" ON public.projetos
  FOR SELECT TO authenticated
  USING (
    public.get_my_perfil() = 'cliente' AND
    id IN (
      SELECT projeto_id FROM public.acessos_cliente WHERE usuario_id = auth.uid()
    )
  );

-- Policy 3: Atualizações Semanais (Admins e Equipe)
CREATE POLICY "Admins_Equipe_Atualizacoes" ON public.atualizacoes_semana
  FOR ALL TO authenticated
  USING (public.get_my_perfil() IN ('admin', 'equipe'))
  WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'));

-- Policy 4: Atualizações Semanais (Clientes só podem LER)
CREATE POLICY "Clientes_Select_Atualizacoes" ON public.atualizacoes_semana
  FOR SELECT TO authenticated
  USING (
    public.get_my_perfil() = 'cliente' AND
    projeto_id IN (
      SELECT projeto_id FROM public.acessos_cliente WHERE usuario_id = auth.uid()
    )
  );

-- ================================================================
-- RLS — Gestão de Projetos
-- Rodar no Supabase SQL Editor: https://supabase.com/dashboard/project/<PROJECT_REF>/sql
-- ================================================================

-- 1. Função helper SECURITY DEFINER
--    Lê o perfil do usuário logado sem cair em recursão de RLS
CREATE OR REPLACE FUNCTION public.get_my_perfil()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT perfil FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Habilitar RLS em todas as tabelas
ALTER TABLE public.usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atualizacoes_semana ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frentes_servico     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_cliente     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads_xml         ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- USUARIOS — cada um vê e edita só o próprio registro
-- ================================================================
DROP POLICY IF EXISTS "usuarios_select_proprio" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_proprio" ON public.usuarios;

CREATE POLICY "usuarios_select_proprio" ON public.usuarios
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "usuarios_update_proprio" ON public.usuarios
  FOR UPDATE USING (id = auth.uid());

-- ================================================================
-- PROJETOS
-- ================================================================
DROP POLICY IF EXISTS "projetos_select_staff"   ON public.projetos;
DROP POLICY IF EXISTS "projetos_select_cliente" ON public.projetos;
DROP POLICY IF EXISTS "projetos_insert_admin"   ON public.projetos;
DROP POLICY IF EXISTS "projetos_update_admin"   ON public.projetos;
DROP POLICY IF EXISTS "projetos_delete_admin"   ON public.projetos;

-- admin e equipe veem todos os projetos
CREATE POLICY "projetos_select_staff" ON public.projetos
  FOR SELECT USING (get_my_perfil() IN ('admin', 'equipe'));

-- cliente vê só projetos liberados em acessos_cliente
CREATE POLICY "projetos_select_cliente" ON public.projetos
  FOR SELECT USING (
    get_my_perfil() = 'cliente'
    AND id IN (
      SELECT projeto_id FROM public.acessos_cliente
      WHERE usuario_id = auth.uid()
    )
  );

-- só admin cria / edita / exclui projetos
CREATE POLICY "projetos_insert_admin" ON public.projetos
  FOR INSERT WITH CHECK (get_my_perfil() = 'admin');

CREATE POLICY "projetos_update_admin" ON public.projetos
  FOR UPDATE USING (get_my_perfil() = 'admin');

CREATE POLICY "projetos_delete_admin" ON public.projetos
  FOR DELETE USING (get_my_perfil() = 'admin');

-- ================================================================
-- ATUALIZACOES_SEMANA
-- ================================================================
DROP POLICY IF EXISTS "ats_select_staff"   ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "ats_select_cliente" ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "ats_write_staff"    ON public.atualizacoes_semana;

CREATE POLICY "ats_select_staff" ON public.atualizacoes_semana
  FOR SELECT USING (get_my_perfil() IN ('admin', 'equipe'));

CREATE POLICY "ats_select_cliente" ON public.atualizacoes_semana
  FOR SELECT USING (
    get_my_perfil() = 'cliente'
    AND projeto_id IN (
      SELECT projeto_id FROM public.acessos_cliente WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "ats_write_staff" ON public.atualizacoes_semana
  FOR ALL USING (get_my_perfil() IN ('admin', 'equipe'));

-- ================================================================
-- FRENTES_SERVICO
-- ================================================================
DROP POLICY IF EXISTS "frentes_select_staff"   ON public.frentes_servico;
DROP POLICY IF EXISTS "frentes_select_cliente" ON public.frentes_servico;
DROP POLICY IF EXISTS "frentes_write_staff"    ON public.frentes_servico;

CREATE POLICY "frentes_select_staff" ON public.frentes_servico
  FOR SELECT USING (get_my_perfil() IN ('admin', 'equipe'));

CREATE POLICY "frentes_select_cliente" ON public.frentes_servico
  FOR SELECT USING (
    get_my_perfil() = 'cliente'
    AND projeto_id IN (
      SELECT projeto_id FROM public.acessos_cliente WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "frentes_write_staff" ON public.frentes_servico
  FOR ALL USING (get_my_perfil() IN ('admin', 'equipe'));

-- ================================================================
-- EFETIVO_SEMANA (histograma de mão de obra)
-- ================================================================
DROP POLICY IF EXISTS "efetivo_select_staff"   ON public.efetivo_semana;
DROP POLICY IF EXISTS "efetivo_select_cliente" ON public.efetivo_semana;
DROP POLICY IF EXISTS "efetivo_write_staff"    ON public.efetivo_semana;

ALTER TABLE public.efetivo_semana ENABLE ROW LEVEL SECURITY;

CREATE POLICY "efetivo_select_staff" ON public.efetivo_semana
  FOR SELECT USING (get_my_perfil() IN ('admin', 'equipe'));

CREATE POLICY "efetivo_select_cliente" ON public.efetivo_semana
  FOR SELECT USING (
    get_my_perfil() = 'cliente'
    AND projeto_id IN (
      SELECT projeto_id FROM public.acessos_cliente WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "efetivo_write_staff" ON public.efetivo_semana
  FOR ALL USING (get_my_perfil() IN ('admin', 'equipe'));

-- ================================================================
-- ACESSOS_CLIENTE
-- ================================================================
DROP POLICY IF EXISTS "acessos_select" ON public.acessos_cliente;
DROP POLICY IF EXISTS "acessos_write_admin" ON public.acessos_cliente;

CREATE POLICY "acessos_select" ON public.acessos_cliente
  FOR SELECT USING (
    usuario_id = auth.uid()
    OR get_my_perfil() = 'admin'
  );

CREATE POLICY "acessos_write_admin" ON public.acessos_cliente
  FOR ALL USING (get_my_perfil() = 'admin');

-- ================================================================
-- UPLOADS_XML
-- ================================================================
DROP POLICY IF EXISTS "uploads_staff" ON public.uploads_xml;

CREATE POLICY "uploads_staff" ON public.uploads_xml
  FOR ALL USING (get_my_perfil() IN ('admin', 'equipe'));

-- FUNCIONARIOS: adicionar quando a tabela existir no banco
-- ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "func_staff" ON public.funcionarios
--   FOR ALL USING (get_my_perfil() IN ('admin', 'equipe'));

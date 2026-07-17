-- ═══════════════════════════════════════════════════════════
-- MIGRAÇÃO: Correções de segurança e RLS (auditoria 2026-07-17)
-- Execute no SQL Editor do Supabase, na ordem em que aparece.
-- ═══════════════════════════════════════════════════════════

-- 1. CRITICAL — handle_new_user() escalava privilégio via raw_user_meta_data
--    Signup público (anon key) definia perfil='admin' livremente.
--    Perfil de novo usuário agora é sempre 'cliente'; admin/equipe só via
--    edge function admin-create-user (service role).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome, perfil)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome', 'Usuário'),
    'cliente'
  );
  RETURN new;
END;
$$;

-- 2. CRITICAL — policies legadas USING(true) em atualizacoes_semana/frentes_servico
--    nunca foram removidas; liberavam leitura para anon e quebravam isolamento
--    de cliente. supabase_rls.sql já recria as policies corretas por nome novo.
DROP POLICY IF EXISTS "all_atualizacoes" ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "all_frentes" ON public.frentes_servico;
DROP POLICY IF EXISTS "admin_all_projetos" ON public.projetos;
DROP POLICY IF EXISTS "equipe_all_projetos" ON public.projetos;
DROP POLICY IF EXISTS "cliente_own_projetos" ON public.projetos;

-- 3. HIGH — get_my_perfil() ignorava ativo=false; usuário desativado mantinha
--    acesso total em todas as policies baseadas nela.
CREATE OR REPLACE FUNCTION public.get_my_perfil()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT perfil FROM public.usuarios WHERE id = auth.uid() AND ativo = true LIMIT 1;
$$;

-- 4. HIGH — habilidades/avaliacoes_habilidades com USING(true) para
--    qualquer authenticated; cliente lia/editava avaliação de RH.
DROP POLICY IF EXISTS "habilidades_escrita" ON public.habilidades;
DROP POLICY IF EXISTS "habilidades_leitura" ON public.habilidades;
DROP POLICY IF EXISTS "avaliacoes_escrita" ON public.avaliacoes_habilidades;
DROP POLICY IF EXISTS "avaliacoes_leitura" ON public.avaliacoes_habilidades;

CREATE POLICY "habilidades_staff" ON public.habilidades
  FOR ALL TO authenticated
  USING (public.get_my_perfil() IN ('admin', 'equipe'))
  WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'));

CREATE POLICY "avaliacoes_staff" ON public.avaliacoes_habilidades
  FOR ALL TO authenticated
  USING (public.get_my_perfil() IN ('admin', 'equipe'))
  WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'));

-- 5. MEDIUM — usuarios_update_proprio sem WITH CHECK; usuário podia
--    alterar o próprio email fora do fluxo do Auth.
DROP POLICY IF EXISTS "usuarios_update_proprio" ON public.usuarios;
CREATE POLICY "usuarios_update_proprio" ON public.usuarios
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 6. MEDIUM — analise_ia_hist_cliente_select usava lookup por email
--    em vez de auth.uid(), divergindo do padrão e sujeito a dessincronia.
DROP POLICY IF EXISTS "analise_ia_hist_cliente_select" ON public.analise_ia_historico;
CREATE POLICY "analise_ia_hist_cliente_select" ON public.analise_ia_historico
  FOR SELECT USING (
    public.get_my_perfil() = 'cliente'
    AND projeto_id IN (SELECT projeto_id FROM public.acessos_cliente WHERE usuario_id = auth.uid())
  );

-- 7. Trigger de proteção contra mudança de email por não-admin
--    (protege_perfil/protege_ativo já existem em migracao-protecao-perfil.sql;
--    este cobre a coluna email que ficava sem guarda).
CREATE OR REPLACE FUNCTION public.protege_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF new.email IS DISTINCT FROM old.email AND public.get_my_perfil() <> 'admin' THEN
    new.email := old.email;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_protege_email ON public.usuarios;
CREATE TRIGGER trg_protege_email
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE PROCEDURE public.protege_email();

-- 8. MEDIUM — rate limit não-atômico (SELECT + UPDATE) permitia ultrapassar
--    o limite sob requisições concorrentes. RPCs abaixo fazem o check-and-
--    increment num único statement (upsert com condição), atômico por linha.
CREATE OR REPLACE FUNCTION public.incrementar_rate_limit_acao(
  p_user_id UUID, p_acao TEXT, p_janela_ms INTEGER, p_max INTEGER
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_chamadas INTEGER;
BEGIN
  INSERT INTO public.rate_limit_acoes (user_id, acao, janela_inicio, chamadas)
  VALUES (p_user_id, p_acao, now(), 1)
  ON CONFLICT (user_id, acao) DO UPDATE SET
    chamadas = CASE
      WHEN now() - rate_limit_acoes.janela_inicio > (p_janela_ms || ' milliseconds')::interval
        THEN 1
      ELSE rate_limit_acoes.chamadas + 1
    END,
    janela_inicio = CASE
      WHEN now() - rate_limit_acoes.janela_inicio > (p_janela_ms || ' milliseconds')::interval
        THEN now()
      ELSE rate_limit_acoes.janela_inicio
    END
  RETURNING chamadas INTO v_chamadas;

  RETURN v_chamadas <= p_max;
END;
$$;

-- 9. MEDIUM — checagem de "único admin" em admin-delete-user fazia SELECT
--    count() sem lock; duas remoções concorrentes podiam ambas passar e
--    zerar os admins. FOR UPDATE serializa as transações concorrentes.
CREATE OR REPLACE FUNCTION public.pode_remover_usuario(p_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_perfil TEXT;
  v_admins INTEGER;
BEGIN
  SELECT perfil INTO v_perfil FROM public.usuarios WHERE id = p_id;
  IF v_perfil IS DISTINCT FROM 'admin' THEN
    RETURN true;
  END IF;

  SELECT count(*) INTO v_admins FROM public.usuarios WHERE perfil = 'admin' FOR UPDATE;
  RETURN v_admins > 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.incrementar_rate_limit_ia(
  p_user_id UUID, p_janela_ms INTEGER, p_max INTEGER
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_chamadas INTEGER;
BEGIN
  INSERT INTO public.rate_limit_analise_ia (user_id, janela_inicio, chamadas)
  VALUES (p_user_id, now(), 1)
  ON CONFLICT (user_id) DO UPDATE SET
    chamadas = CASE
      WHEN now() - rate_limit_analise_ia.janela_inicio > (p_janela_ms || ' milliseconds')::interval
        THEN 1
      ELSE rate_limit_analise_ia.chamadas + 1
    END,
    janela_inicio = CASE
      WHEN now() - rate_limit_analise_ia.janela_inicio > (p_janela_ms || ' milliseconds')::interval
        THEN now()
      ELSE rate_limit_analise_ia.janela_inicio
    END
  RETURNING chamadas INTO v_chamadas;

  RETURN v_chamadas <= p_max;
END;
$$;

-- Security hardening for profile creation and project-scoped RLS.
-- Safe to run more than once: every policy is dropped before recreation.

-- Persistent fair queue for the Scrum Agent. NULL values are processed first;
-- after the first full pass, the oldest analysis timestamp is processed first.
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS scrum_analisado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_projetos_scrum_fila
  ON public.projetos (scrum_analisado_em ASC NULLS FIRST, id);

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

CREATE OR REPLACE FUNCTION public.get_my_perfil()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT perfil
  FROM public.usuarios
  WHERE id = auth.uid() AND ativo = true
  LIMIT 1;
$$;

-- Protect privilege-bearing columns even when a user may update their own
-- row. NULL profiles (missing or inactive users) are denied by default, while
-- trusted Edge Functions using service_role remain able to administer users.
CREATE OR REPLACE FUNCTION public.protege_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF new.perfil IS DISTINCT FROM old.perfil
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND public.get_my_perfil() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Sem permissão para alterar o perfil de usuário.';
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_protege_perfil ON public.usuarios;
CREATE TRIGGER trg_protege_perfil
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE PROCEDURE public.protege_perfil();

CREATE OR REPLACE FUNCTION public.protege_ativo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF new.ativo IS DISTINCT FROM old.ativo
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND public.get_my_perfil() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Sem permissão para alterar o status de ativação.';
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_protege_ativo ON public.usuarios;
CREATE TRIGGER trg_protege_ativo
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE PROCEDURE public.protege_ativo();

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atualizacoes_semana ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frentes_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acessos_select" ON public.acessos_cliente;
DROP POLICY IF EXISTS "acessos_write_admin" ON public.acessos_cliente;

CREATE POLICY "acessos_select" ON public.acessos_cliente
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.get_my_perfil() = 'admin');

CREATE POLICY "acessos_write_admin" ON public.acessos_cliente
  FOR ALL TO authenticated
  USING (public.get_my_perfil() = 'admin')
  WITH CHECK (public.get_my_perfil() = 'admin');

-- Policies created by the legacy 20260716 migration.
DROP POLICY IF EXISTS "Admins_Equipe_Projetos" ON public.projetos;
DROP POLICY IF EXISTS "Clientes_Select_Projetos" ON public.projetos;

CREATE POLICY "Admins_Equipe_Projetos" ON public.projetos
  FOR ALL TO authenticated
  USING (public.get_my_perfil() IN ('admin', 'equipe'))
  WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'));

CREATE POLICY "Clientes_Select_Projetos" ON public.projetos
  FOR SELECT TO authenticated
  USING (
    public.get_my_perfil() = 'cliente'
    AND id IN (
      SELECT projeto_id FROM public.acessos_cliente
      WHERE usuario_id = auth.uid()
    )
  );

-- Remove every known policy variant before creating one canonical set. RLS
-- policies are permissive by default and combine with OR, so an old
-- USING (true) policy would otherwise override all restrictive policies.
DROP POLICY IF EXISTS "all_atualizacoes" ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "staff_write_atualizacoes" ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "Admins_Equipe_Atualizacoes" ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "Clientes_Select_Atualizacoes" ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "ats_select_staff" ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "ats_select_cliente" ON public.atualizacoes_semana;
DROP POLICY IF EXISTS "ats_write_staff" ON public.atualizacoes_semana;

CREATE POLICY "ats_select_staff" ON public.atualizacoes_semana
  FOR SELECT TO authenticated
  USING (public.get_my_perfil() IN ('admin', 'equipe'));

CREATE POLICY "ats_select_cliente" ON public.atualizacoes_semana
  FOR SELECT TO authenticated
  USING (
    public.get_my_perfil() = 'cliente'
    AND projeto_id IN (
      SELECT projeto_id FROM public.acessos_cliente
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "ats_write_staff" ON public.atualizacoes_semana
  FOR ALL TO authenticated
  USING (public.get_my_perfil() IN ('admin', 'equipe'))
  WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'));

DROP POLICY IF EXISTS "all_frentes" ON public.frentes_servico;
DROP POLICY IF EXISTS "staff_write_frentes" ON public.frentes_servico;
DROP POLICY IF EXISTS "frentes_select_staff" ON public.frentes_servico;
DROP POLICY IF EXISTS "frentes_select_cliente" ON public.frentes_servico;
DROP POLICY IF EXISTS "frentes_write_staff" ON public.frentes_servico;

CREATE POLICY "frentes_select_staff" ON public.frentes_servico
  FOR SELECT TO authenticated
  USING (public.get_my_perfil() IN ('admin', 'equipe'));

CREATE POLICY "frentes_select_cliente" ON public.frentes_servico
  FOR SELECT TO authenticated
  USING (
    public.get_my_perfil() = 'cliente'
    AND projeto_id IN (
      SELECT projeto_id FROM public.acessos_cliente
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "frentes_write_staff" ON public.frentes_servico
  FOR ALL TO authenticated
  USING (public.get_my_perfil() IN ('admin', 'equipe'))
  WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'));

-- Optional modules are guarded so this migration also works in installations
-- where one or more feature migrations have not been applied.
DO $$
BEGIN
  IF to_regclass('public.habilidades') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.habilidades ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "habilidades_leitura" ON public.habilidades';
    EXECUTE 'DROP POLICY IF EXISTS "habilidades_escrita" ON public.habilidades';
    EXECUTE 'DROP POLICY IF EXISTS "habilidades_staff" ON public.habilidades';
    EXECUTE 'DROP POLICY IF EXISTS "habilidades_write_staff" ON public.habilidades';
    EXECUTE $policy$
      CREATE POLICY "habilidades_staff" ON public.habilidades
      FOR ALL TO authenticated
      USING (public.get_my_perfil() IN ('admin', 'equipe'))
      WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'))
    $policy$;
  END IF;

  IF to_regclass('public.avaliacoes_habilidades') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.avaliacoes_habilidades ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "avaliacoes_leitura" ON public.avaliacoes_habilidades';
    EXECUTE 'DROP POLICY IF EXISTS "avaliacoes_escrita" ON public.avaliacoes_habilidades';
    EXECUTE 'DROP POLICY IF EXISTS "avaliacoes_staff" ON public.avaliacoes_habilidades';
    EXECUTE 'DROP POLICY IF EXISTS "avaliacoes_write_staff" ON public.avaliacoes_habilidades';
    EXECUTE $policy$
      CREATE POLICY "avaliacoes_staff" ON public.avaliacoes_habilidades
      FOR ALL TO authenticated
      USING (public.get_my_perfil() IN ('admin', 'equipe'))
      WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'))
    $policy$;
  END IF;

  IF to_regclass('public.suprimentos') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.suprimentos ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Suprimentos select todos" ON public.suprimentos';
    EXECUTE 'DROP POLICY IF EXISTS "Suprimentos all admin/equipe" ON public.suprimentos';
    EXECUTE 'DROP POLICY IF EXISTS "Suprimentos select por projeto" ON public.suprimentos';
    EXECUTE 'DROP POLICY IF EXISTS "Suprimentos write staff" ON public.suprimentos';
    EXECUTE $policy$
      CREATE POLICY "Suprimentos select por projeto" ON public.suprimentos
      FOR SELECT TO authenticated
      USING (
        public.get_my_perfil() IN ('admin', 'equipe')
        OR (
          public.get_my_perfil() = 'cliente'
          AND projeto_id IN (
            SELECT projeto_id FROM public.acessos_cliente
            WHERE usuario_id = auth.uid()
          )
        )
      )
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Suprimentos write staff" ON public.suprimentos
      FOR ALL TO authenticated
      USING (public.get_my_perfil() IN ('admin', 'equipe'))
      WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'))
    $policy$;
  END IF;

  IF to_regclass('public.fvs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.fvs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "FVS select todos" ON public.fvs';
    EXECUTE 'DROP POLICY IF EXISTS "FVS all admin/equipe" ON public.fvs';
    EXECUTE 'DROP POLICY IF EXISTS "FVS select por projeto" ON public.fvs';
    EXECUTE 'DROP POLICY IF EXISTS "FVS write staff" ON public.fvs';
    EXECUTE $policy$
      CREATE POLICY "FVS select por projeto" ON public.fvs
      FOR SELECT TO authenticated
      USING (
        public.get_my_perfil() IN ('admin', 'equipe')
        OR (
          public.get_my_perfil() = 'cliente'
          AND projeto_id IN (
            SELECT projeto_id FROM public.acessos_cliente
            WHERE usuario_id = auth.uid()
          )
        )
      )
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "FVS write staff" ON public.fvs
      FOR ALL TO authenticated
      USING (public.get_my_perfil() IN ('admin', 'equipe'))
      WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'))
    $policy$;
  END IF;

  IF to_regclass('public.tarefas') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Acesso leitura tarefas para todos autenticados" ON public.tarefas';
    EXECUTE 'DROP POLICY IF EXISTS "Acesso leitura tarefas por projeto" ON public.tarefas';
    EXECUTE 'DROP POLICY IF EXISTS "Admin e Equipe podem inserir tarefas" ON public.tarefas';
    EXECUTE 'DROP POLICY IF EXISTS "Admin e Equipe podem atualizar tarefas" ON public.tarefas';
    EXECUTE 'DROP POLICY IF EXISTS "Admin e Equipe podem deletar tarefas" ON public.tarefas';
    EXECUTE $policy$
      CREATE POLICY "Acesso leitura tarefas por projeto" ON public.tarefas
      FOR SELECT TO authenticated
      USING (
        public.get_my_perfil() IN ('admin', 'equipe')
        OR (
          public.get_my_perfil() = 'cliente'
          AND projeto_id IN (
            SELECT projeto_id FROM public.acessos_cliente
            WHERE usuario_id = auth.uid()
          )
        )
      )
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admin e Equipe podem inserir tarefas" ON public.tarefas
      FOR INSERT TO authenticated
      WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admin e Equipe podem atualizar tarefas" ON public.tarefas
      FOR UPDATE TO authenticated
      USING (public.get_my_perfil() IN ('admin', 'equipe'))
      WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Admin e Equipe podem deletar tarefas" ON public.tarefas
      FOR DELETE TO authenticated
      USING (public.get_my_perfil() IN ('admin', 'equipe'))
    $policy$;
  END IF;
END;
$$;

-- AgentDB is optional. Harden it only when its feature migration has already
-- created the table, so this migration remains deployable in every install.
DO $migration$
BEGIN
  IF to_regclass('public.projetos_embeddings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.projetos_embeddings ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Usuários autenticados podem ler embeddings" ON public.projetos_embeddings';
    EXECUTE 'DROP POLICY IF EXISTS "Admins e equipe técnica podem inserir/atualizar embeddings" ON public.projetos_embeddings';
    EXECUTE 'DROP POLICY IF EXISTS "embeddings_select_por_projeto" ON public.projetos_embeddings';
    EXECUTE 'DROP POLICY IF EXISTS "embeddings_write_staff" ON public.projetos_embeddings';

    EXECUTE $policy$
      CREATE POLICY "embeddings_select_por_projeto" ON public.projetos_embeddings
      FOR SELECT TO authenticated
      USING (
        public.get_my_perfil() IN ('admin', 'equipe')
        OR (
          public.get_my_perfil() = 'cliente'
          AND EXISTS (
            SELECT 1
            FROM public.acessos_cliente ac
            WHERE ac.usuario_id = auth.uid()
              AND ac.projeto_id = projetos_embeddings.projeto_id
          )
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "embeddings_write_staff" ON public.projetos_embeddings
      FOR ALL TO authenticated
      USING (public.get_my_perfil() IN ('admin', 'equipe'))
      WITH CHECK (public.get_my_perfil() IN ('admin', 'equipe'))
    $policy$;

    -- Remove the legacy three-argument overload before introducing a fourth
    -- optional argument. Keeping both would make three-argument RPC calls
    -- ambiguous in PostgREST.
    EXECUTE 'DROP FUNCTION IF EXISTS public.match_projetos(vector, double precision, integer)';
    EXECUTE 'DROP FUNCTION IF EXISTS public.match_projetos(vector, double precision, integer, uuid)';
    EXECUTE $function$
      CREATE FUNCTION public.match_projetos(
        query_embedding vector(768),
        match_threshold double precision,
        match_count integer,
        filter_projeto_id uuid DEFAULT NULL
      )
      RETURNS TABLE (
        projeto_id uuid,
        conteudo_texto text,
        metadata jsonb,
        similaridade double precision
      )
      LANGUAGE sql
      STABLE
      SET search_path = public
      AS $body$
        SELECT
          pe.projeto_id,
          pe.conteudo_texto,
          pe.metadata,
          1 - (pe.embedding <=> query_embedding) AS similaridade
        FROM public.projetos_embeddings pe
        WHERE (filter_projeto_id IS NULL OR pe.projeto_id = filter_projeto_id)
          AND 1 - (pe.embedding <=> query_embedding) > match_threshold
        ORDER BY pe.embedding <=> query_embedding
        LIMIT match_count
      $body$
    $function$;

    EXECUTE 'REVOKE ALL ON FUNCTION public.match_projetos(vector, double precision, integer, uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.match_projetos(vector, double precision, integer, uuid) TO authenticated, service_role';
  END IF;
END;
$migration$;

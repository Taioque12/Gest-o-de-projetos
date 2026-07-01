-- Fase 12: bloqueio real de empresa suspensa
-- Rodar no projeto Supabase do saas-multitenant (DEV: ndplkjgcogsmxvsyfunn;
-- produção quando for a hora: uaooutzbxkkcyfuwijbi).
--
-- Bug corrigido: o painel do operador marcava `empresas.ativo = false` ao
-- suspender uma empresa, mas nada no sistema checava essa coluna — nem o
-- frontend (useAuth.js só filtrava usuarios_empresa.ativo, o vínculo da
-- pessoa) nem nenhuma RLS policy (só existia checagem de `ativo` em
-- `habilidades`, que é outra coisa). Resultado: suspender uma empresa não
-- bloqueava nada, o cliente continuava usando o sistema normalmente.
--
-- Fix: get_empresa_id() e get_meu_perfil() são os pontos únicos usados por
-- praticamente toda RLS policy do sistema (padrão documentado no README).
-- Adicionando o JOIN com empresas e o filtro e.ativo = true aqui, toda
-- tabela protegida por RLS passa a barrar automaticamente uma empresa
-- suspensa, sem precisar tocar em cada policy individualmente.

CREATE OR REPLACE FUNCTION public.get_empresa_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT ue.empresa_id
  FROM usuarios_empresa ue
  JOIN empresas e ON e.id = ue.empresa_id
  WHERE ue.auth_user_id = auth.uid() AND ue.ativo = true AND e.ativo = true
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_meu_perfil()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT ue.perfil
  FROM usuarios_empresa ue
  JOIN empresas e ON e.id = ue.empresa_id
  WHERE ue.auth_user_id = auth.uid() AND ue.ativo = true AND e.ativo = true
  LIMIT 1;
$function$;

-- Efeito colateral do fix acima: as policies de SELECT em usuarios_empresa
-- (ue_ver_colegas) e empresas (empresas_ver_propria) também dependem de
-- get_empresa_id(), que agora vira NULL quando a empresa está suspensa.
-- Sem as policies abaixo, o próprio usuário fica impedido de ler seu
-- vínculo/empresa — e o frontend cai na tela de onboarding em vez de
-- mostrar "conta suspensa" (bug encontrado durante o teste manual desta
-- migração). Estas policies adicionais (permissivas, somem OR com as
-- existentes) liberam a leitura da PRÓPRIA linha independente do status
-- da empresa — não abrem acesso a dado de outras empresas nem de outras
-- tabelas de negócio.
CREATE POLICY ue_ver_propria_linha ON usuarios_empresa
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY empresas_ver_propria_mesmo_suspensa ON empresas
  FOR SELECT
  USING (id IN (SELECT empresa_id FROM usuarios_empresa WHERE auth_user_id = auth.uid()));

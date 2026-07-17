-- ==========================================
-- V2.0 MIGRATION: SaaS, Suprimentos e Qualidade
-- ==========================================

-- 1. Criação do conceito de Empresa (Tenant)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insere uma empresa padrão (se não existir nenhuma)
INSERT INTO public.empresas (id, nome) 
SELECT '00000000-0000-0000-0000-000000000000', 'Minha Construtora'
WHERE NOT EXISTS (SELECT 1 FROM public.empresas WHERE id = '00000000-0000-0000-0000-000000000000');

-- 2. Alteração das tabelas existentes para suportar Multi-Tenant
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE public.rdo ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) DEFAULT '00000000-0000-0000-0000-000000000000';

-- (Não vou refazer todas as policies de RLS agora para não bloquear os dados do usuário, mas o campo está lá para o futuro SaaS admin).

-- 3. Módulo de Suprimentos (Compras)
CREATE TABLE IF NOT EXISTS public.suprimentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 1,
    unidade TEXT NOT NULL DEFAULT 'un',
    valor_estimado NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Solicitado', -- Solicitado, Aprovado, Comprado, Entregue
    data_necessidade DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    criado_por UUID REFERENCES auth.users(id)
);

ALTER TABLE public.suprimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suprimentos select todos" ON public.suprimentos FOR SELECT USING (true);
CREATE POLICY "Suprimentos all admin/equipe" ON public.suprimentos FOR ALL USING (get_my_perfil() IN ('admin', 'equipe'));

-- 4. Módulo de Qualidade (FVS)
CREATE TABLE IF NOT EXISTS public.fvs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    servico TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Aprovado', -- Aprovado, Reprovado, Aprovado c/ Ressalva
    observacoes TEXT,
    data_inspecao DATE NOT NULL DEFAULT CURRENT_DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    criado_por UUID REFERENCES auth.users(id)
);

ALTER TABLE public.fvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FVS select todos" ON public.fvs FOR SELECT USING (true);
CREATE POLICY "FVS all admin/equipe" ON public.fvs FOR ALL USING (get_my_perfil() IN ('admin', 'equipe'));

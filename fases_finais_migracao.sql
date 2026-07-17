-- 1. Fase 11: Financeiro
-- Adicionamos colunas de orçado (planejado) e realizado financeiro
ALTER TABLE public.projetos
ADD COLUMN IF NOT EXISTS orcamento NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC DEFAULT 0;

-- 2. Fase 10: RDO (Relatório Diário de Obra)
CREATE TABLE IF NOT EXISTS public.rdo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
    data_rdo DATE NOT NULL DEFAULT CURRENT_DATE,
    clima TEXT NOT NULL DEFAULT 'Bom', -- Bom, Chuva, Impraticável
    ocorrencias TEXT,
    efetivo_presente INTEGER DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    criado_por UUID REFERENCES auth.users(id)
);

-- RLS da tabela RDO
ALTER TABLE public.rdo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RDO leitura para autenticados" ON public.rdo
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "RDO escrita para admin e equipe" ON public.rdo
    FOR ALL USING (
        get_my_perfil() IN ('admin', 'equipe')
    );

-- 3. Fase 12: Notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- quem recebe (se nulo, é global pra admin)
    tipo TEXT NOT NULL, -- 'risco', 'atraso', 'info'
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS da tabela notificações
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notificacoes leitura para dono ou admin" ON public.notificacoes
    FOR SELECT USING (
        auth.uid() = user_id OR get_my_perfil() = 'admin' OR user_id IS NULL
    );

CREATE POLICY "Notificacoes update (marcar lida)" ON public.notificacoes
    FOR UPDATE USING (
        auth.uid() = user_id OR get_my_perfil() = 'admin' OR user_id IS NULL
    );

CREATE POLICY "Notificacoes insercao via systema/functions" ON public.notificacoes
    FOR INSERT WITH CHECK (
        get_my_perfil() = 'admin'
    );

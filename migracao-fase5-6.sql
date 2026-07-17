-- Migration: Fases 5 e 6 (Risk Score & Kanban)

-- 1. Risk Score na tabela projetos
ALTER TABLE projetos 
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'BAIXO';

-- 2. Tabela de Tarefas (Kanban)
CREATE TABLE IF NOT EXISTS tarefas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id uuid REFERENCES projetos(id) ON DELETE CASCADE NOT NULL,
    titulo text NOT NULL,
    descricao text,
    status text DEFAULT 'A Fazer' CHECK (status IN ('A Fazer', 'Fazendo', 'Feito')),
    responsavel text,
    ordem integer DEFAULT 0,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_tarefas_projeto_id ON tarefas(projeto_id);

-- 4. Habilitar RLS na tabela tarefas
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS (Tarefas)
-- Administradores e Equipe podem fazer tudo. Outros (ex: fiscal/cliente) podem apenas ler.

CREATE POLICY "Acesso leitura tarefas para todos autenticados" 
ON tarefas FOR SELECT USING (true);

CREATE POLICY "Admin e Equipe podem inserir tarefas" 
ON tarefas FOR INSERT 
WITH CHECK (get_my_perfil() IN ('admin', 'equipe'));

CREATE POLICY "Admin e Equipe podem atualizar tarefas" 
ON tarefas FOR UPDATE 
USING (get_my_perfil() IN ('admin', 'equipe')) 
WITH CHECK (get_my_perfil() IN ('admin', 'equipe'));

CREATE POLICY "Admin e Equipe podem deletar tarefas" 
ON tarefas FOR DELETE 
USING (get_my_perfil() IN ('admin', 'equipe'));

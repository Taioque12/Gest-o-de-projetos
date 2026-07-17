-- ==========================================
-- V4.0 - Módulo de Segurança do Trabalho (SST)
-- ==========================================

-- Tabela de Diálogo Diário de Segurança (DDS)
CREATE TABLE public.sst_dds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE CASCADE,
  data_dds date NOT NULL DEFAULT CURRENT_DATE,
  tema varchar(255) NOT NULL,
  tecnico_responsavel varchar(255) NOT NULL,
  participantes integer NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sst_dds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DDS leitura para admin, equipe e clientes" ON public.sst_dds
  FOR SELECT USING (
    get_my_perfil() IN ('admin', 'equipe', 'cliente', 'empreiteiro')
  );

CREATE POLICY "DDS edicao apenas admin e equipe" ON public.sst_dds
  FOR ALL USING (
    get_my_perfil() IN ('admin', 'equipe')
  );

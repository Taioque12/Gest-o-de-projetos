-- ============================================================
-- MIGRAÇÃO: buckets do Storage com limite de tamanho
-- Rodar no SQL Editor do Supabase (DEV: ndplkjgcogsmxvsyfunn)
--
-- Cria (ou ajusta, se já existir manualmente) os buckets usados pelo
-- app com file_size_limit — sem isso, qualquer usuário autenticado
-- pode subir arquivo de qualquer tamanho e estourar a cota do projeto.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('anexos', 'anexos', true, 20971520, NULL) -- 20MB
ON CONFLICT (id) DO UPDATE SET file_size_limit = 20971520;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('funcionarios', 'funcionarios', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']) -- 5MB, só foto
ON CONFLICT (id) DO UPDATE SET file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

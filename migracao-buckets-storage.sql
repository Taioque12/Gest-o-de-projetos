-- ============================================================
-- MIGRAÇÃO: limite de tamanho nos buckets do Storage
-- Rodar no SQL Editor do Supabase (projeto <PROJECT_REF>)
--
-- Os buckets já existem (criados manualmente no painel) — esta
-- migration só ADICIONA file_size_limit, sem afetar arquivos já
-- enviados. Sem isso, qualquer usuário autenticado pode subir
-- arquivo de qualquer tamanho e estourar a cota do projeto.
-- ============================================================

UPDATE storage.buckets SET file_size_limit = 20971520 WHERE id = 'anexos'; -- 20MB
UPDATE storage.buckets SET file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'] WHERE id = 'funcionarios'; -- 5MB, só foto

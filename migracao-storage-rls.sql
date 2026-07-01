-- ============================================================
-- MIGRAÇÃO: RLS no Storage e na tabela anexos
-- Rodar no SQL Editor do Supabase (projeto uaooutzbxkkcyfuwijbi)
--
-- Antes desta migration o bucket 'anexos' era público: qualquer
-- pessoa com a URL baixava o arquivo, e qualquer usuário logado
-- podia listar/ler anexos de qualquer projeto — inclusive um
-- cliente vendo anexos de projeto de outro cliente.
--
-- O que muda:
--   1. Bucket 'anexos' vira privado (download só via signed URL)
--   2. RLS na tabela public.anexos (estava sem policies)
--   3. Policies em storage.objects validando acesso por projeto
--      via acessos_cliente (paths são {projeto_id}/arquivo)
--   4. Bucket 'funcionarios' segue público (fotos), mas escrita
--      restrita a admin/equipe
--
-- ATENÇÃO: o frontend precisa do deploy junto — useAnexos.js
-- passa a gerar signed URLs em vez de usar a URL pública salva.
-- ============================================================

-- 1. Bucket anexos privado
update storage.buckets set public = false where id = 'anexos';

-- 2. RLS na tabela anexos
alter table public.anexos enable row level security;

drop policy if exists "anexos_select_staff"   on public.anexos;
drop policy if exists "anexos_select_cliente" on public.anexos;
drop policy if exists "anexos_write_staff"    on public.anexos;

create policy "anexos_select_staff" on public.anexos
  for select using (get_my_perfil() in ('admin', 'equipe'));

create policy "anexos_select_cliente" on public.anexos
  for select using (
    get_my_perfil() = 'cliente'
    and projeto_id in (
      select projeto_id from public.acessos_cliente
      where usuario_id = auth.uid()
    )
  );

create policy "anexos_write_staff" on public.anexos
  for all using (get_my_perfil() in ('admin', 'equipe'));

-- 3. Policies no storage.objects — bucket anexos
--    Comparação em texto (sem cast p/ uuid) pra não quebrar em
--    paths antigos que não comecem com projeto_id.
drop policy if exists "storage_anexos_select" on storage.objects;
drop policy if exists "storage_anexos_insert" on storage.objects;
drop policy if exists "storage_anexos_update" on storage.objects;
drop policy if exists "storage_anexos_delete" on storage.objects;

create policy "storage_anexos_select" on storage.objects
  for select to authenticated using (
    bucket_id = 'anexos'
    and (
      public.get_my_perfil() in ('admin', 'equipe')
      or (
        public.get_my_perfil() = 'cliente'
        and split_part(name, '/', 1) in (
          select projeto_id::text from public.acessos_cliente
          where usuario_id = auth.uid()
        )
      )
    )
  );

create policy "storage_anexos_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'anexos'
    and public.get_my_perfil() in ('admin', 'equipe')
  );

create policy "storage_anexos_update" on storage.objects
  for update to authenticated using (
    bucket_id = 'anexos'
    and public.get_my_perfil() in ('admin', 'equipe')
  );

create policy "storage_anexos_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'anexos'
    and public.get_my_perfil() in ('admin', 'equipe')
  );

-- 4. Bucket funcionarios — leitura pública (fotos exibidas na UI),
--    escrita/exclusão só para admin/equipe
drop policy if exists "storage_func_insert" on storage.objects;
drop policy if exists "storage_func_update" on storage.objects;
drop policy if exists "storage_func_delete" on storage.objects;

create policy "storage_func_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'funcionarios'
    and public.get_my_perfil() in ('admin', 'equipe')
  );

create policy "storage_func_update" on storage.objects
  for update to authenticated using (
    bucket_id = 'funcionarios'
    and public.get_my_perfil() in ('admin', 'equipe')
  );

create policy "storage_func_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'funcionarios'
    and public.get_my_perfil() in ('admin', 'equipe')
  );

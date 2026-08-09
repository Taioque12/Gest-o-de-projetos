DROP POLICY IF EXISTS "Usuários autenticados podem ler embeddings" ON public.projetos_embeddings;
DROP POLICY IF EXISTS "embeddings_select_por_projeto" ON public.projetos_embeddings;

create policy "embeddings_select_por_projeto"
on public.projetos_embeddings for select
to authenticated
using (
    public.get_my_perfil() in ('admin', 'equipe') or
    (
      public.get_my_perfil() = 'cliente' and
      exists (
        select 1
        from public.acessos_cliente ac
        where ac.usuario_id = auth.uid()
          and ac.projeto_id = projetos_embeddings.projeto_id
      )
    )
);

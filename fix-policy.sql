DROP POLICY IF EXISTS "Usuários autenticados podem ler embeddings" ON projetos_embeddings;

create policy "Usuários autenticados podem ler embeddings"
on projetos_embeddings for select
to authenticated
using (
    auth.jwt() ->> 'perfil' = 'admin' OR 
    auth.jwt() ->> 'perfil' = 'equipe' OR
    (auth.jwt() ->> 'perfil' = 'cliente' AND projeto_id IN (SELECT projeto_id FROM acessos_cliente WHERE usuario_id = auth.uid()))
);

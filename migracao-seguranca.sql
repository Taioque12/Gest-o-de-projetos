-- Auditoria e Correção RLS (Segurança)

-- 1. HABILIDADES
DROP POLICY IF EXISTS "habilidades_escrita" ON habilidades;
CREATE POLICY "habilidades_write_staff" 
ON habilidades FOR ALL 
USING (get_my_perfil() IN ('admin', 'equipe')) 
WITH CHECK (get_my_perfil() IN ('admin', 'equipe'));

-- 2. AVALIAÇÕES DE HABILIDADES
DROP POLICY IF EXISTS "avaliacoes_escrita" ON avaliacoes_habilidades;
CREATE POLICY "avaliacoes_write_staff" 
ON avaliacoes_habilidades FOR ALL 
USING (get_my_perfil() IN ('admin', 'equipe')) 
WITH CHECK (get_my_perfil() IN ('admin', 'equipe'));

-- 3. ANEXOS
DROP POLICY IF EXISTS "anexos_leitura" ON anexos;
DROP POLICY IF EXISTS "anexos_insert" ON anexos;

-- Leitura de Anexos: Staff vê todos; Cliente vê apenas dos projetos aos quais tem acesso
CREATE POLICY "anexos_select" 
ON anexos FOR SELECT 
USING (
  get_my_perfil() IN ('admin', 'equipe') 
  OR 
  (get_my_perfil() = 'cliente' AND projeto_id IN (
    SELECT projeto_id FROM acessos_cliente WHERE usuario_id = auth.uid()
  ))
);

-- Inserção de Anexos: Somente Staff (Admins e Equipe)
CREATE POLICY "anexos_insert_staff" 
ON anexos FOR INSERT 
WITH CHECK (get_my_perfil() IN ('admin', 'equipe'));

-- Nota: a política "anexos_delete" já estava correta (limitada a admin/equipe)

import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useUsuarios(empresaId) {
  const [membros, setMembros]   = useState([])
  const [acessos, setAcessos]   = useState([])
  const [loading, setLoading]   = useState(true)

  const fetchTudo = useCallback(async () => {
    if (!supabaseConfigurado || !empresaId) { setLoading(false); return }
    setLoading(true)
    try {
      const [{ data: ms }, { data: ac }] = await Promise.all([
        supabase
          .from('usuarios_empresa')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('criado_em', { ascending: true }),
        supabase
          .from('acessos_cliente')
          .select('*'),
      ])
      setMembros(ms ?? [])
      setAcessos(ac ?? [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [empresaId])

  useEffect(() => { fetchTudo() }, [fetchTudo])

  async function atualizarPerfil(id, perfil) {
    const { error } = await supabase.from('usuarios_empresa').update({ perfil }).eq('id', id)
    if (error) throw error
    await fetchTudo()
  }

  async function atualizarNome(id, nome) {
    const { error } = await supabase.from('usuarios_empresa').update({ nome }).eq('id', id)
    if (error) throw error
    await fetchTudo()
  }

  async function removerMembro(id) {
    const { error } = await supabase.from('usuarios_empresa').update({ ativo: false }).eq('id', id)
    if (error) throw error
    await fetchTudo()
  }

  async function concederAcesso(usuario_id, projeto_id) {
    const { error } = await supabase
      .from('acessos_cliente')
      .upsert({ usuario_id, projeto_id, empresa_id: empresaId }, { onConflict: 'usuario_id,projeto_id' })
    if (error) throw error
    await fetchTudo()
  }

  async function revogarAcesso(usuario_id, projeto_id) {
    const { error } = await supabase
      .from('acessos_cliente')
      .delete().eq('usuario_id', usuario_id).eq('projeto_id', projeto_id)
    if (error) throw error
    await fetchTudo()
  }

  return { membros, acessos, loading, atualizarPerfil, atualizarNome, removerMembro, concederAcesso, revogarAcesso, refetch: fetchTudo }
}

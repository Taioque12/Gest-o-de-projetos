import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useUsuarios() {
  const [usuarios, setUsuarios]   = useState([])
  const [acessos, setAcessos]     = useState([])
  const [loading, setLoading]     = useState(true)

  const fetchTudo = useCallback(async () => {
    if (!supabaseConfigurado) { setLoading(false); return }
    setLoading(true)
    try {
      const [{ data: us }, { data: ac }] = await Promise.all([
        supabase.from('usuarios').select('*').order('nome'),
        supabase.from('acessos_cliente').select('*'),
      ])
      setUsuarios(us ?? [])
      setAcessos(ac ?? [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTudo() }, [fetchTudo])

  async function atualizarPerfil(id, perfil) {
    const { error } = await supabase.from('usuarios').update({ perfil }).eq('id', id)
    if (error) throw error
    await fetchTudo()
  }

  async function atualizarNome(id, nome) {
    const { error } = await supabase.from('usuarios').update({ nome }).eq('id', id)
    if (error) throw error
    await fetchTudo()
  }

  async function concederAcesso(usuario_id, projeto_id) {
    const { error } = await supabase.from('acessos_cliente')
      .upsert({ usuario_id, projeto_id }, { onConflict: 'usuario_id,projeto_id' })
    if (error) throw error
    await fetchTudo()
  }

  async function revogarAcesso(usuario_id, projeto_id) {
    const { error } = await supabase.from('acessos_cliente')
      .delete().eq('usuario_id', usuario_id).eq('projeto_id', projeto_id)
    if (error) throw error
    await fetchTudo()
  }

  return { usuarios, acessos, loading, atualizarPerfil, atualizarNome, concederAcesso, revogarAcesso, refetch: fetchTudo }
}

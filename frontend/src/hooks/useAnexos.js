import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useAnexos(projetoId, empresaId) {
  const [anexos, setAnexos]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabaseConfigurado || !projetoId) { setLoading(false); return }
    const { data } = await supabase
      .from('anexos')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('criado_em', { ascending: false })
    setAnexos(data ?? [])
    setLoading(false)
  }, [projetoId])

  useEffect(() => { fetch() }, [fetch])

  async function uploadAnexo(file) {
    const ext  = file.name.split('.').pop()
    const path = `${projetoId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('anexos').upload(path, file)
    if (upErr) throw upErr
    const { data: { publicUrl } } = supabase.storage.from('anexos').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('anexos').insert({
      projeto_id: projetoId,
      empresa_id: empresaId,
      nome:       file.name,
      url:        publicUrl,
      tipo:       file.type,
      tamanho:    file.size,
      storage_path: path,
    })
    if (dbErr) throw dbErr
    await fetch()
  }

  async function excluirAnexo(anexo) {
    if (anexo.storage_path) {
      await supabase.storage.from('anexos').remove([anexo.storage_path])
    }
    const { error } = await supabase.from('anexos').delete().eq('id', anexo.id)
    if (error) throw error
    await fetch()
  }

  return { anexos, loading, uploadAnexo, excluirAnexo }
}

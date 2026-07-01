import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

const TAMANHO_MAX_MB = 20
const TAMANHO_MAX_BYTES = TAMANHO_MAX_MB * 1024 * 1024

export function useAnexos(projetoId) {
  const [anexos, setAnexos]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabaseConfigurado || !projetoId) { setLoading(false); return }
    const { data } = await supabase
      .from('anexos')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('criado_em', { ascending: false })
    // Bucket privado: gera signed URLs (1h) a partir do storage_path
    const rows = data ?? []
    const paths = rows.filter(a => a.storage_path).map(a => a.storage_path)
    const signedMap = {}
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('anexos').createSignedUrls(paths, 3600)
      signed?.forEach(s => { if (s.signedUrl) signedMap[s.path] = s.signedUrl })
    }
    setAnexos(rows.map(a => signedMap[a.storage_path] ? { ...a, url: signedMap[a.storage_path] } : a))
    setLoading(false)
  }, [projetoId])

  useEffect(() => { fetch() }, [fetch])

  async function uploadAnexo(file) {
    if (file.size > TAMANHO_MAX_BYTES) {
      throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: ${TAMANHO_MAX_MB}MB.`)
    }
    const ext  = file.name.split('.').pop()
    const path = `${projetoId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('anexos').upload(path, file)
    if (upErr) throw upErr
    // url gravada só como referência legada — o download real usa
    // signed URL gerada no fetch a partir do storage_path
    const { data: { publicUrl } } = supabase.storage.from('anexos').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('anexos').insert({
      projeto_id: projetoId,
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

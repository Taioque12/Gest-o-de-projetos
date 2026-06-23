import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

// Efetivo semanal (profissionais previstos x mobilizados) de um projeto.
// Espelha o padrão de useAnexos: busca por projeto_id, salva (upsert) e exclui.
export function useEfetivo(projetoId) {
  const [efetivo, setEfetivo] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabaseConfigurado || !projetoId) { setLoading(false); return }
    const { data } = await supabase
      .from('efetivo_semana')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('data_semana', { ascending: true })
    setEfetivo(data ?? [])
    setLoading(false)
  }, [projetoId])

  useEffect(() => { fetch() }, [fetch])

  // Insere ou atualiza a semana (chave: projeto_id + data_semana)
  async function salvarEfetivo({ data_semana, previstos, mobilizados, semana_numero }) {
    const toInt = v => (v === '' || v == null ? null : Number(v))
    const { error } = await supabase
      .from('efetivo_semana')
      .upsert({
        projeto_id:    projetoId,
        data_semana,
        previstos:     toInt(previstos) ?? 0,
        mobilizados:   toInt(mobilizados),
        semana_numero: toInt(semana_numero),
      }, { onConflict: 'projeto_id,data_semana' })
    if (error) throw error
    await fetch()
  }

  async function excluirEfetivo(id) {
    const { error } = await supabase.from('efetivo_semana').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { efetivo, loading, salvarEfetivo, excluirEfetivo }
}

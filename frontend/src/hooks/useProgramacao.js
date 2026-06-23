import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useProgramacao(projetoId) {
  const [alocacoes, setAlocacoes] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!supabaseConfigurado || !projetoId) { setLoading(false); return }
    const { data } = await supabase
      .from('programacao_semanal')
      .select('*')
      .eq('projeto_id', projetoId)
    setAlocacoes(data ?? [])
    setLoading(false)
  }, [projetoId])

  useEffect(() => { refetch() }, [refetch])

  async function alocar({ funcionario_id, data_semana, dias }) {
    if (!supabaseConfigurado) return
    const d = Number(dias) || 0
    if (d === 0) {
      await supabase
        .from('programacao_semanal')
        .delete()
        .match({ projeto_id: projetoId, funcionario_id, data_semana })
    } else {
      const { error } = await supabase
        .from('programacao_semanal')
        .upsert(
          { projeto_id: projetoId, funcionario_id, data_semana, dias: d },
          { onConflict: 'projeto_id,funcionario_id,data_semana' }
        )
      if (error) throw error
    }
    await refetch()
  }

  return { alocacoes, loading, alocar }
}

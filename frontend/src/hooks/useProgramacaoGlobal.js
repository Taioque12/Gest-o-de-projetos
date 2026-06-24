import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useProgramacaoGlobal() {
  const [alocacoes, setAlocacoes] = useState([])
  const [projetos, setProjetos]   = useState([])
  const [loading, setLoading]     = useState(true)

  const refetch = useCallback(async () => {
    if (!supabaseConfigurado) { setLoading(false); return }
    const [{ data: alocs }, { data: projs }] = await Promise.all([
      supabase.from('programacao_semanal').select('*'),
      supabase.from('projetos').select('id, nome, os, data_inicio, data_fim'),
    ])
    setAlocacoes(alocs ?? [])
    setProjetos(projs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  async function alocar({ funcionario_id, projeto_id, data_semana, dias }) {
    if (!supabaseConfigurado) return
    const d = Number(dias) || 0
    if (d === 0) {
      await supabase.from('programacao_semanal').delete()
        .match({ funcionario_id, projeto_id, data_semana })
    } else {
      const { error } = await supabase.from('programacao_semanal')
        .upsert(
          { funcionario_id, projeto_id, data_semana, dias: d },
          { onConflict: 'projeto_id,funcionario_id,data_semana' }
        )
      if (error) throw error
    }
    // Sync efetivo_semana do projeto afetado
    const { data: alocs } = await supabase.from('programacao_semanal')
      .select('dias').eq('projeto_id', projeto_id).eq('data_semana', data_semana)
    const mob = (alocs ?? []).filter(a => (a.dias || 0) > 0).length
    const { data: ef } = await supabase.from('efetivo_semana')
      .select('previstos').eq('projeto_id', projeto_id).eq('data_semana', data_semana).maybeSingle()
    await supabase.from('efetivo_semana')
      .upsert(
        { projeto_id, data_semana, previstos: ef?.previstos ?? 0, mobilizados: mob },
        { onConflict: 'projeto_id,data_semana' }
      )
    await refetch()
  }

  return { alocacoes, projetos, loading, refetch, alocar }
}

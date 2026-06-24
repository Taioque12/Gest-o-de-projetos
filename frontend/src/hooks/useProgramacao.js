import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useProgramacao(projetoId, empresaId) {
  const [alocacoes, setAlocacoes] = useState([])
  const [conflitos, setConflitos] = useState({}) // { [funcId__semana]: totalDiasOutrosProjetos }
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!supabaseConfigurado || !projetoId) { setLoading(false); return }
    const { data } = await supabase
      .from('programacao_semanal')
      .select('*')
      .eq('projeto_id', projetoId)
    const alocs = data ?? []
    setAlocacoes(alocs)
    // Verifica conflitos cross-projeto para todas as alocações atuais
    if (alocs.length > 0) await checkAllConflicts(alocs)
    setLoading(false)
  }, [projetoId])

  useEffect(() => { refetch() }, [refetch])

  // Busca em batch: mesmo funcionário + mesma semana em OUTROS projetos
  async function checkAllConflicts(alocs) {
    const funcIds = [...new Set(alocs.map(a => a.funcionario_id))]
    const semanas = [...new Set(alocs.map(a => a.data_semana))]
    const { data } = await supabase
      .from('programacao_semanal')
      .select('funcionario_id, data_semana, dias')
      .in('funcionario_id', funcIds)
      .in('data_semana', semanas)
      .neq('projeto_id', projetoId)
    const map = {}
    for (const row of (data ?? [])) {
      const key = `${row.funcionario_id}__${row.data_semana}`
      map[key] = (map[key] ?? 0) + (row.dias || 0)
    }
    setConflitos(map)
  }

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
          { projeto_id: projetoId, funcionario_id, data_semana, dias: d, empresa_id: empresaId },
          { onConflict: 'projeto_id,funcionario_id,data_semana' }
        )
      if (error) throw error
    }
    await refetch() // refetch já chama checkAllConflicts
    await syncEfetivo(data_semana)
  }

  async function syncEfetivo(data_semana) {
    const { data: alocs } = await supabase
      .from('programacao_semanal')
      .select('dias')
      .eq('projeto_id', projetoId)
      .eq('data_semana', data_semana)
    const mob = (alocs ?? []).filter(a => (a.dias || 0) > 0).length
    const { data: ef } = await supabase
      .from('efetivo_semana')
      .select('previstos')
      .eq('projeto_id', projetoId)
      .eq('data_semana', data_semana)
      .maybeSingle()
    await supabase
      .from('efetivo_semana')
      .upsert(
        { projeto_id: projetoId, data_semana, previstos: ef?.previstos ?? 0, mobilizados: mob, empresa_id: empresaId },
        { onConflict: 'projeto_id,data_semana' }
      )
  }

  return { alocacoes, conflitos, loading, alocar }
}

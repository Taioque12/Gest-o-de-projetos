import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'
import { syncEfetivo } from '../utils/syncEfetivo'

export function useProgramacao(projetoId) {
  const [alocacoes, setAlocacoes] = useState([])
  const [conflitos, setConflitos] = useState({}) // { [funcId__semana]: totalDiasOutrosProjetos }
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!supabaseConfigurado || !projetoId) { setLoading(false); return }
    const { data, error } = await supabase
      .from('programacao_semanal')
      .select('*')
      .eq('projeto_id', projetoId)
    if (error) { console.error('useProgramacao refetch:', error.message); setLoading(false); return }
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
      const { error } = await supabase
        .from('programacao_semanal')
        .delete()
        .match({ projeto_id: projetoId, funcionario_id, data_semana })
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('programacao_semanal')
        .upsert(
          { projeto_id: projetoId, funcionario_id, data_semana, dias: d },
          { onConflict: 'projeto_id,funcionario_id,data_semana' }
        )
      if (error) throw error
    }
    await refetch() // refetch já chama checkAllConflicts
    await syncEfetivo(projetoId, data_semana)
  }

  return { alocacoes, conflitos, loading, alocar }
}

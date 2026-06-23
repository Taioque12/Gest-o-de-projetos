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

  // Salva alocação, auto-sincroniza mobilizados no Histograma e retorna conflitos cross-projeto
  async function alocar({ funcionario_id, data_semana, dias }) {
    if (!supabaseConfigurado) return []
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
    // #1 — auto-sync: atualiza efetivo_semana.mobilizados sem apagar previstos
    await syncEfetivo(data_semana)
    // #2 — retorna alocações do mesmo funcionário em outros projetos na mesma semana
    return await buscarConflitosExternos(funcionario_id, data_semana)
  }

  // Conta quantos funcionários estão alocados nessa semana e upserta em efetivo_semana
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
        { projeto_id: projetoId, data_semana, previstos: ef?.previstos ?? 0, mobilizados: mob },
        { onConflict: 'projeto_id,data_semana' }
      )
  }

  // Retorna alocações do funcionário em OUTROS projetos na mesma semana
  async function buscarConflitosExternos(funcionario_id, data_semana) {
    const { data } = await supabase
      .from('programacao_semanal')
      .select('dias, projeto_id')
      .eq('funcionario_id', funcionario_id)
      .eq('data_semana', data_semana)
      .neq('projeto_id', projetoId)
    return data ?? []
  }

  return { alocacoes, loading, alocar, buscarConflitosExternos }
}

import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useProgramacaoGlobal(empresaId) {
  const [alocacoes, setAlocacoes]       = useState([])
  const [projetos, setProjetos]         = useState([])
  const [indisponibilidades, setIndisp] = useState([])
  const [loading, setLoading]           = useState(true)

  const refetch = useCallback(async () => {
    if (!supabaseConfigurado) { setLoading(false); return }
    const [{ data: alocs }, { data: projs }, { data: indisp }] = await Promise.all([
      supabase.from('programacao_semanal').select('*'),
      supabase.from('projetos').select('id, nome, os, data_inicio, data_fim'),
      supabase.from('indisponibilidades').select('*'),
    ])
    setAlocacoes(alocs ?? [])
    setProjetos(projs ?? [])
    setIndisp(indisp ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  async function syncEfetivo(projeto_id, data_semana) {
    const { data: alocs } = await supabase.from('programacao_semanal')
      .select('dias').eq('projeto_id', projeto_id).eq('data_semana', data_semana)
    const mob = (alocs ?? []).filter(a => (a.dias || 0) > 0).length
    const { data: ef } = await supabase.from('efetivo_semana')
      .select('previstos').eq('projeto_id', projeto_id).eq('data_semana', data_semana).maybeSingle()
    await supabase.from('efetivo_semana')
      .upsert(
        { projeto_id, data_semana, previstos: ef?.previstos ?? 0, mobilizados: mob, empresa_id: empresaId },
        { onConflict: 'projeto_id,data_semana' }
      )
  }

  async function alocar({ funcionario_id, projeto_id, data_semana, dias }) {
    if (!supabaseConfigurado) return
    const d = Number(dias) || 0
    if (d === 0) {
      await supabase.from('programacao_semanal').delete()
        .match({ funcionario_id, projeto_id, data_semana })
    } else {
      const { error } = await supabase.from('programacao_semanal')
        .upsert(
          { funcionario_id, projeto_id, data_semana, dias: d, empresa_id: empresaId },
          { onConflict: 'projeto_id,funcionario_id,data_semana' }
        )
      if (error) throw error
    }
    await syncEfetivo(projeto_id, data_semana)
    await refetch()
  }

  // Copia todas as alocações de semanaOrigem → semanaDestino (não sobrescreve existentes)
  async function copiarSemana(semanaOrigem, semanaDestino) {
    if (!supabaseConfigurado) return
    const { data: origem } = await supabase.from('programacao_semanal')
      .select('*').eq('data_semana', semanaOrigem)
    if (!origem?.length) return

    const registros = origem.map(({ funcionario_id, projeto_id, dias }) => ({
      funcionario_id, projeto_id, data_semana: semanaDestino, dias, empresa_id: empresaId,
    }))
    await supabase.from('programacao_semanal')
      .upsert(registros, { onConflict: 'projeto_id,funcionario_id,data_semana', ignoreDuplicates: true })

    const projIds = [...new Set(registros.map(r => r.projeto_id))]
    await Promise.all(projIds.map(pid => syncEfetivo(pid, semanaDestino)))
    await refetch()
  }

  async function marcarIndisponivel({ funcionario_id, data_semana, motivo, observacao }) {
    if (!supabaseConfigurado) return
    const { error } = await supabase.from('indisponibilidades')
      .upsert({ funcionario_id, data_semana, motivo, observacao },
        { onConflict: 'funcionario_id,data_semana' })
    if (error) throw error
    await refetch()
  }

  async function desmarcarIndisponivel({ funcionario_id, data_semana }) {
    if (!supabaseConfigurado) return
    await supabase.from('indisponibilidades').delete()
      .match({ funcionario_id, data_semana })
    await refetch()
  }

  return {
    alocacoes, projetos, indisponibilidades, loading, refetch,
    alocar, copiarSemana, marcarIndisponivel, desmarcarIndisponivel,
  }
}

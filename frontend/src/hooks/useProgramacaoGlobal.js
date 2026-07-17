import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'
import { syncEfetivo } from '../utils/syncEfetivo'

export function useProgramacaoGlobal() {
  const [alocacoes, setAlocacoes]       = useState([])
  const [projetos, setProjetos]         = useState([])
  const [indisponibilidades, setIndisp] = useState([])
  const [loading, setLoading]           = useState(true)

  const refetch = useCallback(async () => {
    if (!supabaseConfigurado) { setLoading(false); return }
    const [{ data: alocs, error: e1 }, { data: projs, error: e2 }, { data: indisp, error: e3 }] = await Promise.all([
      supabase.from('programacao_semanal').select('*'),
      supabase.from('projetos').select('id, nome, os, data_inicio, data_fim'),
      supabase.from('indisponibilidades').select('*'),
    ])
    if (e1 || e2 || e3) console.error('useProgramacaoGlobal refetch:', e1?.message || e2?.message || e3?.message)
    setAlocacoes(alocs ?? [])
    setProjetos(projs ?? [])
    setIndisp(indisp ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  async function alocar({ funcionario_id, projeto_id, data_semana, dias }) {
    if (!supabaseConfigurado) return
    const d = Number(dias) || 0
    if (d === 0) {
      const { error } = await supabase.from('programacao_semanal').delete()
        .match({ funcionario_id, projeto_id, data_semana })
      if (error) throw error
    } else {
      const { error } = await supabase.from('programacao_semanal')
        .upsert(
          { funcionario_id, projeto_id, data_semana, dias: d },
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
    const { data: origem, error: origemErr } = await supabase.from('programacao_semanal')
      .select('*').eq('data_semana', semanaOrigem)
    if (origemErr) throw origemErr
    if (!origem?.length) return

    const registros = origem.map(({ funcionario_id, projeto_id, dias }) => ({
      funcionario_id, projeto_id, data_semana: semanaDestino, dias,
    }))
    const { error } = await supabase.from('programacao_semanal')
      .upsert(registros, { onConflict: 'projeto_id,funcionario_id,data_semana', ignoreDuplicates: true })
    if (error) throw error

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
    const { error } = await supabase.from('indisponibilidades').delete()
      .match({ funcionario_id, data_semana })
    if (error) throw error
    await refetch()
  }

  return {
    alocacoes, projetos, indisponibilidades, loading, refetch,
    alocar, copiarSemana, marcarIndisponivel, desmarcarIndisponivel,
  }
}

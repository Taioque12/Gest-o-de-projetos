import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useBaseline(projetoId) {
  const [baselines, setBaselines] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!supabaseConfigurado || !projetoId) { setLoading(false); return }
    const { data } = await supabase
      .from('baseline_projetos')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('criado_em', { ascending: true })
    setBaselines(data ?? [])
    setLoading(false)
  }, [projetoId])

  useEffect(() => { refetch() }, [refetch])

  // Congela o baseline atual do projeto
  async function congelarBaseline(projeto, descricao = '') {
    const { error } = await supabase
      .from('baseline_projetos')
      .insert({
        projeto_id:        projetoId,
        data_congelamento: new Date().toISOString().slice(0, 10),
        inicio_original:   projeto.inicio,
        fim_original:      projeto.fim,
        prev_original:     projeto.prev,
        real_original:     projeto.real,
        descricao:         descricao || null,
      })
    if (error) throw error
    await refetch()
  }

  async function excluirBaseline(id) {
    const { error } = await supabase.from('baseline_projetos').delete().eq('id', id)
    if (error) throw error
    await refetch()
  }

  // Baseline ativo = o mais antigo (primeiro congelado)
  const baselineAtivo = baselines[0] ?? null

  return { baselines, baselineAtivo, loading, congelarBaseline, excluirBaseline }
}

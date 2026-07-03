import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useAnaliseIAHistorico(projetoId) {
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchHistorico = useCallback(async () => {
    if (!supabaseConfigurado || !projetoId) {
      setHistorico([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('analise_ia_historico')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('criada_em', { ascending: false })
    if (!error) setHistorico(data ?? [])
    setLoading(false)
  }, [projetoId])

  useEffect(() => { fetchHistorico() }, [fetchHistorico])

  return { historico, loading, refetch: fetchHistorico }
}

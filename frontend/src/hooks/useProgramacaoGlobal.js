import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

// Busca todas as alocações (cross-projeto) + lista de projetos para montar
// a visão global na aba Programação da página Equipes.
export function useProgramacaoGlobal() {
  const [alocacoes, setAlocacoes] = useState([])
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!supabaseConfigurado) { setLoading(false); return }
    const [{ data: alocs }, { data: projs }] = await Promise.all([
      supabase.from('programacao_semanal').select('*'),
      supabase.from('projetos').select('id, nome, os'),
    ])
    setAlocacoes(alocs ?? [])
    setProjetos(projs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { alocacoes, projetos, loading, refetch }
}

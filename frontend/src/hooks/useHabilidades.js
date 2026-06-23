import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export const MOCK_HABILIDADES = [
  { id: 'mock-hab-1', nome: 'Alarme de Incêndio (SDAI)',    ordem: 1, ativo: true },
  { id: 'mock-hab-2', nome: 'Instalação Elétrica',          ordem: 2, ativo: true },
  { id: 'mock-hab-3', nome: 'Montagem de Infraestrutura',   ordem: 3, ativo: true },
  { id: 'mock-hab-4', nome: 'Instrumentação',               ordem: 4, ativo: true },
  { id: 'mock-hab-5', nome: 'Média Tensão',                 ordem: 5, ativo: true },
  { id: 'mock-hab-6', nome: 'Alta Tensão',                  ordem: 6, ativo: true },
]

export function useHabilidades() {
  const [habilidades, setHabilidades] = useState([])
  const [loading, setLoading]         = useState(true)

  const fetchHabilidades = useCallback(async () => {
    if (!supabaseConfigurado) {
      setHabilidades(MOCK_HABILIDADES)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('habilidades')
        .select('*')
        .eq('ativo', true)
        .order('ordem')
      if (error) throw error
      setHabilidades(data ?? [])
    } catch {
      setHabilidades(MOCK_HABILIDADES)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchHabilidades() }, [fetchHabilidades])

  async function criarHabilidade(nome) {
    const maxOrdem = habilidades.length > 0
      ? Math.max(...habilidades.map(h => h.ordem))
      : 0
    const { error } = await supabase
      .from('habilidades')
      .insert({ nome: nome.trim(), ordem: maxOrdem + 1 })
    if (error) throw error
    await fetchHabilidades()
  }

  async function excluirHabilidade(id) {
    // Soft delete — preserva histórico de avaliações existentes
    const { error } = await supabase
      .from('habilidades')
      .update({ ativo: false })
      .eq('id', id)
    if (error) throw error
    await fetchHabilidades()
  }

  return { habilidades, loading, criarHabilidade, excluirHabilidade, refetch: fetchHabilidades }
}

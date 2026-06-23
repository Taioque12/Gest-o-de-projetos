import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'
import { MOCK_HABILIDADES } from './useHabilidades'

const MOCK = [
  {
    id: 'm1', nome: 'Carlos Menezes', cargo: 'Engenheiro de Campo', equipe: 'Equipe A',
    avaliacoes: { 'mock-hab-1': 8, 'mock-hab-2': 9, 'mock-hab-3': 7, 'mock-hab-4': 6, 'mock-hab-5': 8, 'mock-hab-6': 5 },
  },
  {
    id: 'm2', nome: 'Ana Paula Souza', cargo: 'Técnica Eletricista', equipe: 'Equipe A',
    avaliacoes: { 'mock-hab-1': 7, 'mock-hab-2': 8, 'mock-hab-3': 9, 'mock-hab-4': 4, 'mock-hab-5': 6, 'mock-hab-6': 3 },
  },
  {
    id: 'm3', nome: 'Roberto Lima', cargo: 'Supervisor de Montagem', equipe: 'Equipe B',
    avaliacoes: { 'mock-hab-1': 5, 'mock-hab-2': 7, 'mock-hab-3': 8, 'mock-hab-4': 7, 'mock-hab-5': 9, 'mock-hab-6': 8 },
  },
]

function normalizarFuncionario(f) {
  return {
    ...f,
    avaliacoes: Object.fromEntries(
      (f.avaliacoes_habilidades ?? []).map(a => [a.habilidade_id, a.nota])
    ),
  }
}

export function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading]           = useState(true)
  const [usandoMock, setUsandoMock]     = useState(false)

  const fetchFuncionarios = useCallback(async () => {
    if (!supabaseConfigurado) {
      setFuncionarios(MOCK); setUsandoMock(true); setLoading(false); return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*, avaliacoes_habilidades(habilidade_id, nota)')
        .order('nome')
      if (error) throw error
      setFuncionarios((data ?? []).map(normalizarFuncionario))
      setUsandoMock(false)
    } catch {
      setFuncionarios(MOCK); setUsandoMock(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchFuncionarios() }, [fetchFuncionarios])

  async function criarFuncionario(dados) {
    const { avaliacoes, ...dadosPrincipais } = dados
    const { data, error } = await supabase
      .from('funcionarios')
      .insert(dadosPrincipais)
      .select('id')
      .single()
    if (error) throw error
    await salvarAvaliacoes(data.id, avaliacoes)
    await fetchFuncionarios()
  }

  async function editarFuncionario(id, dados) {
    const { avaliacoes, ...dadosPrincipais } = dados
    const { error } = await supabase
      .from('funcionarios')
      .update(dadosPrincipais)
      .eq('id', id)
    if (error) throw error
    await salvarAvaliacoes(id, avaliacoes)
    await fetchFuncionarios()
  }

  async function excluirFuncionario(id) {
    const { error } = await supabase.from('funcionarios').delete().eq('id', id)
    if (error) throw error
    await fetchFuncionarios()
  }

  return { funcionarios, loading, usandoMock, criarFuncionario, editarFuncionario, excluirFuncionario }
}

async function salvarAvaliacoes(funcionarioId, avaliacoes) {
  if (!avaliacoes || Object.keys(avaliacoes).length === 0) return
  const rows = Object.entries(avaliacoes).map(([habilidade_id, nota]) => ({
    funcionario_id: funcionarioId,
    habilidade_id,
    nota: Number(nota),
  }))
  const { error } = await supabase
    .from('avaliacoes_habilidades')
    .upsert(rows, { onConflict: 'funcionario_id,habilidade_id' })
  if (error) throw error
}

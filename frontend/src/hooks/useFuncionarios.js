import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

const COMPETENCIAS = ['sdai','instalacao_eletrica','infraestrutura','instrumentacao','media_tensao','alta_tensao']

const MOCK = [
  { id:'m1', nome:'Carlos Menezes', cargo:'Engenheiro de Campo', equipe:'Equipe A', sdai:8, instalacao_eletrica:9, infraestrutura:7, instrumentacao:6, media_tensao:8, alta_tensao:5 },
  { id:'m2', nome:'Ana Paula Souza', cargo:'Técnica Eletricista', equipe:'Equipe A', sdai:7, instalacao_eletrica:8, infraestrutura:9, instrumentacao:4, media_tensao:6, alta_tensao:3 },
  { id:'m3', nome:'Roberto Lima', cargo:'Supervisor de Montagem', equipe:'Equipe B', sdai:5, instalacao_eletrica:7, infraestrutura:8, instrumentacao:7, media_tensao:9, alta_tensao:8 },
]

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
        .select('*')
        .order('nome')
      if (error) throw error
      setFuncionarios(data ?? [])
      setUsandoMock(false)
    } catch {
      setFuncionarios(MOCK); setUsandoMock(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchFuncionarios() }, [fetchFuncionarios])

  async function criarFuncionario(dados) {
    const { error } = await supabase.from('funcionarios').insert(dados)
    if (error) throw error
    await fetchFuncionarios()
  }

  async function editarFuncionario(id, dados) {
    const { error } = await supabase
      .from('funcionarios')
      .update({ ...dados, atualizado_em: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await fetchFuncionarios()
  }

  async function excluirFuncionario(id) {
    const { error } = await supabase.from('funcionarios').delete().eq('id', id)
    if (error) throw error
    await fetchFuncionarios()
  }

  return { funcionarios, loading, usandoMock, criarFuncionario, editarFuncionario, excluirFuncionario }
}

export { COMPETENCIAS }

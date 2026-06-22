import { useState, useEffect } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'
import { MOCK_PROJETOS, normalizarProjeto, prepararProjeto } from '../utils/helpers'

export function useProjetos(perfil, userId) {
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [usandoMock, setUsandoMock] = useState(false)

  useEffect(() => {
    if (!supabaseConfigurado) {
      setProjetos(MOCK_PROJETOS.map(prepararProjeto))
      setUsandoMock(true)
      setLoading(false)
      return
    }
    fetchProjetos()
  }, [perfil, userId])

  async function fetchProjetos() {
    try {
      let ids = null
      if (perfil === 'cliente' && userId) {
        const { data: acessos } = await supabase
          .from('acessos_cliente')
          .select('projeto_id')
          .eq('usuario_id', userId)
        ids = acessos?.map(a => a.projeto_id) ?? []
      }

      let query = supabase.from('projetos').select('*')
      if (ids) query = query.in('id', ids)
      const { data: projDb, error } = await query
      if (error) throw error

      const { data: atualizacoes } = await supabase
        .from('atualizacoes_semana')
        .select('*')

      const { data: frentes } = await supabase
        .from('frentes_servico')
        .select('*')

      const normalizados = projDb.map(p =>
        prepararProjeto(normalizarProjeto(p, atualizacoes ?? [], frentes ?? []))
      )
      setProjetos(normalizados)
    } catch (err) {
      console.error('Supabase error, usando mock:', err)
      setProjetos(MOCK_PROJETOS.map(prepararProjeto))
      setUsandoMock(true)
    }
    setLoading(false)
  }

  return { projetos, loading, usandoMock, refetch: fetchProjetos }
}

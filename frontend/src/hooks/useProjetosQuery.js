import { useState, useCallback, useEffect } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'
import { MOCK_PROJETOS, normalizarProjeto, prepararProjeto } from '../utils/helpers'

export function useProjetosQuery(perfil, userId) {
  const [projetos, setProjetos] = useState([])
  const [atualizacoes, setAtualizacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [usandoMock, setUsandoMock] = useState(false)

  const fetchProjetos = useCallback(async () => {
    if (!supabaseConfigurado) {
      setProjetos(MOCK_PROJETOS.map(prepararProjeto))
      setUsandoMock(true)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let ids = null
      if (perfil === 'cliente' && userId) {
        const { data: acessos } = await supabase.from('acessos_cliente').select('projeto_id').eq('usuario_id', userId)
        ids = acessos?.map(a => a.projeto_id) ?? []
      }
      let query = supabase.from('projetos').select('*')
      if (ids) query = query.in('id', ids)
      const { data: projDb, error } = await query
      if (error) throw error

      const { data: ats } = await supabase.from('atualizacoes_semana').select('*').order('data_atualizacao', { ascending: true })
      const { data: frentes } = await supabase.from('frentes_servico').select('*')

      const atsData = ats ?? []
      setAtualizacoes(atsData)
      setProjetos(projDb.map(p => prepararProjeto(normalizarProjeto(p, atsData, frentes ?? []))))
      setUsandoMock(false)
    } catch (err) {
      console.error('Supabase error, usando mock:', err)
      setProjetos(MOCK_PROJETOS.map(prepararProjeto))
      setUsandoMock(true)
    }
    setLoading(false)
  }, [perfil, userId])

  useEffect(() => { fetchProjetos() }, [fetchProjetos])

  return { projetos, atualizacoes, loading, usandoMock, refetch: fetchProjetos }
}

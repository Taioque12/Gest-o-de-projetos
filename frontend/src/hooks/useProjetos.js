import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'
import { MOCK_PROJETOS, normalizarProjeto, prepararProjeto } from '../utils/helpers'

export function useProjetos(perfil, userId) {
  const [projetos, setProjetos] = useState([])
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
      setUsandoMock(false)
    } catch (err) {
      console.error('Supabase error, usando mock:', err)
      setProjetos(MOCK_PROJETOS.map(prepararProjeto))
      setUsandoMock(true)
    }
    setLoading(false)
  }, [perfil, userId])

  useEffect(() => { fetchProjetos() }, [fetchProjetos])

  async function criarProjeto(dados) {
    const { prev, real, ...projetoData } = dados
    const { data, error } = await supabase
      .from('projetos')
      .insert({
        os:               projetoData.os,
        nome:             projetoData.nome,
        cliente:          projetoData.cliente,
        escopo:           projetoData.escopo,
        responsavel:      projetoData.responsavel,
        data_inicio:      projetoData.data_inicio,
        data_fim:         projetoData.data_fim,
        prazo_meses:      projetoData.prazo_meses,
        valor_os:         projetoData.valor_os,
        equipes:          projetoData.equipes,
        acao_recomendada: projetoData.acao_recomendada,
      })
      .select()
      .single()
    if (error) throw error

    // Registra o avanço inicial
    if (prev != null || real != null) {
      await supabase.from('atualizacoes_semana').insert({
        projeto_id:       data.id,
        data_atualizacao: new Date().toISOString().slice(0, 10),
        avanco_previsto:  prev ?? 0,
        avanco_realizado: real ?? 0,
        semana_numero:    1,
      })
    }
    await fetchProjetos()
    return data
  }

  async function editarProjeto(id, dados) {
    const { prev, real, ...projetoData } = dados
    const { error } = await supabase
      .from('projetos')
      .update({
        nome:             projetoData.nome,
        cliente:          projetoData.cliente,
        escopo:           projetoData.escopo,
        responsavel:      projetoData.responsavel,
        data_inicio:      projetoData.data_inicio,
        data_fim:         projetoData.data_fim,
        prazo_meses:      projetoData.prazo_meses,
        valor_os:         projetoData.valor_os,
        equipes:          projetoData.equipes,
        acao_recomendada: projetoData.acao_recomendada,
        atualizado_em:    new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error

    // Insere nova entrada de avanço com a data de hoje (mantém histórico)
    if (prev != null || real != null) {
      const hoje = new Date().toISOString().slice(0, 10)
      await supabase.from('atualizacoes_semana')
        .upsert({
          projeto_id:       id,
          data_atualizacao: hoje,
          avanco_previsto:  prev ?? 0,
          avanco_realizado: real ?? 0,
        }, { onConflict: 'projeto_id,data_atualizacao' })
    }
    await fetchProjetos()
  }

  async function excluirProjeto(id) {
    // frentes_servico e atualizacoes_semana têm ON DELETE CASCADE
    const { error } = await supabase.from('projetos').delete().eq('id', id)
    if (error) throw error
    await fetchProjetos()
  }

  // atualizacoes: [{ id, prev, real }] — só os projetos que mudaram
  async function atualizarSemanal(data, atualizacoes) {
    await Promise.all(atualizacoes.map(async ({ id, prev, real }) => {
      const { error: e1 } = await supabase
        .from('projetos')
        .update({ atualizado_em: new Date().toISOString() })
        .eq('id', id)
      if (e1) throw e1

      const { error: e2 } = await supabase
        .from('atualizacoes_semana')
        .upsert({
          projeto_id:       id,
          data_atualizacao: data,
          avanco_previsto:  prev,
          avanco_realizado: real,
        }, { onConflict: 'projeto_id,data_atualizacao' })
      if (e2) throw e2
    }))
    await fetchProjetos()
  }

  return { projetos, loading, usandoMock, refetch: fetchProjetos, criarProjeto, editarProjeto, excluirProjeto, atualizarSemanal }
}

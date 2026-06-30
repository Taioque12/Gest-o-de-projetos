import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'
import { MOCK_PROJETOS, normalizarProjeto, prepararProjeto } from '../utils/helpers'

export function useProjetos(perfil, userId, userEmail) {
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [usandoMock, setUsandoMock] = useState(false)

  const [atualizacoes, setAtualizacoes] = useState([])

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

      const { data: ats } = await supabase
        .from('atualizacoes_semana')
        .select('*')
        .order('data_atualizacao', { ascending: true })

      const { data: frentes } = await supabase
        .from('frentes_servico')
        .select('*')

      const atsData = ats ?? []
      setAtualizacoes(atsData)
      const normalizados = projDb.map(p =>
        prepararProjeto(normalizarProjeto(p, atsData, frentes ?? []))
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

  // Realtime: re-fetch quando qualquer outro usuário alterar projetos ou avanços
  useEffect(() => {
    if (!supabaseConfigurado) return
    // Nome único por instância — evita conflito se o hook montar mais de
    // uma vez ao mesmo tempo (ex: StrictMode, troca rápida de view).
    const channel = supabase
      .channel(`db-changes-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projetos' }, fetchProjetos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atualizacoes_semana' }, fetchProjetos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'efetivo_semana' }, fetchProjetos)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchProjetos])

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
        ultima_analise_ia: projetoData.ultima_analise_ia ?? null,
        analise_ia_em:     projetoData.ultima_analise_ia ? new Date().toISOString() : null,
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
        usuario_id:       userId ?? null,
        lancado_por:      userEmail ?? null,
        origem:           'manual',
      })
    }
    await fetchProjetos()
    return data
  }

  async function editarProjeto(id, dados, origem = 'manual') {
    const { prev, real, ...projetoData } = dados
    const update = {
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
    }
    // Só sobrescreve a análise IA cacheada quando o chamador explicitamente envia uma nova
    if (projetoData.ultima_analise_ia !== undefined) {
      update.ultima_analise_ia = projetoData.ultima_analise_ia
      update.analise_ia_em     = projetoData.ultima_analise_ia ? new Date().toISOString() : null
    }
    const { error } = await supabase
      .from('projetos')
      .update(update)
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
          usuario_id:       userId ?? null,
          lancado_por:      userEmail ?? null,
          origem,
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
          usuario_id:       userId ?? null,
          lancado_por:      userEmail ?? null,
          origem:           'manual',
        }, { onConflict: 'projeto_id,data_atualizacao' })
      if (e2) throw e2
    }))
    await fetchProjetos()
  }

  return { projetos, atualizacoes, loading, usandoMock, refetch: fetchProjetos, criarProjeto, editarProjeto, excluirProjeto, atualizarSemanal }
}

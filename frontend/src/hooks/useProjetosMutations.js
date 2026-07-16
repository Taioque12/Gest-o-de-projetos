import { supabase } from '../supabase'

export function useProjetosMutations(userId, userEmail, fetchProjetos) {
  async function criarProjeto(dados) {
    const { prev, real, upload_id, ...projetoData } = dados
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

    if (projetoData.ultima_analise_ia) {
      await supabase.from('analise_ia_historico').insert({
        projeto_id: data.id,
        texto:      projetoData.ultima_analise_ia,
        upload_id:  upload_id ?? null,
        criado_por: userEmail ?? null,
      })
    }

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
    const { prev, real, upload_id, ...projetoData } = dados
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
    if (projetoData.ultima_analise_ia !== undefined) {
      update.ultima_analise_ia = projetoData.ultima_analise_ia
      update.analise_ia_em     = projetoData.ultima_analise_ia ? new Date().toISOString() : null
    }
    const { error } = await supabase.from('projetos').update(update).eq('id', id)
    if (error) throw error

    if (update.ultima_analise_ia) {
      await supabase.from('analise_ia_historico').insert({
        projeto_id: id,
        texto:      update.ultima_analise_ia,
        upload_id:  upload_id ?? null,
        criado_por: userEmail ?? null,
      })
    }

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
    const { error } = await supabase.from('projetos').delete().eq('id', id)
    if (error) throw error
    await fetchProjetos()
  }

  async function atualizarSemanal(data, atualizacoes) {
    await Promise.all(atualizacoes.map(async ({ id, prev, real }) => {
      const { error: e1 } = await supabase.from('projetos').update({ atualizado_em: new Date().toISOString() }).eq('id', id)
      if (e1) throw e1
      const { error: e2 } = await supabase.from('atualizacoes_semana')
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

  return { criarProjeto, editarProjeto, excluirProjeto, atualizarSemanal }
}

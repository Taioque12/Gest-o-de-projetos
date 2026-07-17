import { supabase } from '../supabase'

// Recalcula `mobilizados` em efetivo_semana a partir das alocações reais em
// programacao_semanal, para uma semana de um projeto. Usado tanto na visão
// por projeto (useProgramacao) quanto na visão global (useProgramacaoGlobal).
export async function syncEfetivo(projetoId, dataSemana) {
  const { data: alocs, error: alocsErr } = await supabase
    .from('programacao_semanal')
    .select('dias')
    .eq('projeto_id', projetoId)
    .eq('data_semana', dataSemana)
  if (alocsErr) { console.error('syncEfetivo alocs:', alocsErr.message); return }

  const mobilizados = (alocs ?? []).filter(a => (a.dias || 0) > 0).length

  const { data: ef, error: efErr } = await supabase
    .from('efetivo_semana')
    .select('previstos')
    .eq('projeto_id', projetoId)
    .eq('data_semana', dataSemana)
    .maybeSingle()
  if (efErr) { console.error('syncEfetivo efetivo:', efErr.message); return }

  const { error: upsertErr } = await supabase
    .from('efetivo_semana')
    .upsert(
      { projeto_id: projetoId, data_semana: dataSemana, previstos: ef?.previstos ?? 0, mobilizados },
      { onConflict: 'projeto_id,data_semana' }
    )
  if (upsertErr) console.error('syncEfetivo upsert:', upsertErr.message)
}

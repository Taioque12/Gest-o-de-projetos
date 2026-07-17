import { useMemo } from 'react'
import { classify, portfolioCurveOpts, projectCurveOpts } from '../utils/helpers'

export function useDashboardKPIs(projetos, curvaResp, curvaFiltro) {
  const projetoSelecionado = useMemo(() => projetos.find(p => p.id === curvaFiltro), [projetos, curvaFiltro])
  
  const projetosCurva = useMemo(() => 
    curvaResp === 'todos' ? projetos : projetos.filter(p => p.responsavel === curvaResp), 
  [projetos, curvaResp])

  const kpis = useMemo(() => {
    const base = projetoSelecionado ? [projetoSelecionado] : projetosCurva
    const vtot = base.reduce((s, p) => s + p.valor, 0)
    const prev = base.length && vtot ? base.reduce((s, p) => s + p.valor * p.prev, 0) / vtot : 0
    const real = base.length && vtot ? base.reduce((s, p) => s + p.valor * p.real, 0) / vtot : 0
    
    return {
      kpiBase: base,
      VTOT: vtot,
      wAvgPrev: prev,
      wAvgReal: real,
      desv: real - prev,
      clsDesv: classify(prev, real),
      nC: base.filter(p => classify(p.prev, p.real).k === 'vermelho').length,
      nA: base.filter(p => classify(p.prev, p.real).k === 'amarelo').length,
      kpiLabel: projetoSelecionado ? `OS ${projetoSelecionado.os}` : (curvaResp !== 'todos' ? curvaResp : 'portfólio completo')
    }
  }, [projetoSelecionado, projetosCurva, curvaResp])

  const curveOpts = useMemo(() => projetosCurva.length
    ? (projetoSelecionado ? projectCurveOpts(projetoSelecionado) : portfolioCurveOpts(projetosCurva))
    : null, [projetosCurva, projetoSelecionado])

  return { projetoSelecionado, projetosCurva, curveOpts, ...kpis }
}

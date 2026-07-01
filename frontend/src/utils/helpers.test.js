import { describe, it, expect } from 'vitest'
import {
  classify, clamp, fmt, valorFmt, parse, priorizarTarefas, classificarTarefas,
  T, prepararProjeto, plannedPct, realizadoPct, projectCurveOpts, portfolioCurveOpts,
} from './helpers'

// Formata um Date pra string YYYY-MM-DD local (mesmo formato que `parse` espera),
// pra montar fixtures de projeto relativos a "hoje" sem depender da data real do teste.
function toISODateLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

describe('classify', () => {
  it('verde quando desvio até -5pp', () => {
    expect(classify(80, 75).k).toBe('verde')
    expect(classify(80, 80).k).toBe('verde')
    expect(classify(80, 85).k).toBe('verde')
  })
  it('amarelo quando desvio entre -5 e -10pp', () => {
    expect(classify(80, 73).k).toBe('amarelo')
  })
  it('vermelho quando desvio maior que -10pp', () => {
    expect(classify(80, 60).k).toBe('vermelho')
  })
})

describe('clamp', () => {
  it('limita valor entre min e max', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
})

describe('fmt', () => {
  it('formata número no padrão pt-BR com casas decimais', () => {
    expect(fmt(1234.5, 1)).toBe('1.234,5')
    expect(fmt(10, 0)).toBe('10')
  })
})

describe('valorFmt', () => {
  it('formata em milhões, mil ou reais conforme magnitude', () => {
    expect(valorFmt(2_500_000)).toBe('R$ 2,50 mi')
    expect(valorFmt(15_000)).toBe('R$ 15 mil')
    expect(valorFmt(500)).toBe('R$ 500')
  })
})

describe('parse', () => {
  it('converte string YYYY-MM-DD em Date local (sem timezone shift)', () => {
    const d = parse('2026-03-15')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2) // março = índice 2
    expect(d.getDate()).toBe(15)
  })
})

describe('classificarTarefas / priorizarTarefas', () => {
  const hoje = '2026-06-30'
  const tarefas = [
    { nome: 'A — concluída',     previsto: 100, fim: '2026-06-01' },
    { nome: 'B — atrasada',      previsto: 50,  fim: '2026-06-10' },
    { nome: 'C — em andamento',  previsto: 40,  fim: '2026-07-15' },
    { nome: 'D — não iniciada',  previsto: 0,   fim: '2026-08-01' },
    { nome: 'E — atrasada 2',    previsto: 10,  fim: '2026-06-15' },
  ]

  it('classifica corretamente cada tarefa por status', () => {
    const { atrasadas, emAndamento, naoIniciadas, concluidas } = classificarTarefas(tarefas, hoje)
    expect(atrasadas.map(t => t.nome)).toEqual(['B — atrasada', 'E — atrasada 2'])
    expect(emAndamento.map(t => t.nome)).toEqual(['C — em andamento'])
    expect(naoIniciadas.map(t => t.nome)).toEqual(['D — não iniciada'])
    expect(concluidas.map(t => t.nome)).toEqual(['A — concluída'])
  })

  it('prioriza atrasadas > em andamento > não iniciadas > concluídas', () => {
    const ordenadas = priorizarTarefas(tarefas, hoje, 10)
    expect(ordenadas.map(t => t.nome)).toEqual([
      'B — atrasada', 'E — atrasada 2', 'C — em andamento', 'D — não iniciada', 'A — concluída',
    ])
  })

  it('respeita o limite máximo, cortando concluídas primeiro', () => {
    const ordenadas = priorizarTarefas(tarefas, hoje, 2)
    expect(ordenadas).toHaveLength(2)
    expect(ordenadas.map(t => t.nome)).toEqual(['B — atrasada', 'E — atrasada 2'])
  })

  it('com mais de 150 tarefas, mantém atrasadas mesmo cortando o resto (regressão do bug MAX_TAREFAS)', () => {
    const muitas = Array.from({ length: 180 }, (_, i) => ({
      nome: `Tarefa ${i}`,
      previsto: i % 5 === 0 ? 100 : 50,
      fim: i % 7 === 0 ? '2026-01-01' : '2026-12-01', // algumas atrasadas
    }))
    const resultado = priorizarTarefas(muitas, hoje, 150)
    expect(resultado).toHaveLength(150)
    const atrasadasNoResultado = resultado.filter(t => t.fim < hoje && t.previsto < 100)
    const atrasadasTotais = muitas.filter(t => t.fim < hoje && t.previsto < 100)
    expect(atrasadasNoResultado).toHaveLength(atrasadasTotais.length) // nenhuma atrasada foi cortada
  })
})

describe('T (smoothstep — curva S)', () => {
  it('vale 0 no início e 1 no fim', () => {
    expect(T(0)).toBe(0)
    expect(T(1)).toBe(1)
  })
  it('satura fora do intervalo [0,1]', () => {
    expect(T(-0.5)).toBe(0)
    expect(T(1.5)).toBe(1)
  })
  it('é simétrica em torno de 0.5 (T(0.5) = 0.5)', () => {
    expect(T(0.5)).toBeCloseTo(0.5, 10)
  })
  it('é monotonicamente crescente entre 0 e 1', () => {
    const pontos = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1]
    for (let i = 1; i < pontos.length; i++) {
      expect(T(pontos[i])).toBeGreaterThanOrEqual(T(pontos[i - 1]))
    }
  })
})

describe('prepararProjeto', () => {
  it('calcula _tau ≈ 0.5 pra um projeto na metade do prazo', () => {
    const inicio = addDays(new Date(), -30)
    const fim = addDays(new Date(), 30)
    const p = prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 50, real: 45 })
    expect(p._tau).toBeCloseTo(0.5, 1)
    expect(p._Tc).toBeCloseTo(T(p._tau), 5)
  })

  it('satura _tau em 1 quando o projeto já terminou', () => {
    const inicio = addDays(new Date(), -60)
    const fim = addDays(new Date(), -10)
    const p = prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 100, real: 90 })
    expect(p._tau).toBe(1)
  })

  it('satura _tau em 0 quando o projeto ainda não começou', () => {
    const inicio = addDays(new Date(), 10)
    const fim = addDays(new Date(), 60)
    const p = prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 0, real: 0 })
    expect(p._tau).toBe(0)
  })
})

describe('plannedPct / realizadoPct', () => {
  it('planejado chega a 100% exatamente no fim do projeto', () => {
    const inicio = addDays(new Date(), -30)
    const fim = addDays(new Date(), 30)
    const p = prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 50, real: 40 })
    expect(plannedPct(p, p._e)).toBeCloseTo(100, 5)
  })

  it('planejado é 0% no início do projeto', () => {
    const inicio = addDays(new Date(), -30)
    const fim = addDays(new Date(), 30)
    const p = prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 50, real: 40 })
    expect(plannedPct(p, p._s)).toBeCloseTo(0, 5)
  })

  it('planejado em "hoje" bate com o avanço previsto do projeto (p.prev)', () => {
    const inicio = addDays(new Date(), -30)
    const fim = addDays(new Date(), 30)
    const p = prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 50, real: 40 })
    expect(plannedPct(p, Date.now())).toBeCloseTo(p.prev, 0)
  })

  it('realizado nunca ultrapassa 100%, mesmo com avanço real alto perto do início', () => {
    const inicio = addDays(new Date(), -5)
    const fim = addDays(new Date(), 55)
    const p = prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 90, real: 95 })
    expect(realizadoPct(p, Date.now())).toBeLessThanOrEqual(100)
  })

  it('realizado é 0 antes do projeto começar (_Tc <= 0)', () => {
    const inicio = addDays(new Date(), 10)
    const fim = addDays(new Date(), 60)
    const p = prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 0, real: 0 })
    expect(realizadoPct(p, p._s)).toBe(0)
  })
})

describe('projectCurveOpts', () => {
  it('a curva planejada termina em 100% e a realizada bate com p.real no ponto de hoje', () => {
    const inicio = addDays(new Date(), -30)
    const fim = addDays(new Date(), 30)
    const p = prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 55, real: 48 })
    const opts = projectCurveOpts(p)

    const ultimoPlanejado = opts.plannedPts[opts.plannedPts.length - 1]
    expect(ultimoPlanejado.x).toBe(1)
    expect(ultimoPlanejado.y).toBeCloseTo(100, 5)

    const ultimoReal = opts.actualPts[opts.actualPts.length - 1]
    expect(ultimoReal.y).toBe(p.real)
    expect(opts.todayX).toBeCloseTo(p._tau, 5)
    expect(opts.prevToday).toBe(p.prev)
    expect(opts.realToday).toBe(p.real)
  })

  it('inclui pelo menos um tick e o último tick fecha em x=1', () => {
    const inicio = addDays(new Date(), -60)
    const fim = addDays(new Date(), 60)
    const p = prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 50, real: 50 })
    const opts = projectCurveOpts(p)
    expect(opts.ticks.length).toBeGreaterThan(0)
    expect(opts.ticks[opts.ticks.length - 1].x).toBe(1)
  })
})

describe('portfolioCurveOpts', () => {
  it('calcula a média ponderada por valor corretamente', () => {
    const inicio = addDays(new Date(), -30)
    const fim = addDays(new Date(), 30)
    const projetos = [
      prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 80, real: 70, valor: 100 }),
      prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 20, real: 10, valor: 300 }),
    ]
    const opts = portfolioCurveOpts(projetos)

    // Média ponderada: (80*100 + 20*300) / 400 = 35 | (70*100 + 10*300) / 400 = 25
    expect(opts.wAvgPrev).toBeCloseTo(35, 5)
    expect(opts.wAvgReal).toBeCloseTo(25, 5)
    expect(opts.VTOT).toBe(400)
  })

  it('a curva planejada do portfólio também termina em 100%', () => {
    const inicio = addDays(new Date(), -30)
    const fim = addDays(new Date(), 30)
    const projetos = [
      prepararProjeto({ inicio: toISODateLocal(inicio), fim: toISODateLocal(fim), prev: 60, real: 55, valor: 100 }),
    ]
    const opts = portfolioCurveOpts(projetos)
    const ultimoPlanejado = opts.plannedPts[opts.plannedPts.length - 1]
    expect(ultimoPlanejado.x).toBe(1)
    expect(ultimoPlanejado.y).toBeCloseTo(100, 5)
  })
})

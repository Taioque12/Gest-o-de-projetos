import { describe, it, expect } from 'vitest'
import { classify, clamp, fmt, valorFmt, parse, priorizarTarefas, classificarTarefas } from './helpers'

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

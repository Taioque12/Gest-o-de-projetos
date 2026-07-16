import { describe, it, expect } from 'vitest'
import { gerarStatusExecutivo } from './managementTalk'

describe('gerarStatusExecutivo', () => {
  const projetoVerde = {
    os: '1001',
    nome: 'Reforma Estrutural',
    cliente: 'Empresa A',
    prev: 50,
    real: 52,
    valor: 100000,
    responsavel: 'João Silva',
    acao: 'Continuar monitoramento diário.'
  }

  const projetoVermelho = {
    os: '1002',
    nome: 'Migração de Cloud',
    cliente: 'Empresa B',
    prev: 80,
    real: 60,
    valor: 250000,
    responsavel: 'Ana Pereira',
    acao: 'Contratar recurso extra para acelerar frentes atrasadas.'
  }

  it('deve gerar texto curto para o slack com OS dentro da meta', () => {
    const txt = gerarStatusExecutivo(projetoVerde, 'slack')
    expect(txt).toContain('dentro da meta')
    expect(txt).toContain('OS 1001')
    expect(txt).toContain('João Silva')
    expect(txt).toContain('Desvio: 2.0')
  })

  it('deve gerar texto curto para o slack com OS crítica', () => {
    const txt = gerarStatusExecutivo(projetoVermelho, 'slack')
    expect(txt).toContain('com desvio crítico')
    expect(txt).toContain('Desvio: 20.0')
    expect(txt).toContain('Contratar recurso extra')
  })

  it('deve gerar texto longo para JIRA evidenciando o valor e o cliente', () => {
    const txt = gerarStatusExecutivo(projetoVermelho, 'jira')
    expect(txt).toContain('Status: Crítico')
    expect(txt).toContain('Empresa B - Migração de Cloud')
    expect(txt).toContain('R$ 250 mil')
    expect(txt).toContain('Próximos Passos:')
  })
})

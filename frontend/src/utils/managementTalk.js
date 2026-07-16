import { classify, valorFmt } from './helpers'

export function gerarStatusExecutivo(projeto, formato = 'slack') {
  const c = classify(projeto.prev, projeto.real)
  const desv = Math.abs(projeto.real - projeto.prev).toFixed(1)
  const situacao = c.k === 'verde' ? 'dentro da meta' : c.k === 'amarelo' ? 'com atenção necessária' : 'com desvio crítico'

  if (formato === 'slack') {
    return `*OS ${projeto.os} · ${projeto.nome} está ${situacao} (${c.lbl}).*

• Previsto: ${projeto.prev}%, Realizado: ${projeto.real}% (Desvio: ${desv} p.p.)
• Impacto/Ação: ${projeto.acao}
• Owner: ${projeto.responsavel}`
  }

  // formato JIRA / longo
  return `*Status: ${c.lbl}*

*Impacto:*
A OS ${projeto.os} (${projeto.cliente} - ${projeto.nome}) apresenta um avanço de ${projeto.real}% contra ${projeto.prev}% planejado (Desvio de ${desv} p.p.).
O projeto está orçado em ${valorFmt(projeto.valor)}.

*O que aconteceu / Estado:*
${projeto.acao}

*Owner:*
${projeto.responsavel}

*Próximos Passos:*
Verificar cronograma detalhado e acompanhar alocação da equipe.`
}

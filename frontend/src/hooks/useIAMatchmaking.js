import { useState, useRef } from 'react'

/**
 * MVP de Inteligência Artificial para Matchmaking de Equipes.
 * Como ainda não temos o AgentDB/LLM conectado, este MVP utiliza
 * uma eurística matemática que simula a IA avaliando as habilidades.
 */
export function useIAMatchmaking(funcionarios, projetos) {
  const [loading, setLoading] = useState(false)
  const [sugestoes, setSugestoes] = useState(null)
  const requestIdRef = useRef(0)
  
  const analisarProjeto = async (projetoId) => {
    const currentRequestId = ++requestIdRef.current
    setLoading(true)
    setSugestoes(null)
    
    // Simula delay de requisição de IA
    await new Promise(r => setTimeout(r, 1500))
    
    const projeto = projetos.find(p => p.id === projetoId)
    if (!projeto) {
      setLoading(false)
      return null
    }

    // Heurística do MVP: 
    // Identificar a "habilidade principal" necessária baseada no nome do projeto (mock).
    // Se não achar, pega a média geral de todas as habilidades cadastradas.
    let habilidadeChave = null
    const nomeProj = projeto.nome.toLowerCase()
    
    if (nomeProj.includes('elétric') || nomeProj.includes('ilumina')) habilidadeChave = 'hab_eletrica'
    if (nomeProj.includes('rede') || nomeProj.includes('infra')) habilidadeChave = 'hab_infra'
    if (nomeProj.includes('projeto') || nomeProj.includes('gerencia')) habilidadeChave = 'hab_projetos'

    // Avaliar funcionários
    const scores = funcionarios.map(f => {
      let nota = 0
      let justificativa = ''
      
      const avs = f.avaliacoes || {}
      
      if (habilidadeChave && avs[habilidadeChave]) {
        nota = parseFloat(avs[habilidadeChave] || 0)
        justificativa = `Excelente alinhamento com a necessidade principal do projeto (Nota: ${nota}).`
      } else {
        // Média de todas as notas se não tiver habilidade específica
        const notas = Object.values(avs).map(n => parseFloat(n || 0))
        nota = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length) : 0
        justificativa = `Sugerido pela média geral de competências técnicas (Média: ${nota.toFixed(1)}).`
      }
      
      const matchScore = Math.round((nota / 10) * 100)
      
      return {
        funcionario: f,
        matchScore,
        justificativa
      }
    })
    
    // Filtrar os melhores (acima de 60%) e ordenar desc
    const ranking = scores
      .filter(s => s.matchScore >= 60)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5) // Top 5
      
    const resultado = {
      projeto,
      habilidadePrincipalSugerida: habilidadeChave || 'Multidisciplinar',
      candidatos: ranking
    }
    
    // Evita race condition: só atualiza se for a última requisição feita
    if (currentRequestId === requestIdRef.current) {
      setSugestoes(resultado)
      setLoading(false)
    }
    return resultado
  }

  return {
    analisarProjeto,
    loading,
    sugestoes,
    limparSugestoes: () => setSugestoes(null)
  }
}

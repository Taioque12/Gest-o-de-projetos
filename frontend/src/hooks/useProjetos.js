import { useProjetosQuery } from './useProjetosQuery'
import { useProjetosMutations } from './useProjetosMutations'
import { useProjetosRealtime } from './useProjetosRealtime'

export function useProjetos(perfil, userId, userEmail) {
  const { projetos, atualizacoes, loading, usandoMock, refetch } = useProjetosQuery(perfil, userId)
  
  const mutations = useProjetosMutations(userId, userEmail, refetch)
  
  useProjetosRealtime(refetch)

  return {
    projetos,
    atualizacoes,
    loading,
    usandoMock,
    refetch,
    ...mutations
  }
}

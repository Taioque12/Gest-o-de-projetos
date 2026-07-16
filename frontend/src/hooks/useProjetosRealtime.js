import { useEffect } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useProjetosRealtime(fetchProjetos) {
  useEffect(() => {
    if (!supabaseConfigurado) return
    const channel = supabase
      .channel(`db-changes-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projetos' }, fetchProjetos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atualizacoes_semana' }, fetchProjetos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'efetivo_semana' }, fetchProjetos)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchProjetos])
}

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotificacoes()

    const sub = supabase
      .channel('notif-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes' }, () => {
        fetchNotificacoes()
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  async function fetchNotificacoes() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('lida', false)
      .order('criado_em', { ascending: false })
      .limit(5)

    if (!error && data) {
      setNotificacoes(data)
    }
    setLoading(false)
  }

  async function marcarLida(id) {
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    if (!error) {
      setNotificacoes(ns => ns.filter(n => n.id !== id))
    }
  }

  return { notificacoes, loading, marcarLida }
}

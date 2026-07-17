import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotificacoes()

    let sub = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      sub = supabase
        .channel('notif-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `usuario_id=eq.${session.user.id}` }, (payload) => {
          setNotificacoes(prev => [payload.new, ...prev].slice(0, 5))
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificacoes', filter: `usuario_id=eq.${session.user.id}` }, (payload) => {
          if (payload.new.lida) {
            setNotificacoes(prev => prev.filter(n => n.id !== payload.new.id))
          }
        })
        .subscribe()
    })

    return () => { if (sub) supabase.removeChannel(sub) }
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

    if (error) {
      console.error('Erro ao buscar notificações:', error)
    } else if (data) {
      setNotificacoes(data)
    }
    setLoading(false)
  }

  async function marcarLida(id) {
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    if (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    } else {
      setNotificacoes(ns => ns.filter(n => n.id !== id))
    }
  }

  return { notificacoes, loading, marcarLida }
}

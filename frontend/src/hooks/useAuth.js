import { useState, useEffect } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState('admin')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigurado) { setLoading(false); return }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchPerfil(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchPerfil(session.user.id)
      else { setPerfil('admin'); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchPerfil(userId) {
    try {
      const { data } = await supabase
        .from('usuarios')
        .select('perfil')
        .eq('id', userId)
        .single()
      setPerfil(data?.perfil ?? 'admin')
    } catch {
      setPerfil('admin')
    }
    setLoading(false)
  }

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  return { user, perfil, loading, signIn, signOut }
}

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

  // Busca perfil usando auth.uid() — usuarios.id deve ser igual ao auth.uid()
  async function fetchPerfil(authUid) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('perfil')
        .eq('id', authUid)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        // Usuário existe no Auth mas não na tabela usuarios — cria com perfil padrão
        await supabase.from('usuarios').insert({ id: authUid, perfil: 'equipe' })
        setPerfil('equipe')
      } else {
        setPerfil(data.perfil ?? 'equipe')
      }
    } catch {
      // Se RLS bloquear (ex: policy ainda não criada), assume equipe como fallback seguro
      setPerfil('equipe')
    }
    setLoading(false)
  }

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  return { user, perfil, loading, signIn, signOut }
}

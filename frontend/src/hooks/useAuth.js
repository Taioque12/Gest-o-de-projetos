import { useState, useEffect } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState('cliente')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Modo demo (sem Supabase): mantém UI completa de admin
    if (!supabaseConfigurado) { setPerfil('admin'); setLoading(false); return }

    let montado = true

    // onAuthStateChange já dispara com a sessão atual (INITIAL_SESSION) ao
    // inscrever — dispensa um getSession() separado, que duplicava a busca
    // de perfil no mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (!montado) return
      setUser(session?.user ?? null)
      if (session?.user) fetchPerfil(session.user.id, () => montado)
      else { setPerfil('cliente'); setLoading(false) }
    })

    return () => { montado = false; subscription.unsubscribe() }
  }, [])

  // Busca perfil usando auth.uid() — usuarios.id deve ser igual ao auth.uid()
  async function fetchPerfil(authUid, aindaMontado) {
    let perfil = 'cliente'
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('perfil')
        .eq('id', authUid)
        .maybeSingle()

      if (error) throw error

      // Linha em usuarios é criada pelo trigger on_auth_user_created;
      // se ainda não existir, assume o menor privilégio em vez de inserir daqui
      perfil = data?.perfil ?? 'cliente'
    } catch {
      // Se RLS bloquear, assume o menor privilégio como fallback seguro
      perfil = 'cliente'
    }
    if (aindaMontado()) { setPerfil(perfil); setLoading(false) }
  }

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  return { user, perfil, loading, signIn, signOut }
}

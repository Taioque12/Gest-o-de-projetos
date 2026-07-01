import { useState, useEffect } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

export function useAuth() {
  const [user, setUser]           = useState(null)
  const [perfil, setPerfil]       = useState(null)
  const [empresaId, setEmpresaId] = useState(null)
  const [empresa, setEmpresa]     = useState(null)
  const [superAdmin, setSuperAdmin] = useState(false)
  const [empresaSuspensa, setEmpresaSuspensa] = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!supabaseConfigurado) { setLoading(false); return }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchEmpresa(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchEmpresa(session.user.id)
      else { setPerfil(null); setEmpresaId(null); setEmpresa(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchEmpresa(authUid) {
    try {
      const { data, error } = await supabase
        .from('usuarios_empresa')
        .select('perfil, empresa_id, empresas(*), super_admin')
        .eq('auth_user_id', authUid)
        .eq('ativo', true)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setPerfil(data.perfil)
        setEmpresaId(data.empresa_id)
        setEmpresa(data.empresas)
        setSuperAdmin(!!data.super_admin)
        // usuarios_empresa.ativo (vínculo da pessoa) já é filtrado acima —
        // aqui checamos empresas.ativo (status da empresa no plano/pagamento).
        setEmpresaSuspensa(data.empresas?.ativo === false)
        localStorage.setItem('empresa_id', data.empresa_id)
      } else {
        // Sem empresa — onboarding necessário
        setPerfil(null)
        setEmpresaId(null)
        setEmpresa(null)
        setSuperAdmin(false)
        setEmpresaSuspensa(false)
        localStorage.removeItem('empresa_id')
      }
    } catch {
      setPerfil(null)
      setEmpresaId(null)
    }
    setLoading(false)
  }

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => {
    localStorage.removeItem('empresa_id')
    return supabase.auth.signOut()
  }

  const refreshEmpresa = () => {
    if (user) fetchEmpresa(user.id)
  }

  return { user, perfil, empresaId, empresa, superAdmin, empresaSuspensa, loading, signIn, signOut, refreshEmpresa }
}

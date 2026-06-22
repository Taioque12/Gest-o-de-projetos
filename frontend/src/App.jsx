import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { supabaseConfigurado } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { user, perfil, loading, signIn, signOut } = useAuth()
  const [view, setView] = useState('dashboard')

  if (loading) return <div className="loading-screen">Carregando...</div>

  if (supabaseConfigurado && !user) {
    return <Login onSignIn={signIn} />
  }

  return (
    <Dashboard
      user={user}
      perfil={perfil}
      onSignOut={signOut}
      view={view}
      setView={setView}
    />
  )
}

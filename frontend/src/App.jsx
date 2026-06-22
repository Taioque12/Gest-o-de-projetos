import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { supabaseConfigurado } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Equipes from './pages/Equipes'

export default function App() {
  const { user, perfil, loading, signIn, signOut } = useAuth()
  const [view, setView] = useState('dashboard')

  if (loading) return <div className="loading-screen">Carregando...</div>

  if (supabaseConfigurado && !user) {
    return <Login onSignIn={signIn} />
  }

  if (view === 'equipes') {
    return (
      <Equipes
        user={user}
        perfil={perfil}
        onSignOut={signOut}
        onChangeView={setView}
      />
    )
  }

  return (
    <Dashboard
      user={user}
      perfil={perfil}
      onSignOut={signOut}
      view={view}
      setView={setView}
      onChangeView={setView}
    />
  )
}

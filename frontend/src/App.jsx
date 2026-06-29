import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { supabaseConfigurado } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Equipes from './pages/Equipes'
import Acessos from './pages/Acessos'
import Planos from './pages/Planos'
import ClienteView from './pages/ClienteView'
import OnboardingEmpresa from './pages/OnboardingEmpresa'

export default function App() {
  const { user, perfil, empresaId, empresa, loading, signIn, signOut, refreshEmpresa } = useAuth()
  const [view, setView] = useState('dashboard')

  if (loading) return <div className="loading-screen">Carregando...</div>

  if (supabaseConfigurado && !user) {
    return <Login onSignIn={signIn} />
  }

  // Usuário autenticado mas sem empresa — precisa criar ou aguardar convite
  if (supabaseConfigurado && user && !empresaId) {
    return <OnboardingEmpresa user={user} onEmpresaCriada={refreshEmpresa} onSignOut={signOut} />
  }

  if (view === 'equipes') {
    return (
      <Equipes
        user={user}
        perfil={perfil}
        empresaId={empresaId}
        onSignOut={signOut}
        onChangeView={setView}
      />
    )
  }

  if (perfil === 'cliente') {
    return (
      <ClienteView
        user={user}
        perfil={perfil}
        empresaId={empresaId}
        onSignOut={signOut}
        onChangeView={setView}
      />
    )
  }

  if (view === 'acessos' && perfil === 'admin') {
    return (
      <Acessos
        user={user}
        perfil={perfil}
        empresaId={empresaId}
        onSignOut={signOut}
        onChangeView={setView}
      />
    )
  }

  if (view === 'planos' && perfil === 'admin') {
    return (
      <Planos
        user={user}
        perfil={perfil}
        empresaId={empresaId}
        empresa={empresa}
        onSignOut={signOut}
        onChangeView={setView}
      />
    )
  }

  return (
    <Dashboard
      user={user}
      perfil={perfil}
      empresaId={empresaId}
      empresa={empresa}
      onSignOut={signOut}
      view={view}
      setView={setView}
      onChangeView={setView}
    />
  )
}

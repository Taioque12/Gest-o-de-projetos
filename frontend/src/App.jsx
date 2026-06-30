import { useState, lazy, Suspense } from 'react'
import { useAuth } from './hooks/useAuth'
import { supabaseConfigurado } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ClienteView from './pages/ClienteView'
import OnboardingEmpresa from './pages/OnboardingEmpresa'
import ChunkErrorBoundary from './components/ChunkErrorBoundary'

const Equipes = lazy(() => import('./pages/Equipes'))
const Acessos = lazy(() => import('./pages/Acessos'))
const Planos  = lazy(() => import('./pages/Planos'))

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
      <ChunkErrorBoundary>
        <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
          <Equipes
            user={user}
            perfil={perfil}
            empresaId={empresaId}
            onSignOut={signOut}
            onChangeView={setView}
          />
        </Suspense>
      </ChunkErrorBoundary>
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
      <ChunkErrorBoundary>
        <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
          <Acessos
            user={user}
            perfil={perfil}
            empresaId={empresaId}
            onSignOut={signOut}
            onChangeView={setView}
          />
        </Suspense>
      </ChunkErrorBoundary>
    )
  }

  if (view === 'planos' && perfil === 'admin') {
    return (
      <ChunkErrorBoundary>
        <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
          <Planos
            user={user}
            perfil={perfil}
            empresaId={empresaId}
            empresa={empresa}
            onSignOut={signOut}
            onChangeView={setView}
          />
        </Suspense>
      </ChunkErrorBoundary>
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

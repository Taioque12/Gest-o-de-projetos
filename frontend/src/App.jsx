import { useState, lazy, Suspense } from 'react'
import { useAuth } from './hooks/useAuth'
import { supabaseConfigurado } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ClienteView from './pages/ClienteView'
import ChunkErrorBoundary from './components/ChunkErrorBoundary'

const Equipes = lazy(() => import('./pages/Equipes'))
const Acessos = lazy(() => import('./pages/Acessos'))

export default function App() {
  const { user, perfil, loading, signIn, signOut } = useAuth()
  const [view, setView] = useState('dashboard')

  if (loading) return <div className="loading-screen">Carregando...</div>

  if (supabaseConfigurado && !user) {
    return <Login onSignIn={signIn} />
  }

  if (view === 'equipes') {
    return (
      <ChunkErrorBoundary>
        <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
          <Equipes
            user={user}
            perfil={perfil}
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
      onSignOut={signOut}
      view={view}
      setView={setView}
      onChangeView={setView}
    />
  )
}

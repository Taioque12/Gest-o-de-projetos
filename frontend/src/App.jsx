import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { supabaseConfigurado } from './supabase'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import ClienteView from './pages/ClienteView'
import ChunkErrorBoundary from './components/ChunkErrorBoundary'

const Equipes = lazy(() => import('./pages/Equipes'))
const Acessos = lazy(() => import('./pages/Acessos'))

function LazyPage({ children }) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
        {children}
      </Suspense>
    </ChunkErrorBoundary>
  )
}

function AppInner() {
  const { user, perfil, loading, signIn, signOut } = useAuth()

  if (loading) return <div className="loading-screen">Carregando...</div>

  if (supabaseConfigurado && !user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Login onSignIn={signIn} />} />
      </Routes>
    )
  }

  // Cliente tem visão própria, sem acesso às rotas administrativas —
  // renderizado fora de <Routes> pra nunca expor Equipes/Acessos por URL
  // direta, independente do que estiver na barra de endereço.
  if (perfil === 'cliente') {
    return <ClienteView user={user} perfil={perfil} onSignOut={signOut} />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={<Dashboard user={user} perfil={perfil} onSignOut={signOut} />}
      />
      <Route
        path="/equipes"
        element={
          <LazyPage>
            <Equipes user={user} perfil={perfil} onSignOut={signOut} />
          </LazyPage>
        }
      />
      <Route
        path="/acessos"
        element={
          perfil === 'admin'
            ? <LazyPage><Acessos user={user} perfil={perfil} onSignOut={signOut} /></LazyPage>
            : <Navigate to="/dashboard" replace />
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}

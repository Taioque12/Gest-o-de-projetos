import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { supabaseConfigurado } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ClienteView from './pages/ClienteView'
import OnboardingEmpresa from './pages/OnboardingEmpresa'
import ChunkErrorBoundary from './components/ChunkErrorBoundary'

const Equipes  = lazy(() => import('./pages/Equipes'))
const Acessos  = lazy(() => import('./pages/Acessos'))
const Planos   = lazy(() => import('./pages/Planos'))
const Operador = lazy(() => import('./pages/Operador'))

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
  const { user, perfil, empresaId, empresa, superAdmin, loading, signIn, signOut, refreshEmpresa } = useAuth()

  if (loading) return <div className="loading-screen">Carregando...</div>

  if (supabaseConfigurado && !user) {
    return <Login onSignIn={signIn} />
  }

  // Usuário autenticado mas sem empresa — precisa criar ou aguardar convite
  if (supabaseConfigurado && user && !empresaId) {
    return <OnboardingEmpresa user={user} onEmpresaCriada={refreshEmpresa} onSignOut={signOut} />
  }

  // Cliente tem visão própria, sem acesso às rotas administrativas —
  // renderizado fora de <Routes> pra nunca expor Equipes/Acessos/Planos/
  // Operador por URL direta, independente do que estiver na barra de endereço.
  if (perfil === 'cliente') {
    return <ClienteView user={user} perfil={perfil} empresaId={empresaId} onSignOut={signOut} />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <Dashboard
            user={user}
            perfil={perfil}
            empresaId={empresaId}
            empresa={empresa}
            superAdmin={superAdmin}
            onSignOut={signOut}
          />
        }
      />
      <Route
        path="/equipes"
        element={
          <LazyPage>
            <Equipes user={user} perfil={perfil} empresaId={empresaId} onSignOut={signOut} />
          </LazyPage>
        }
      />
      <Route
        path="/acessos"
        element={
          perfil === 'admin'
            ? <LazyPage><Acessos user={user} perfil={perfil} empresaId={empresaId} onSignOut={signOut} /></LazyPage>
            : <Navigate to="/dashboard" replace />
        }
      />
      <Route
        path="/planos"
        element={
          perfil === 'admin'
            ? <LazyPage><Planos user={user} perfil={perfil} empresaId={empresaId} empresa={empresa} onSignOut={signOut} /></LazyPage>
            : <Navigate to="/dashboard" replace />
        }
      />
      <Route
        path="/operador"
        element={
          superAdmin
            ? <LazyPage><Operador perfil={perfil} onSignOut={signOut} /></LazyPage>
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

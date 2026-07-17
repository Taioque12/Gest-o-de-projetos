import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const view = location.pathname.replace(/^\//, '') || 'dashboard'
  const { setFiltro, setCurvaFiltro } = useAppStore()
  const { user } = useAuth()
  
  const userName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'
  const userInitials = userName.substring(0, 2).toUpperCase()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => { setFiltro('todos'); setCurvaFiltro('todos'); navigate('/dashboard') }}>
        P
      </div>
      
      <nav className="side-nav">
        <div className={`side-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('/dashboard')} data-label="Dashboard">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>
        </div>
        <div className={`side-item ${view === 'kanban' ? 'active' : ''}`} onClick={() => navigate('/kanban')} data-label="Kanban Global">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </div>
        <div className={`side-item ${view === 'equipes' ? 'active' : ''}`} onClick={() => navigate('/equipes')} data-label="Equipes">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div className={`side-item ${view === 'acessos' ? 'active' : ''}`} onClick={() => navigate('/acessos')} data-label="Configurações">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
      </nav>

      <div className="side-avatar">
        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=10b981&color=fff`} alt="User" />
        <span>{userName}</span>
      </div>
    </aside>
  )
}

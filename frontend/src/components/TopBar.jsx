import { useLocation } from 'react-router-dom'
import { supabaseConfigurado } from '../supabase'

export default function TopBar({ onNovoProjeto, onSignOut }) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const location = useLocation()
  const view = location.pathname.replace(/^\//, '') || 'dashboard'
  
  const title = view === 'dashboard' ? 'Project Dashboard' : view.charAt(0).toUpperCase() + view.slice(1)

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1>{title}</h1>
        <span>Overview</span>
      </div>
      <div className="topbar-right">
        <div className="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar…" />
          <kbd>⌘K</kbd>
        </div>
        
        <button className="top-icon-btn" title="Notificações">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span className="notif-dot"></span>
        </button>
        
        {onNovoProjeto && (
          <button className="btn-new" onClick={onNovoProjeto}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </button>
        )}

        <div className="top-date">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {hoje}
        </div>
        
        {supabaseConfigurado && (
           <button className="top-icon-btn" title="Sair" onClick={onSignOut}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
           </button>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabaseConfigurado } from '../supabase'

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return [dark, setDark]
}

export default function Header({ perfil, onSignOut, onUpload, onNovoProjeto, onAtualizarSemanal, onRelatorio, view, onChangeView }) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const [dark, setDark] = useTheme()

  return (
    <header>
      <div className="head-inner">

        {/* Marca */}
        <div className="brand" onClick={() => onChangeView?.('dashboard')} style={{ cursor: onChangeView ? 'pointer' : 'default' }}>
          <div className="logo">MA</div>
          <div>
            <h1>MA CONEGLIAN · Gestão de Projetos</h1>
            <p>Engenharia Elétrica · instalações, automação e comissionamento</p>
          </div>
        </div>

        {/* Divisor */}
        {onChangeView && <div className="head-divider" />}

        {/* Navegação entre abas */}
        {onChangeView && (
          <div className="nav-tabs">
            <button
              className={`nav-tab${view === 'dashboard' ? ' active' : ''}`}
              onClick={() => onChangeView('dashboard')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              Dashboard
            </button>
            <button
              className={`nav-tab${view === 'equipes' ? ' active' : ''}`}
              onClick={() => onChangeView('equipes')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Equipes
            </button>
          </div>
        )}

        <div className="head-spacer" />

        {/* Lado direito */}
        <div className="head-right">
          {!supabaseConfigurado && (
            <span className="badge-fic">Dados fictícios</span>
          )}

          <div className="updated">
            Atualização semanal<b>{hoje}</b>
          </div>

          {onNovoProjeto && (
            <button className="btn btn-ghost" onClick={onNovoProjeto}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova OS
            </button>
          )}
          {(perfil === 'admin' || perfil === 'equipe') && onAtualizarSemanal && (
            <button className="btn btn-ghost" onClick={onAtualizarSemanal}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Semana
            </button>
          )}
          {(perfil === 'admin' || perfil === 'equipe') && onUpload && (
            <button className="btn btn-ghost" onClick={onUpload}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              XML
            </button>
          )}
          {onRelatorio && (
            <button className="btn btn-ghost" onClick={onRelatorio}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              PDF
            </button>
          )}

          <button className="btn btn-ghost" onClick={() => setDark(d => !d)} title={dark ? 'Modo claro' : 'Modo escuro'}>
            {dark
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          {supabaseConfigurado && (
            <button className="btn btn-danger" onClick={onSignOut}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

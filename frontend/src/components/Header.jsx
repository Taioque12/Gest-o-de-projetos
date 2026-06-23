import { supabaseConfigurado } from '../supabase'

export default function Header({ perfil, onSignOut, onUpload, onNovoProjeto, onAtualizarSemanal, onRelatorio, view, onChangeView }) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

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

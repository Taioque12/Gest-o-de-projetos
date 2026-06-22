import { supabaseConfigurado } from '../supabase'

export default function Header({ perfil, onSignOut, onUpload, onNovoProjeto, onAtualizarSemanal, onRelatorio, view, onChangeView }) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <header>
      <div className="head-inner">

        {/* Marca */}
        <div className="brand">
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
              📊 Dashboard
            </button>
            <button
              className={`nav-tab${view === 'equipes' ? ' active' : ''}`}
              onClick={() => onChangeView('equipes')}
            >
              👷 Equipes
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
            Referência<b>{hoje}</b>
          </div>

          {onNovoProjeto && (
            <button className="btn btn-ghost" onClick={onNovoProjeto}>
              ➕ Nova OS
            </button>
          )}
          {(perfil === 'admin' || perfil === 'equipe') && onAtualizarSemanal && (
            <button className="btn btn-ghost" onClick={onAtualizarSemanal}>
              📅 Semana
            </button>
          )}
          {(perfil === 'admin' || perfil === 'equipe') && onUpload && (
            <button className="btn btn-ghost" onClick={onUpload}>
              📂 XML
            </button>
          )}
          {onRelatorio && (
            <button className="btn btn-ghost" onClick={onRelatorio}>
              🖨️ PDF
            </button>
          )}

          {supabaseConfigurado && (
            <button className="btn btn-danger" onClick={onSignOut}>
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

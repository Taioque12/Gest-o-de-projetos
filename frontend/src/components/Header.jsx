import { supabaseConfigurado } from '../supabase'

export default function Header({ perfil, onSignOut, onUpload, onNovoProjeto, onAtualizarSemanal, onRelatorio, view, onChangeView }) {
  const hoje = new Date().toLocaleDateString('pt-BR')

  return (
    <header>
      <div className="head-inner">
        <div className="brand">
          <div className="logo">MA</div>
          <div>
            <h1>MA CONEGLIAN · Gestão de Projetos</h1>
            <p>Engenharia Elétrica · instalações, automação e comissionamento</p>
          </div>
        </div>
        <div className="head-right">
          {!supabaseConfigurado && (
            <span className="badge-fic">Dados fictícios · validação</span>
          )}

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

          <div className="updated">
            Atualização semanal<br /><b>{hoje}</b>
          </div>
          {onNovoProjeto && (
            <button className="btn btn-ghost" onClick={onNovoProjeto}>
              ➕ Nova OS
            </button>
          )}
          {(perfil === 'admin' || perfil === 'equipe') && onAtualizarSemanal && (
            <button className="btn btn-ghost" onClick={onAtualizarSemanal}>
              📅 Atualização Semanal
            </button>
          )}
          {(perfil === 'admin' || perfil === 'equipe') && onUpload && (
            <button className="btn btn-ghost" onClick={onUpload}>
              📂 Importar XML
            </button>
          )}
          {onRelatorio && (
            <button className="btn btn-ghost" onClick={onRelatorio}>
              🖨️ Relatório PDF
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

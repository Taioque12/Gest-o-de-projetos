import { Component } from 'react'

// Captura falha de carregamento de chunk lazy (ex: deploy novo no ar
// enquanto o usuário tem a aba aberta, ou internet caindo no meio do
// import()) — sem isso a tela fica branca sem nenhum aviso.
export default class ChunkErrorBoundary extends Component {
  state = { falhou: false }

  static getDerivedStateFromError() {
    return { falhou: true }
  }

  componentDidCatch(error) {
    console.error('Erro ao carregar página:', error)
  }

  render() {
    if (this.state.falhou) {
      return (
        <div className="loading-screen" style={{ flexDirection: 'column', gap: 12 }}>
          <p>Não foi possível carregar esta página.</p>
          <button
            className="btn-login"
            style={{ width: 'auto', padding: '10px 24px', margin: 0 }}
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

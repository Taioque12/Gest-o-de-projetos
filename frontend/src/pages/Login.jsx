import { useState } from 'react'

export default function Login({ onSignIn }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await onSignIn(email, senha)
    if (error) setErro(error.message === 'Invalid login credentials'
      ? 'E-mail ou senha incorretos.'
      : error.message)
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">MA</div>
        <h1>MA CONEGLIAN</h1>
        <p>Gestão de Projetos · Engenharia Elétrica</p>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="gestor@maconeglia.com"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login({ onSignIn }) {
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)
  const [modo, setModo]       = useState('login') // 'login' | 'reset'
  const [resetOk, setResetOk] = useState(false)

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

  async function handleReset(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/?reset=1',
    })
    if (error) setErro(error.message)
    else setResetOk(true)
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">GP</div>
        <h1>Gestão de Projetos</h1>
        <p>Gestão de Projetos · Engenharia Elétrica</p>

        {erro && <div className="login-error">{erro}</div>}

        {modo === 'login' ? (
          <>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Insira seu e-mail"
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
            <button
              onClick={() => { setModo('reset'); setErro('') }}
              style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--brand)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Esqueci minha senha
            </button>
          </>
        ) : resetOk ? (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>E-mail enviado!</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
              Verifique sua caixa de entrada e siga o link para redefinir sua senha.
            </p>
            <button
              onClick={() => { setModo('login'); setResetOk(false); setErro('') }}
              style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
            <form onSubmit={handleReset}>
              <div className="field">
                <label>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoFocus
                />
              </div>
              <button className="btn-login" type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>
            <button
              onClick={() => { setModo('login'); setErro('') }}
              style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Voltar ao login
            </button>
          </>
        )}
      </div>
    </div>
  )
}

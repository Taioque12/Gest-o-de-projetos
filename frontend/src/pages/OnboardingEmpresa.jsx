import { useState } from 'react'
import { supabase } from '../supabase'

export default function OnboardingEmpresa({ user, onEmpresaCriada, onSignOut }) {
  const [form, setForm] = useState({
    cnpj:              '',
    nome_empresa:      '',
    nome_responsavel:  '',
    email_responsavel: user?.email ?? '',
    telefone:          '',
  })
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function formatarCNPJ(v) {
    const n = v.replace(/\D/g, '').slice(0, 14)
    return n
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      // Gera UUID no cliente para evitar SELECT no RETURNING (bloqueado por RLS antes do vínculo)
      const empresaId = crypto.randomUUID()

      // 1. Cria empresa
      const { error: errEmp } = await supabase
        .from('empresas')
        .insert({
          id:                empresaId,
          cnpj:              form.cnpj,
          nome_empresa:      form.nome_empresa.trim(),
          nome_responsavel:  form.nome_responsavel.trim(),
          email_responsavel: form.email_responsavel.trim(),
          telefone:          form.telefone.trim() || null,
          plano:             'free',
        })

      if (errEmp) {
        if (errEmp.code === '23505') throw new Error('CNPJ já cadastrado no sistema.')
        throw errEmp
      }

      // 2. Vincula usuário como admin
      const { error: errUE } = await supabase
        .from('usuarios_empresa')
        .insert({
          auth_user_id: user.id,
          empresa_id:   empresaId,
          perfil:       'admin',
          data_aceite:  new Date().toISOString(),
        })

      if (errUE) throw errUE

      onEmpresaCriada()
    } catch (err) {
      setErro(err.message ?? 'Erro ao criar empresa. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 480 }}>
        <div className="login-logo">MA</div>
        <h1>Criar sua Empresa</h1>
        <p style={{ marginBottom: 20 }}>
          Configure sua conta para começar a usar o sistema.
        </p>

        {erro && <div className="login-error">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>CNPJ</label>
            <input
              type="text"
              value={form.cnpj}
              onChange={e => set('cnpj', formatarCNPJ(e.target.value))}
              placeholder="00.000.000/0001-00"
              required
            />
          </div>
          <div className="field">
            <label>Nome da empresa</label>
            <input
              type="text"
              value={form.nome_empresa}
              onChange={e => set('nome_empresa', e.target.value)}
              placeholder="MA CONEGLIAN Engenharia"
              required
            />
          </div>
          <div className="field">
            <label>Nome do responsável</label>
            <input
              type="text"
              value={form.nome_responsavel}
              onChange={e => set('nome_responsavel', e.target.value)}
              placeholder="João da Silva"
              required
            />
          </div>
          <div className="field">
            <label>E-mail de contato</label>
            <input
              type="email"
              value={form.email_responsavel}
              onChange={e => set('email_responsavel', e.target.value)}
              placeholder="gestor@empresa.com"
              required
            />
          </div>
          <div className="field">
            <label>Telefone (opcional)</label>
            <input
              type="text"
              value={form.telefone}
              onChange={e => set('telefone', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar empresa e entrar'}
          </button>
        </form>

        <button
          onClick={onSignOut}
          style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Sair
        </button>
      </div>
    </div>
  )
}

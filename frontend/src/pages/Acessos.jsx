import { useState } from 'react'
import { useUsuarios } from '../hooks/useUsuarios'
import { useProjetos } from '../hooks/useProjetos'
import TopBar from '../components/TopBar'
import Toast from '../components/Toast'
import { supabase } from '../supabase'

const PERFIS = ['admin', 'equipe', 'cliente']

const PERFIL_COR = {
  admin:   { bg: '#dcfce7', txt: '#166534' },
  equipe:  { bg: '#dbeafe', txt: '#1e40af' },
  cliente: { bg: '#fef3c7', txt: '#92400e' },
}

const CAMPO = ({ label, children }) => (
  <div className="field" style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4, display: 'block' }}>{label}</label>
    {children}
  </div>
)

const INPUT_STYLE = { fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--ink)', width: '100%', boxSizing: 'border-box' }

export default function Acessos({ user, perfil, onSignOut }) {
  const { usuarios, acessos, loading, atualizarPerfil, atualizarNome, concederAcesso, revogarAcesso, refetch } = useUsuarios()
  const { projetos } = useProjetos(perfil, user?.id)

  const [editando, setEditando]     = useState(null)
  const [nomeEdit, setNomeEdit]     = useState('')
  const [salvando, setSalvando]     = useState(false)
  const [toast, setToast]           = useState('')
  const [toastErro, setToastErro]   = useState('')
  const [expandido, setExpandido]   = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [erroForm, setErroForm]     = useState('')
  const [editUser, setEditUser]     = useState(null) // usuário em edição completa
  const [editData, setEditData]     = useState({})

  const formVazio = { email: '', senha: '', nome: '', perfil: 'equipe', funcao: '', data_nascimento: '' }
  const [form, setForm] = useState(formVazio)

  if (loading) return <div className="loading-screen">Carregando acessos...</div>

  function campo(k) {
    return e => setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function projetosDoUsuario(uid) {
    return acessos.filter(a => a.usuario_id === uid).map(a => a.projeto_id)
  }

  function temAcesso(uid, pid) {
    return acessos.some(a => a.usuario_id === uid && a.projeto_id === pid)
  }

  async function handlePerfil(id, novoPerfil) {
    setSalvando(true)
    try {
      await atualizarPerfil(id, novoPerfil)
      setToast('Perfil atualizado!')
    } catch (err) { setToastErro('Erro: ' + err.message) }
    setSalvando(false)
  }

  async function handleNome(id) {
    if (!nomeEdit.trim()) return
    setSalvando(true)
    try {
      await atualizarNome(id, nomeEdit.trim())
      setEditando(null)
      setToast('Nome atualizado!')
    } catch (err) { setToastErro('Erro: ' + err.message) }
    setSalvando(false)
  }

  async function handleAcesso(uid, pid, conceder) {
    setSalvando(true)
    try {
      if (conceder) await concederAcesso(uid, pid)
      else          await revogarAcesso(uid, pid)
    } catch (err) { setToastErro('Erro: ' + err.message) }
    setSalvando(false)
  }

  async function handleEditarUsuario(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { error } = await supabase.from('usuarios').update({
        nome:            editData.nome || null,
        funcao:          editData.funcao || null,
        data_nascimento: editData.data_nascimento || null,
      }).eq('id', editUser.id)
      if (error) throw error
      await refetch()
      setEditUser(null)
      setToast('Usuário atualizado!')
    } catch (err) { setToastErro('Erro: ' + err.message) }
    setSalvando(false)
  }

  async function handleRemoverUsuario(u) {
    if (!window.confirm(`Remover "${u.nome || u.email}"? Esta ação não pode ser desfeita — o usuário perde o acesso imediatamente.`)) return
    setSalvando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ id: u.id }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao remover usuário')
      setToast('Usuário removido.')
    } catch (err) {
      setToastErro('Erro: ' + err.message)
    }
    // Sempre refaz a busca: mesmo em erro, a linha em `usuarios` pode já ter
    // sido apagada no servidor antes da falha (ex: Auth sem conta correspondente).
    await refetch()
    setSalvando(false)
  }

  async function handleCriarUsuario(e) {
    e.preventDefault()
    setErroForm('')
    setSalvando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: form.email,
            senha: form.senha,
            nome: form.nome || null,
            perfil: form.perfil,
            funcao: form.funcao || null,
            data_nascimento: form.data_nascimento || null,
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar usuário')
      setShowForm(false)
      setForm(formVazio)
      setToast('Usuário criado com sucesso!')
      // Recarrega a lista
      window.location.reload()
    } catch (err) {
      setErroForm(err.message)
    }
    setSalvando(false)
  }

  const clientes = usuarios.filter(u => u.perfil === 'cliente')
  const staff    = usuarios.filter(u => u.perfil !== 'cliente')

  return (
    <>
      <TopBar onSignOut={onSignOut} />

      <div className="wrap">

        {/* Usuários da equipe */}
        <div className="panel">
          <div className="panel-head">
            <h2><span className="ico">👤</span> Usuários — Equipe Interna</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="hint">{staff.length} usuário(s)</span>
              <button
                className="btn btn-primary"
                onClick={() => { setShowForm(true); setErroForm('') }}
              >
                + Novo Usuário
              </button>
            </div>
          </div>
          <div className="panel-body" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Nome</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>E-mail</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Função</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Perfil</th>
                  <th style={{ padding: '8px 12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {staff.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      {editando === u.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input value={nomeEdit} onChange={e => setNomeEdit(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNome(u.id)}
                            style={{ ...INPUT_STYLE, width: 160 }} autoFocus />
                          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--brand)', border: '1px solid var(--brand)' }} onClick={() => handleNome(u.id)} disabled={salvando}>✓</button>
                          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditando(null)}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {(u.nome || u.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{u.nome || '—'}</span>
                          <button onClick={() => { setEditando(u.id); setNomeEdit(u.nome || '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13 }}>✏️</button>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>{u.email || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--ink-2)', fontSize: 13 }}>{u.funcao || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <select value={u.perfil} onChange={e => handlePerfil(u.id, e.target.value)} disabled={salvando}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--line)', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', background: PERFIL_COR[u.perfil]?.bg, color: PERFIL_COR[u.perfil]?.txt }}>
                        {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button onClick={() => { setEditUser(u); setEditData({ nome: u.nome || '', funcao: u.funcao || '', data_nascimento: u.data_nascimento || '' }) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, padding: 4 }} title="Editar usuário">✏️</button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button onClick={() => handleRemoverUsuario(u)} disabled={salvando}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14, padding: 4 }} title="Remover usuário">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clientes */}
        <div className="panel">
          <div className="panel-head">
            <h2><span className="ico">🏢</span> Clientes — Projetos Liberados</h2>
            <span className="hint">{clientes.length} cliente(s)</span>
          </div>
          <div className="panel-body">
            {clientes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)' }}>
                <p>Nenhum cliente cadastrado.</p>
                <p style={{ fontSize: 12, marginTop: 6 }}>Crie um usuário com perfil "cliente" acima.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {clientes.map(u => {
                  const qtd = projetosDoUsuario(u.id).length
                  const aberto = expandido === u.id
                  return (
                    <div key={u.id} style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                      <div onClick={() => setExpandido(aberto ? null : u.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: 'var(--surface-2)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {(u.nome || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{u.nome || u.email}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{u.email}</div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, background: qtd > 0 ? '#dcfce7' : 'var(--surface)', color: qtd > 0 ? '#166534' : 'var(--ink-3)', padding: '3px 10px', borderRadius: 999, border: '1px solid var(--line)' }}>
                          {qtd} projeto{qtd !== 1 ? 's' : ''} liberado{qtd !== 1 ? 's' : ''}
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: '.2s', flexShrink: 0 }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                      {aberto && (
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {projetos.length === 0
                            ? <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Nenhum projeto cadastrado.</p>
                            : projetos.map(p => {
                              const ativo = temAcesso(u.id, p.id)
                              return (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: ativo ? '#f0fdf4' : 'var(--surface-2)', border: `1px solid ${ativo ? '#bbf7d0' : 'var(--line)'}` }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>OS {p.os} · {p.nome}</div>
                                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.cliente}</div>
                                  </div>
                                  <button onClick={() => handleAcesso(u.id, p.id, !ativo)} disabled={salvando}
                                    style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', border: 'none', background: ativo ? '#dc2626' : 'var(--brand)', color: '#fff' }}>
                                    {ativo ? 'Revogar' : 'Liberar'}
                                  </button>
                                </div>
                              )
                            })
                          }
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <footer><b>Gestão de Projetos</b> · Gestão de Acessos</footer>
      </div>

      {/* Modal novo usuário */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Novo Usuário</h3>
              <button onClick={() => { setShowForm(false); setErroForm('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 20, lineHeight: 1, padding: '2px 4px' }}>✕</button>
            </div>
            {erroForm && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{erroForm}</div>}
            <form onSubmit={handleCriarUsuario}>
              <CAMPO label="Nome completo *">
                <input style={INPUT_STYLE} value={form.nome} onChange={campo('nome')} placeholder="Ex: Carlos Silva" required />
              </CAMPO>
              <CAMPO label="E-mail *">
                <input style={INPUT_STYLE} type="email" value={form.email} onChange={campo('email')} placeholder="carlos@exemplo.com" required />
              </CAMPO>
              <CAMPO label="Senha *">
                <input style={INPUT_STYLE} type="password" value={form.senha} onChange={campo('senha')} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </CAMPO>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CAMPO label="Função / Cargo">
                  <input style={INPUT_STYLE} value={form.funcao} onChange={campo('funcao')} placeholder="Ex: Engenheiro" />
                </CAMPO>
                <CAMPO label="Data de nascimento">
                  <input style={INPUT_STYLE} type="date" value={form.data_nascimento} onChange={campo('data_nascimento')} />
                </CAMPO>
              </div>
              <CAMPO label="Perfil de acesso *">
                <select style={INPUT_STYLE} value={form.perfil} onChange={campo('perfil')} required>
                  {PERFIS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </CAMPO>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setErroForm('') }} disabled={salvando}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar usuário */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Editar Usuário</h3>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 20 }}>✕</button>
            </div>
            <form onSubmit={handleEditarUsuario}>
              <CAMPO label="Nome completo">
                <input style={INPUT_STYLE} value={editData.nome} onChange={e => setEditData(d => ({ ...d, nome: e.target.value }))} placeholder="Nome" />
              </CAMPO>
              <CAMPO label="Função / Cargo">
                <input style={INPUT_STYLE} value={editData.funcao} onChange={e => setEditData(d => ({ ...d, funcao: e.target.value }))} placeholder="Ex: Engenheiro" />
              </CAMPO>
              <CAMPO label="Data de nascimento">
                <input style={INPUT_STYLE} type="date" value={editData.data_nascimento} onChange={e => setEditData(d => ({ ...d, data_nascimento: e.target.value }))} />
              </CAMPO>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditUser(null)} disabled={salvando}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast mensagem={toast} onClose={() => setToast('')} />}
      {toastErro && <Toast mensagem={toastErro} tipo="erro" onClose={() => setToastErro('')} />}
    </>
  )
}

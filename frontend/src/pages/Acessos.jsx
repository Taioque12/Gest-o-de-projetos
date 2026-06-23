import { useState } from 'react'
import { useUsuarios } from '../hooks/useUsuarios'
import { useProjetos } from '../hooks/useProjetos'
import Header from '../components/Header'
import Toast from '../components/Toast'

const PERFIS = ['admin', 'equipe', 'cliente']

const PERFIL_COR = {
  admin:   { bg: '#dcfce7', txt: '#166534' },
  equipe:  { bg: '#dbeafe', txt: '#1e40af' },
  cliente: { bg: '#fef3c7', txt: '#92400e' },
}

export default function Acessos({ user, perfil, onSignOut, onChangeView }) {
  const { usuarios, acessos, loading, atualizarPerfil, atualizarNome, concederAcesso, revogarAcesso } = useUsuarios()
  const { projetos } = useProjetos(perfil, user?.id)
  const [editando, setEditando]   = useState(null) // id do usuário em edição
  const [nomeEdit, setNomeEdit]   = useState('')
  const [salvando, setSalvando]   = useState(false)
  const [toast, setToast]         = useState('')
  const [expandido, setExpandido] = useState(null) // id do cliente expandido

  if (loading) return <div className="loading-screen">Carregando acessos...</div>

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
    } catch (err) { alert('Erro: ' + err.message) }
    setSalvando(false)
  }

  async function handleNome(id) {
    if (!nomeEdit.trim()) return
    setSalvando(true)
    try {
      await atualizarNome(id, nomeEdit.trim())
      setEditando(null)
      setToast('Nome atualizado!')
    } catch (err) { alert('Erro: ' + err.message) }
    setSalvando(false)
  }

  async function handleAcesso(uid, pid, conceder) {
    setSalvando(true)
    try {
      if (conceder) await concederAcesso(uid, pid)
      else          await revogarAcesso(uid, pid)
    } catch (err) { alert('Erro: ' + err.message) }
    setSalvando(false)
  }

  const clientes = usuarios.filter(u => u.perfil === 'cliente')
  const staff    = usuarios.filter(u => u.perfil !== 'cliente')

  return (
    <>
      <Header
        perfil={perfil}
        onSignOut={onSignOut}
        view="acessos"
        onChangeView={onChangeView}
      />

      <div className="wrap">

        {/* Usuários da equipe */}
        <div className="panel">
          <div className="panel-head">
            <h2><span className="ico">👤</span> Usuários — Equipe Interna</h2>
            <span className="hint">{staff.length} usuário(s)</span>
          </div>
          <div className="panel-body" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Nome</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>E-mail</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Perfil</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      {editando === u.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={nomeEdit}
                            onChange={e => setNomeEdit(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleNome(u.id)}
                            style={{ fontSize: 13, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--line)', fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--ink)' }}
                            autoFocus
                          />
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
                    <td style={{ padding: '10px 12px' }}>
                      <select
                        value={u.perfil}
                        onChange={e => handlePerfil(u.id, e.target.value)}
                        disabled={salvando}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--line)', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', background: PERFIL_COR[u.perfil]?.bg, color: PERFIL_COR[u.perfil]?.txt }}
                      >
                        {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clientes e seus acessos */}
        <div className="panel">
          <div className="panel-head">
            <h2><span className="ico">🏢</span> Clientes — Projetos Liberados</h2>
            <span className="hint">{clientes.length} cliente(s)</span>
          </div>
          <div className="panel-body">
            {clientes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)' }}>
                <p>Nenhum cliente cadastrado.</p>
                <p style={{ fontSize: 12, marginTop: 6 }}>Crie um usuário com perfil "cliente" na seção acima.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {clientes.map(u => {
                  const qtd = projetosDoUsuario(u.id).length
                  const aberto = expandido === u.id
                  return (
                    <div key={u.id} style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                      {/* Cabeçalho do cliente */}
                      <div
                        onClick={() => setExpandido(aberto ? null : u.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: 'var(--surface-2)' }}
                      >
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

                      {/* Lista de projetos */}
                      {aberto && (
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {projetos.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Nenhum projeto cadastrado.</p>
                          ) : projetos.map(p => {
                            const ativo = temAcesso(u.id, p.id)
                            return (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: ativo ? '#f0fdf4' : 'var(--surface-2)', border: `1px solid ${ativo ? '#bbf7d0' : 'var(--line)'}` }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>OS {p.os} · {p.nome}</div>
                                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.cliente}</div>
                                </div>
                                <button
                                  onClick={() => handleAcesso(u.id, p.id, !ativo)}
                                  disabled={salvando}
                                  style={{
                                    fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', border: 'none', transition: '.15s',
                                    background: ativo ? '#dc2626' : 'var(--brand)', color: '#fff',
                                  }}
                                >
                                  {ativo ? 'Revogar' : 'Liberar'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <footer><b>Painel MA CONEGLIAN</b> · Gestão de Acessos</footer>
      </div>

      {toast && <Toast mensagem={toast} onClose={() => setToast('')} />}
    </>
  )
}

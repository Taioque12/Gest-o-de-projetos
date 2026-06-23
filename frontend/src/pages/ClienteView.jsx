import { useState } from 'react'
import { useProjetos } from '../hooks/useProjetos'
import { classify, valorFmt, fmtFull } from '../utils/helpers'
import Header from '../components/Header'
import ProjectModal from '../components/ProjectModal'

export default function ClienteView({ user, perfil, onSignOut, onChangeView }) {
  const { projetos, atualizacoes, loading } = useProjetos(perfil, user?.id)
  const [modal, setModal] = useState(null)

  if (loading) return <div className="loading-screen">Carregando seus projetos...</div>

  return (
    <>
      <Header perfil={perfil} onSignOut={onSignOut} view="dashboard" onChangeView={onChangeView} />

      <div className="wrap">
        <div className="panel">
          <div className="panel-head">
            <h2><span className="ico">🗂️</span> Meus Projetos</h2>
            <span className="hint">{projetos.length} projeto{projetos.length !== 1 ? 's' : ''} liberado{projetos.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="panel-body">
            {projetos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
                <p>Nenhum projeto liberado para o seu acesso.</p>
                <p style={{ fontSize: 12, marginTop: 6 }}>Entre em contato com a equipe MA CONEGLIAN.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projetos.map(p => {
                  const c = classify(p.prev, p.real)
                  const diasRestantes = Math.ceil((p._e - Date.now()) / (24 * 60 * 60 * 1000))
                  const atrasado = diasRestantes < 0 && p.real < 100
                  return (
                    <div
                      key={p.id}
                      onClick={() => setModal(p)}
                      style={{ border: `1px solid ${c.k === 'vermelho' ? '#fecaca' : c.k === 'amarelo' ? '#fde68a' : 'var(--line)'}`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', background: 'var(--surface)', transition: '.15s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 999, border: '1px solid var(--line)' }}>OS {p.os}</span>
                            <span style={{ fontSize: 12 }}>{c.emo} {c.lbl}</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{p.nome}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{p.escopo} · Resp.: {p.responsavel}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: c.k === 'verde' ? 'var(--verde)' : c.k === 'amarelo' ? 'var(--amarelo)' : 'var(--vermelho)' }}>{p.real}%</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>realizado</div>
                        </div>
                      </div>

                      {/* Barra de progresso */}
                      <div style={{ marginTop: 12, height: 8, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: c.k === 'verde' ? 'var(--verde)' : c.k === 'amarelo' ? 'var(--amarelo)' : 'var(--vermelho)', width: `${p.real}%`, transition: 'width .5s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--ink-3)' }}>
                        <span>Início: {fmtFull(p._s)}</span>
                        <span style={{ color: atrasado ? '#dc2626' : 'var(--ink-3)' }}>
                          {atrasado ? `Prazo vencido (${Math.abs(diasRestantes)}d)` : `Término: ${fmtFull(p._e)}`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <footer><b>Painel MA CONEGLIAN</b> · Portal do Cliente</footer>
      </div>

      {modal && (
        <ProjectModal
          projeto={modal}
          atualizacoes={atualizacoes.filter(a => a.projeto_id === modal.id)}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

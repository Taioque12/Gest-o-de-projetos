import { useEffect, useState } from 'react'
import { classify, valorFmt, fmtFull, fmt } from '../utils/helpers'
import { useAnexos } from '../hooks/useAnexos'
import CurvaS from './CurvaS'
import { projectCurveOpts } from '../utils/helpers'

const TABS = ['Visão Geral', 'Histórico', 'Anexos']

function fmtBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function ProjectModal({ projeto, atualizacoes = [], onClose, podeEditar = false }) {
  const p = projeto
  const c = classify(p.prev, p.real)
  const desv = p.real - p.prev
  const curveOpts = projectCurveOpts(p)
  const [aba, setAba] = useState('Visão Geral')
  const { anexos, loading: loadAnexos, uploadAnexo, excluirAnexo } = useAnexos(p.id)
  const [uploading, setUploading] = useState(false)
  const [erroUpload, setErroUpload] = useState('')

  const hist = [...atualizacoes]
    .filter(a => a.projeto_id === p.id)
    .sort((a, b) => new Date(b.data_atualizacao) - new Date(a.data_atualizacao))

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErroUpload('')
    setUploading(true)
    try {
      await uploadAnexo(file)
    } catch (err) {
      setErroUpload(err.message)
    }
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className={`modal-head ${c.k}`}>
          <button className="close" onClick={onClose}>×</button>
          <h2>{p.nome}</h2>
          <p>OS {p.os} · {p.cliente} · {p.escopo}</p>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setAba(t)}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: aba === t ? 700 : 500, cursor: 'pointer', background: 'none', border: 'none', borderBottom: aba === t ? '2px solid var(--brand)' : '2px solid transparent', color: aba === t ? 'var(--brand)' : 'var(--ink-2)', transition: '.15s' }}
            >
              {t}
              {t === 'Histórico' && hist.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--brand)', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>{hist.length}</span>
              )}
              {t === 'Anexos' && anexos.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--ink-3)', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>{anexos.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="modal-body">

          {aba === 'Visão Geral' && (
            <>
              <div className="m-grid">
                <div className="m-stat"><div className="l">Previsto</div><div className="v">{p.prev}%</div></div>
                <div className="m-stat"><div className="l">Realizado</div><div className="v">{p.real}%</div></div>
                <div className="m-stat">
                  <div className="l">Desvio</div>
                  <div className="v" style={{ color: `var(--${c.k})` }}>
                    {desv >= 0 ? '+' : '−'}{Math.abs(desv)} p.p.
                  </div>
                </div>
              </div>

              <div className="m-facts">
                <div className="m-fact"><div className="l">Responsável</div><div className="v">{p.responsavel}</div></div>
                <div className="m-fact"><div className="l">Início</div><div className="v">{fmtFull(p._s)}</div></div>
                <div className="m-fact"><div className="l">Data-fim</div><div className="v">{fmtFull(p._e)}</div></div>
                <div className="m-fact"><div className="l">Prazo</div><div className="v">{p.prazo}</div></div>
                <div className="m-fact"><div className="l">Valor da OS</div><div className="v">{valorFmt(p.valor)}</div></div>
                <div className="m-fact"><div className="l">Criticidade</div><div className="v">{c.emo} {c.lbl}</div></div>
              </div>

              <div className="m-sec">
                <h4>📈 Curva S do projeto (semanal)</h4>
                <CurvaS opts={curveOpts} />
              </div>

              {p.frentes?.length > 0 && (
                <div className="m-sec">
                  <h4>🔧 Frentes de serviço (Previsto × Realizado)</h4>
                  {p.frentes.map((f, i) => {
                    const fc = classify(f[1], f[2])
                    return (
                      <div className="frente" key={i}>
                        <div className="frente-top">
                          <span>{f[0]}</span>
                          <span>{f[2]}% <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>/ {f[1]}% prev</span></span>
                        </div>
                        <div className="track">
                          <div className={`fill real-${fc.k}`} style={{ width: `${f[2]}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="m-sec">
                <h4>🎯 Ação Recomendada</h4>
                <div className="acao-box">{p.acao}</div>
              </div>
            </>
          )}

          {aba === 'Histórico' && (
            <div>
              {hist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
                  <p>Nenhuma atualização registrada ainda.</p>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'var(--line)' }} />
                  {hist.map((h, i) => {
                    const prev = hist[i + 1]
                    const deltaReal = prev ? h.avanco_realizado - prev.avanco_realizado : null
                    const deltaPrev = prev ? h.avanco_previsto - prev.avanco_previsto : null
                    const d = new Date(h.data_atualizacao)
                    const dataFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                    const cl = classify(h.avanco_previsto, h.avanco_realizado)
                    return (
                      <div key={h.id ?? i} style={{ position: 'relative', marginBottom: 20, paddingLeft: 16 }}>
                        <div style={{ position: 'absolute', left: -17, top: 4, width: 10, height: 10, borderRadius: '50%', background: `var(--${cl.k})`, border: '2px solid var(--surface)' }} />
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{dataFmt}</div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>Previsto: {fmt(h.avanco_previsto)}%</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>Realizado: {fmt(h.avanco_realizado)}%</span>
                          {deltaReal !== null && (
                            <span style={{ fontSize: 12, color: deltaReal >= 0 ? 'var(--verde)' : 'var(--vermelho)' }}>
                              {deltaReal >= 0 ? '+' : ''}{fmt(deltaReal)} p.p.
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: `var(--${cl.k})`, marginTop: 2 }}>{cl.emo} {cl.lbl}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {aba === 'Anexos' && (
            <div>
              {podeEditar && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px dashed var(--brand)', color: 'var(--brand)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {uploading ? 'Enviando...' : 'Adicionar arquivo'}
                    <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
                  </label>
                  {erroUpload && <p style={{ fontSize: 12, color: 'var(--vermelho)', marginTop: 6 }}>{erroUpload}</p>}
                </div>
              )}

              {loadAnexos ? (
                <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Carregando...</p>
              ) : anexos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
                  <p>Nenhum anexo neste projeto.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {anexos.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtBytes(a.tamanho)} · {new Date(a.criado_em).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <a href={a.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
                        Baixar
                      </a>
                      {podeEditar && (
                        <button onClick={() => excluirAnexo(a)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vermelho)', fontSize: 16, lineHeight: 1 }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

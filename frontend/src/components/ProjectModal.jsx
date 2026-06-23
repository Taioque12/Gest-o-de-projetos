import { useEffect, useState } from 'react'
import { classify, valorFmt, fmtFull, fmt, projectCurveOpts, histogramaOpts, baselineCurveOpts } from '../utils/helpers'
import { useAnexos } from '../hooks/useAnexos'
import { useEfetivo } from '../hooks/useEfetivo'
import { useProgramacao } from '../hooks/useProgramacao'
import { useFuncionarios } from '../hooks/useFuncionarios'
import { useBaseline } from '../hooks/useBaseline'
import CurvaS from './CurvaS'
import Histograma from './Histograma'
import ProgramacaoSemanal from './ProgramacaoSemanal'

const TABS = ['Visão Geral', 'Histograma', 'Programação', 'Histórico', 'Anexos']

const inp = { padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, marginTop: 2 }

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

  const { efetivo, salvarEfetivo, excluirEfetivo } = useEfetivo(p.id)
  const histOpts = histogramaOpts(p, efetivo)
  const [efForm, setEfForm] = useState({ data_semana: '', previstos: '', mobilizados: '' })
  const [savingEf, setSavingEf] = useState(false)
  const [erroEf, setErroEf] = useState('')

  const { alocacoes, alocar } = useProgramacao(p.id)
  const { funcionarios } = useFuncionarios()
  const { baselines, baselineAtivo, congelarBaseline, excluirBaseline } = useBaseline(p.id)
  const baselineOpts = baselineCurveOpts(baselineAtivo, p)
  const [congelando, setCongelando] = useState(false)
  const [descBaseline, setDescBaseline] = useState('')

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

  async function handleSalvarEf(e) {
    e.preventDefault()
    if (!efForm.data_semana) { setErroEf('Informe a data da semana.'); return }
    setErroEf('')
    setSavingEf(true)
    try {
      await salvarEfetivo(efForm)
      setEfForm({ data_semana: '', previstos: '', mobilizados: '' })
    } catch (err) {
      setErroEf(err.message)
    }
    setSavingEf(false)
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
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setAba(t)}
              style={{ padding: '10px 12px', fontSize: 12, fontWeight: aba === t ? 700 : 500, cursor: 'pointer', background: 'none', border: 'none', borderBottom: aba === t ? '2px solid var(--brand)' : '2px solid transparent', color: aba === t ? 'var(--brand)' : 'var(--ink-2)', transition: '.15s', whiteSpace: 'nowrap' }}
            >
              {t}
              {t === 'Histograma' && efetivo.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--ink-3)', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>{efetivo.length}</span>
              )}
              {t === 'Programação' && alocacoes.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: '#0f7a3d', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>{alocacoes.length}</span>
              )}
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
                <h4>📈 Curva S do projeto {baselineAtivo && <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600, marginLeft: 6 }}>· BL: {baselineAtivo.descricao || baselineAtivo.data_congelamento}</span>}</h4>
                <CurvaS opts={curveOpts} baseline={baselineOpts} />
              </div>

              {podeEditar && (
                <div className="m-sec">
                  <h4>🔒 Baseline do planejamento</h4>
                  {baselineAtivo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: '1px solid #fed7aa', background: 'rgba(249,115,22,.06)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f97316' }}>
                          Baseline ativo — {baselineAtivo.descricao || 'sem descrição'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                          Congelado em {new Date(baselineAtivo.data_congelamento + 'T00:00:00').toLocaleDateString('pt-BR')} · Início original: {new Date(baselineAtivo.inicio_original + 'T00:00:00').toLocaleDateString('pt-BR')} · Fim original: {new Date(baselineAtivo.fim_original + 'T00:00:00').toLocaleDateString('pt-BR')} · Prev: {baselineAtivo.prev_original}%
                        </div>
                      </div>
                      {baselines.length > 0 && (
                        <button onClick={() => excluirBaseline(baselineAtivo.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vermelho)', fontSize: 13, fontWeight: 600 }}>
                          Remover
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                        Descrição (opcional)<br />
                        <input value={descBaseline} onChange={e => setDescBaseline(e.target.value)} placeholder="ex: Planejamento original abril/26"
                          style={inp} />
                      </label>
                      <button
                        onClick={async () => { setCongelando(true); try { await congelarBaseline(p, descBaseline); setDescBaseline('') } catch {} setCongelando(false) }}
                        disabled={congelando}
                        style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #f97316', background: 'rgba(249,115,22,.08)', color: '#f97316', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        {congelando ? 'Salvando...' : '🔒 Congelar baseline'}
                      </button>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', alignSelf: 'center' }}>Guarda início, fim e % previsto atual como referência permanente.</span>
                    </div>
                  )}
                </div>
              )}

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

          {aba === 'Histograma' && (
            <>
              <div className="m-sec">
                <h4>📊 Histograma de efetivo + Curva S</h4>
                <Histograma opts={histOpts} />
                {efetivo.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', marginTop: 8 }}>
                    Nenhum efetivo lançado ainda — o gráfico mostra apenas a Curva S.{podeEditar ? ' Cadastre as semanas abaixo.' : ''}
                  </p>
                )}
              </div>

              {podeEditar && (
                <div className="m-sec">
                  <h4>➕ Lançar efetivo da semana</h4>
                  <form onSubmit={handleSalvarEf} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <label style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      Semana<br />
                      <input type="date" value={efForm.data_semana} onChange={e => setEfForm(f => ({ ...f, data_semana: e.target.value }))} style={inp} />
                    </label>
                    <label style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      Previstos<br />
                      <input type="number" min="0" value={efForm.previstos} onChange={e => setEfForm(f => ({ ...f, previstos: e.target.value }))} style={{ ...inp, width: 90 }} />
                    </label>
                    <label style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      Mobilizados<br />
                      <input type="number" min="0" value={efForm.mobilizados} onChange={e => setEfForm(f => ({ ...f, mobilizados: e.target.value }))} style={{ ...inp, width: 90 }} />
                    </label>
                    <button type="submit" disabled={savingEf}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {savingEf ? 'Salvando...' : 'Salvar'}
                    </button>
                  </form>
                  {erroEf && <p style={{ fontSize: 12, color: 'var(--vermelho)', marginTop: 6 }}>{erroEf}</p>}
                  <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                    Repetir a mesma data atualiza a semana. Deixe "Mobilizados" em branco se ainda não houve mobilização.
                  </p>
                </div>
              )}

              {efetivo.length > 0 && (
                <div className="m-sec">
                  <h4>🗓️ Semanas lançadas</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {efetivo.map(ef => (
                      <div key={ef.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 92 }}>{new Date(ef.data_semana + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        <span style={{ fontSize: 12, color: '#E0A82E' }}>Prev: <b>{ef.previstos ?? 0}</b></span>
                        <span style={{ fontSize: 12, color: 'var(--brand)' }}>Mob: <b>{ef.mobilizados ?? '—'}</b></span>
                        {podeEditar && (
                          <>
                            <button onClick={() => setEfForm({ data_semana: ef.data_semana, previstos: ef.previstos ?? '', mobilizados: ef.mobilizados ?? '' })}
                              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 12, fontWeight: 600 }}>editar</button>
                            <button onClick={() => excluirEfetivo(ef.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vermelho)', fontSize: 16, lineHeight: 1 }}>×</button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {aba === 'Programação' && (
            <>
              <div className="m-sec">
                <h4>🗓️ Programação semanal de efetivo</h4>
                <ProgramacaoSemanal
                  projeto={p}
                  funcionarios={funcionarios}
                  alocacoes={alocacoes}
                  onAlocar={alocar}
                  podeEditar={podeEditar}
                />
              </div>

              {/* #5 — Custo de MO */}
              {(() => {
                const funcMap = Object.fromEntries(funcionarios.map(f => [f.id, f]))
                const custoPrev  = alocacoes.reduce((s, a) => s + (a.dias || 0) * (funcMap[a.funcionario_id]?.custo_dia || 0), 0)
                const diasTotal  = alocacoes.reduce((s, a) => s + (a.dias || 0), 0)
                const temCusto   = funcionarios.some(f => (f.custo_dia || 0) > 0)
                if (!temCusto && alocacoes.length === 0) return null
                return (
                  <div className="m-sec">
                    <h4>💰 Custo de mão de obra (MO)</h4>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface-2)', minWidth: 150 }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Dias alocados</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>{diasTotal}d</div>
                      </div>
                      {temCusto && (
                        <div style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface-2)', minWidth: 150 }}>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Custo MO previsto</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f7a3d', marginTop: 2 }}>
                            {custoPrev >= 1000 ? `R$ ${(custoPrev/1000).toFixed(1)}k` : `R$ ${custoPrev.toFixed(0)}`}
                          </div>
                        </div>
                      )}
                      {temCusto && p.valor > 0 && (
                        <div style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface-2)', minWidth: 150 }}>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>MO / Valor OS</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', marginTop: 2 }}>
                            {((custoPrev / p.valor) * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                    {!temCusto && (
                      <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
                        Cadastre o custo/dia de cada funcionário na aba Equipes para ver o custo total.
                      </p>
                    )}
                  </div>
                )
              })()}
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

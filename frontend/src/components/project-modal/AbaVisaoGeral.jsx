import { useState, lazy, Suspense } from 'react'
import { classify, valorFmt, fmtFull } from '../../utils/helpers'
import { gerarStatusExecutivo } from '../../utils/managementTalk'

const CurvaS = lazy(() => import('../CurvaS'))

const inp = { padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, marginTop: 2 }

export default function AbaVisaoGeral({ p, c, desv, curveOpts, baselineOpts, baselineAtivo, baselines, podeEditar, congelarBaseline, excluirBaseline }) {
  const [congelando, setCongelando] = useState(false)
  const [descBaseline, setDescBaseline] = useState('')
  const [mtalkFormat, setMtalkFormat] = useState('slack')
  const [mtalkCopied, setMtalkCopied] = useState(false)

  async function handleCongelar() {
    setCongelando(true)
    try {
      await congelarBaseline(p, descBaseline)
      setDescBaseline('')
    } catch {}
    setCongelando(false)
  }

  return (
    <>
      <div className="m-grid">
        <div className="m-stat"><div className="l">Previsto (Físico)</div><div className="v">{p.prev}%</div></div>
        <div className="m-stat" style={{ borderLeft: c.s, background: 'var(--surface-solid)' }}>
          <div className="l">Realizado (Físico)</div>
          <div className="v" style={{ color: c.c }}>{p.real}%</div>
          <div style={{ fontSize: 11, color: c.c, fontWeight: 600, marginTop: 4 }}>Desvio: {desv > 0 ? '+' : ''}{desv.toFixed(1)} p.p.</div>
        </div>

        {p.orcamento > 0 && (
          <div className="m-stat" style={{ background: 'var(--surface-solid)' }}>
            <div className="l">Custo (EVM)</div>
            <div className="v" style={{ fontSize: 18, marginTop: 4 }}>
              R$ {Number(p.custo_realizado || 0).toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
              de R$ {Number(p.orcamento).toLocaleString('pt-BR')} orçados
            </div>
          </div>
        )}
      </div>

      {p.orcamento > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--line)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>SPI (Prazo)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: (p.real / (p.prev || 1)) >= 1 ? 'var(--verde)' : 'var(--vermelho)' }}>
              {p.prev > 0 ? (p.real / p.prev).toFixed(2) : '-'}
            </div>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--line)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>CPI (Custo)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: (((p.real/100)*p.orcamento) / (p.custo_realizado || 1)) >= 1 ? 'var(--verde)' : 'var(--vermelho)' }}>
              {p.custo_realizado > 0 ? (((p.real/100)*p.orcamento) / p.custo_realizado).toFixed(2) : '-'}
            </div>
          </div>
        </div>
      )}

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
        <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando gráfico...</div>}>
          <CurvaS opts={curveOpts} baseline={baselineOpts} />
        </Suspense>
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
                onClick={handleCongelar}
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

      <div className="m-sec">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h4 style={{ margin: 0 }}>📊 Reporte Executivo (Management Talk)</h4>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setMtalkFormat('slack')}
              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)', background: mtalkFormat === 'slack' ? 'var(--brand)' : 'var(--surface-2)', color: mtalkFormat === 'slack' ? '#fff' : 'var(--ink)', cursor: 'pointer' }}
            >
              Slack
            </button>
            <button
              onClick={() => setMtalkFormat('jira')}
              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)', background: mtalkFormat === 'jira' ? 'var(--brand)' : 'var(--surface-2)', color: mtalkFormat === 'jira' ? '#fff' : 'var(--ink)', cursor: 'pointer' }}
            >
              JIRA
            </button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <textarea
            readOnly
            value={gerarStatusExecutivo(p, mtalkFormat)}
            style={{ width: '100%', height: mtalkFormat === 'jira' ? 200 : 120, fontSize: 13, padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)', resize: 'vertical' }}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(gerarStatusExecutivo(p, mtalkFormat))
              setMtalkCopied(true)
              setTimeout(() => setMtalkCopied(false), 2000)
            }}
            style={{ position: 'absolute', top: 10, right: 10, padding: '4px 8px', fontSize: 11, borderRadius: 4, background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {mtalkCopied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
    </>
  )
}

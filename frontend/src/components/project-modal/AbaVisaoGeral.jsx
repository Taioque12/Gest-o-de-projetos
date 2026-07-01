import { useState } from 'react'
import { classify, valorFmt, fmtFull } from '../../utils/helpers'
import CurvaS from '../CurvaS'

const inp = { padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, marginTop: 2 }

export default function AbaVisaoGeral({ p, c, desv, curveOpts, baselineOpts, baselineAtivo, baselines, podeEditar, congelarBaseline, excluirBaseline }) {
  const [congelando, setCongelando] = useState(false)
  const [descBaseline, setDescBaseline] = useState('')

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
    </>
  )
}

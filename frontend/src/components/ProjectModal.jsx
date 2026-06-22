import { useEffect } from 'react'
import { classify, valorFmt, fmtFull, projectCurveOpts } from '../utils/helpers'
import CurvaS from './CurvaS'

export default function ProjectModal({ projeto, onClose }) {
  const p = projeto
  const c = classify(p.prev, p.real)
  const desv = p.real - p.prev
  const curveOpts = projectCurveOpts(p)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className={`modal-head ${c.k}`}>
          <button className="close" onClick={onClose}>×</button>
          <h2>{p.nome}</h2>
          <p>OS {p.os} · {p.cliente} · {p.escopo}</p>
        </div>
        <div className="modal-body">
          <div className="m-grid">
            <div className="m-stat">
              <div className="l">Previsto</div>
              <div className="v">{p.prev}%</div>
            </div>
            <div className="m-stat">
              <div className="l">Realizado</div>
              <div className="v">{p.real}%</div>
            </div>
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
        </div>
      </div>
    </div>
  )
}

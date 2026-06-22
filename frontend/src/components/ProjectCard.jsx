import { classify, valorFmt, fmtFull } from '../utils/helpers'

export default function ProjectCard({ projeto, onClick, podeEditar, onEditar, onExcluir }) {
  const p = projeto
  const c = classify(p.prev, p.real)
  const desv = p.real - p.prev
  const conflict = p.equipes?.some(e => e.toLowerCase().includes('compartilhada'))

  return (
    <div className="card" onClick={onClick}>
      <div className={`strip ${c.k}`} />
      <div className="card-inner">
        <div className="card-top">
          <h3>{p.nome}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={`pill ${c.k}`}>{c.emo} {c.lbl}</span>
            {podeEditar && (
              <div className="card-actions">
                <button className="card-action-btn" title="Editar" onClick={onEditar}>✏️</button>
                <button className="card-action-btn card-action-del" title="Excluir" onClick={onExcluir}>🗑️</button>
              </div>
            )}
          </div>
        </div>
        <div className="meta">OS <b>{p.os}</b> · {p.cliente}</div>
        <div className="facts">
          <div className="fact"><span className="fl">👤 Resp.:</span><span className="fv">{p.responsavel}</span></div>
          <div className="fact"><span className="fl">💰 Valor:</span><span className="fv">{valorFmt(p.valor)}</span></div>
          <div className="fact"><span className="fl">📅 Fim:</span><span className="fv">{fmtFull(p._e)}</span></div>
          <div className="fact"><span className="fl">⏱️ Prazo:</span><span className="fv">{p.prazo}</span></div>
        </div>
        <div className="bars">
          <div className="bar-row">
            <div className="bar-top"><span className="t1">Previsto</span><span className="t1">{p.prev}%</span></div>
            <div className="track"><div className="fill prev" style={{ width: `${p.prev}%` }} /></div>
          </div>
          <div className="bar-row">
            <div className="bar-top"><span className="t2">Realizado</span><span className="t2">{p.real}%</span></div>
            <div className="track"><div className={`fill real-${c.k}`} style={{ width: `${p.real}%` }} /></div>
          </div>
        </div>
        <div className="desvio-row">
          <span className="dl">Desvio (Realizado − Previsto)</span>
          <span className={`dv ${c.k}`}>{desv >= 0 ? '+' : '−'}{Math.abs(desv)} p.p.</span>
        </div>
        <div className="info-line">
          <span className="ic">👷</span>
          <span>
            <b>Equipes:</b> {p.equipes?.join(' · ')}
            {conflict && <span className="conflict-tag">conflito de recurso</span>}
          </span>
        </div>
        <div className="info-line">
          <span className="ic">🎯</span>
          <span><b>Ação:</b> {p.acao}</span>
        </div>
      </div>
    </div>
  )
}

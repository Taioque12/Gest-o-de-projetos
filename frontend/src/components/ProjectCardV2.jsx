import { fmtFull } from '../utils/helpers'

export default function ProjectCardV2({ projeto, onClick }) {
  const p = projeto
  // Logic to map to mockup's look
  const isPending = p.status === 'pending' || p.real < 20
  const k = isPending ? 'amarelo' : 'verde'
  const lbl = isPending ? 'Pendente' : 'Em Andamento'
  const pillTxt = isPending ? 'RISCOS' : 'NO PRAZO'
  
  return (
    <div className="p-card" onClick={onClick}>
      <div className="p-card-top">
        <span className="p-card-title">{p.nome}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {p.risk_score !== undefined && p.risk_score !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: p.risk_level === 'ALTO' ? 'var(--vermelho)' : p.risk_level === 'MEDIO' ? '#f59e0b' : 'var(--verde)', color: '#fff', padding: '2px 6px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' }} title={`Risk Level: ${p.risk_level}`}>
              <span style={{ fontSize: 10 }}>⚠️</span> {p.risk_score}
            </div>
          )}
          {p.github_issue_url && (
            <a href={p.github_issue_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 14, opacity: .7 }} title="Ver no GitHub">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--ink)"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            </a>
          )}
          <button className="p-card-more">•••</button>
        </div>
      </div>
      
      <div className={`p-card-stat ${k}`}>
        <span>{lbl}</span>
        <span>{p.real}%</span>
      </div>
      
      <div className="p-track">
        <div className={`p-fill ${k}`} style={{ width: `${p.real}%` }} />
      </div>
      
      <div className="p-card-bot">
        <span>Due {fmtFull(p._e).slice(0, 5)}</span>
        <span className={`p-pill ${k}`}>{pillTxt}</span>
      </div>

      {p.alerta_ia && (
        <div style={{ marginTop: 12, padding: '8px', background: 'oklch(1 0 0 / .05)', border: '1px solid var(--vermelho)', borderRadius: 8, fontSize: 12, color: 'var(--vermelho)', lineHeight: 1.4 }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 14 }}>🤖</span> Scrum Master AI
          </strong>
          <div style={{ marginTop: 4 }}>{p.alerta_ia}</div>
        </div>
      )}
    </div>
  )
}

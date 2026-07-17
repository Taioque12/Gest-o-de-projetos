import { fmtFull } from '../utils/helpers'

export default function ProjectCardV2({ projeto, onClick }) {
  const p = projeto
  // Logic to map to mockup's look
  const isPending = p.status === 'pending' || p.real < 20
  const k = isPending ? 'amarelo' : 'verde'
  const lbl = isPending ? 'Pending' : 'In Progress'
  const pillTxt = isPending ? 'RISKS' : 'ON TRACK'
  
  // Fake due dates matching mockup format
  const due = "Aug 30" // Mocking for aesthetic match
  
  return (
    <div className="p-card" onClick={onClick}>
      <div className="p-card-top">
        <span className="p-card-title">{p.nome}</span>
        <button className="p-card-more">•••</button>
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

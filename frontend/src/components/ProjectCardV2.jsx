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
        <div className="p-card-title">{p.nome}</div>
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
        {p.equipes && p.equipes.length > 0 ? (
          <div className="p-avatars">
            <img src="https://ui-avatars.com/api/?name=A&background=random&color=fff" alt="Team" />
            <img src="https://ui-avatars.com/api/?name=B&background=random&color=fff" alt="Team" />
            <img src="https://ui-avatars.com/api/?name=C&background=random&color=fff" alt="Team" />
          </div>
        ) : (
          <span>No team</span>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Status:</span>
        <span className={`p-pill ${k}`}>{pillTxt}</span>
      </div>
    </div>
  )
}

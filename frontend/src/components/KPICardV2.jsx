export default function KPICardV2({ lbl, val, sub, pct, badge, isGreen }) {
  // Sparkline mockup points
  const p1 = isGreen ? "0,15 5,14 10,13 15,10 20,12 25,5 30,7 35,0" : "0,5 5,7 10,6 15,10 20,9 25,12 30,14 35,15"
  
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="kpi-lbl">{lbl}</span>
        {badge && <span className="kpi-badge">{badge}</span>}
      </div>
      
      <div className="kpi-val">{val}</div>
      
      <div className="kpi-bot">
        <span className={`kpi-sub ${isGreen ? 'up' : 'down'}`}>
          {isGreen ? '↑' : '↓'} {pct}%
        </span>
        {sub && <span className="kpi-sub-text">{sub}</span>}
      </div>
      <div className="track" style={{ height: '5px', marginTop: '10px' }}>
        <div className={`fill ${isGreen ? 'real-verde' : 'real-amarelo'}`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  )
}

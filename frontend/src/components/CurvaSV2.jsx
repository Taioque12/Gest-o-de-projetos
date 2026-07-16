import { fmt } from '../utils/helpers'

export default function CurvaSV2({ opts, height = 360 }) {
  if (!opts) return null
  const { plannedPts, actualPts, ticks } = opts
  const W = 800, H = height
  const padL = 48, padR = 32, padT = 24, padB = 40
  const pw = W - padL - padR, ph = H - padT - padB
  const y0 = padT + ph
  const PX = x => padL + x * pw
  const PY = v => y0 - v * (ph / 100)

  const pPath = plannedPts.map(p => `${PX(p.x)},${PY(p.y)}`).join(' ')
  const aPath = actualPts.map(p => `${PX(p.x)},${PY(p.y)}`).join(' ')

  return (
    <div className="scurve-panel">
      <div className="scurve-head">
        <div className="scurve-title">
          <h2>Project Progress S-Curve</h2>
          <p>Cumulative % Complete</p>
        </div>
        <div className="scurve-legend">
          <div className="leg-item"><div className="leg-dash" /> Planned Value</div>
          <div className="leg-item"><div className="leg-solid" /> Actual Progress</div>
        </div>
      </div>
      
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id="glowOrange" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#fb923c" floodOpacity="0.8" />
          </filter>
          <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#22c55e" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Grid horizontal: 0, 20, 40, 60, 80, 100 */}
        {[0, 20, 40, 60, 80, 100].map(v => (
          <g key={v}>
            <line x1={padL} y1={PY(v)} x2={W - padR} y2={PY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={padL - 10} y={PY(v) + 4} textAnchor="end" fontSize="12" fill="var(--ink-3)" fontFamily="Inter, sans-serif">
              {v}%
            </text>
          </g>
        ))}

        {/* Ticks eixo X */}
        {ticks.map((t, i) => (
          <g key={i}>
            <text x={PX(t.x)} y={H - 12} textAnchor="middle" fontSize="12" fill="var(--ink-3)" fontFamily="Inter, sans-serif">
              {t.label}
            </text>
          </g>
        ))}
        {/* Y Axis title */}
        <text x={-(H/2)} y={12} transform="rotate(-90)" textAnchor="middle" fontSize="12" fill="var(--ink-3)" fontFamily="Inter, sans-serif">
          Cumulative % Complete
        </text>
        <text x={W/2} y={H} textAnchor="middle" fontSize="12" fill="var(--ink-3)" fontFamily="Inter, sans-serif">
          Month
        </text>

        {/* Linha previsto (branca tracejada) */}
        <polyline points={pPath} fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6 6" strokeLinejoin="round" opacity="0.9" />
        
        {/* Pontos Previstos */}
        {plannedPts.map((p, i) => (
           <circle key={`p-${i}`} cx={PX(p.x)} cy={PY(p.y)} r="4" fill="#11141c" stroke="#ffffff" strokeWidth="1.5" />
        ))}

        {/* Linha realizado (gradiente) */}
        <polyline points={aPath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {/* Pontos Realizados */}
        {actualPts.map((p, i) => {
          const isOrange = p.y < 60; // Just an approximation for the mockup look
          return (
            <g key={`a-${i}`}>
              <circle
                cx={PX(p.x)} cy={PY(p.y)} r="4"
                fill="#11141c" stroke={isOrange ? "#fb923c" : "#22c55e"} strokeWidth="2.5"
                filter={isOrange ? "url(#glowOrange)" : "url(#glowGreen)"}
              />
              <text x={PX(p.x) + (i === actualPts.length-1 ? -16 : 14)} y={PY(p.y) + 18} textAnchor="middle" fontSize="11" fill={isOrange ? "#fb923c" : "#22c55e"} fontWeight="600">
                {fmt(p.y, 0)}%
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

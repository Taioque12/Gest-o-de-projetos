import { fmt } from '../utils/helpers'

export default function CurvaS({ opts, baseline = null, height = 360 }) {
  if (!opts) return null
  const { plannedPts, actualPts, ticks, todayX, prevToday, realToday } = opts
  const W = 800, H = height
  const padL = 48, padR = 32, padT = 24, padB = 40
  const pw = W - padL - padR, ph = H - padT - padB
  const y0 = padT + ph
  const PX = x => padL + x * pw
  const PY = v => y0 - v * (ph / 100)

  const pPath = plannedPts.map(p => `${PX(p.x)},${PY(p.y)}`).join(' ')
  const aPath = actualPts.map(p => `${PX(p.x)},${PY(p.y)}`).join(' ')
  const areaPath = `${PX(actualPts[0].x)},${y0} ${aPath} ${PX(actualPts[actualPts.length - 1].x)},${y0}`
  const hx = PX(todayX)
  const last = actualPts[actualPts.length - 1]

  const desvio = realToday - prevToday
  const desvioPositivo = desvio >= 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
        </linearGradient>
        <filter id="lineShadow" x="-10%" y="-40%" width="120%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#22c55e" floodOpacity="0.35" />
        </filter>
        <filter id="dotGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#22c55e" floodOpacity="0.6" />
        </filter>
        <filter id="labelShadow" x="-20%" y="-40%" width="140%" height="180%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Grid horizontal — linhas mais visíveis no escuro */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line
            x1={padL} y1={PY(v)} x2={W - padR} y2={PY(v)}
            stroke="rgba(255,255,255,.12)"
            strokeWidth={v === 0 || v === 100 ? 1.5 : 1}
          />
          <text x={padL - 10} y={PY(v) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,.5)" fontFamily="Inter, sans-serif" fontWeight="500">
            {v}%
          </text>
        </g>
      ))}

      {/* Ticks eixo X */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PX(t.x)} y1={y0} x2={PX(t.x)} y2={y0 + 4} stroke="rgba(255,255,255,.2)" strokeWidth="1" />
          <text x={PX(t.x)} y={H - 12} textAnchor="middle" fontSize="10.5" fill="rgba(255,255,255,.45)" fontFamily="Inter, sans-serif">
            {t.label}
          </text>
        </g>
      ))}

      {/* Baseline — laranja */}
      {baseline?.pts?.length > 1 && (() => {
        const bPath = baseline.pts.map(pt => `${PX(pt.x)},${PY(pt.y)}`).join(' ')
        const lastBL = baseline.pts[baseline.pts.length - 1]
        return (
          <g>
            <polyline points={bPath} fill="none" stroke="#fb923c" strokeWidth="2" strokeDasharray="8 4" strokeLinejoin="round" opacity="0.9" />
            <circle cx={PX(lastBL.x)} cy={PY(lastBL.y)} r="4" fill="#fb923c" />
            <rect x={PX(lastBL.x) - 14} y={PY(lastBL.y) - 18} width="28" height="14" rx="4" fill="#fb923c" />
            <text x={PX(lastBL.x)} y={PY(lastBL.y) - 8} textAnchor="middle" fontSize="9" fill="#fff" fontFamily="Inter, sans-serif" fontWeight="700">BL</text>
          </g>
        )
      })()}

      {/* Linha previsto — tracejado mais visível */}
      <polyline points={pPath} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2" strokeDasharray="8 5" strokeLinejoin="round" />

      {/* Área realizado */}
      <polygon points={areaPath} fill="url(#areaGrad)" />

      {/* Linha realizado */}
      <polyline points={aPath} fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" filter="url(#lineShadow)" />

      {/* Pontos */}
      {actualPts.map((p, i) => {
        const isLast = i === actualPts.length - 1
        return (
          <circle
            key={i}
            cx={PX(p.x)} cy={PY(p.y)}
            r={isLast ? 6 : 3}
            fill="#22c55e"
            stroke="rgba(0,0,0,.4)"
            strokeWidth={isLast ? 2.5 : 1.5}
            filter={isLast ? 'url(#dotGlow)' : undefined}
          />
        )
      })}

      {/* Label % realizado */}
      <rect x={PX(last.x) + 10} y={PY(realToday) - 11} width="46" height="18" rx="5" fill="#16a34a" />
      <text x={PX(last.x) + 33} y={PY(realToday) + 2} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Inter, sans-serif">
        {fmt(realToday, 0)}%
      </text>

      {/* Linha HOJE — branca tracejada */}
      <line x1={hx} y1={padT} x2={hx} y2={y0} stroke="rgba(255,255,255,.35)" strokeWidth="1.5" strokeDasharray="5 4" />

      {/* Badge HOJE */}
      <rect x={hx - 26} y={padT - 4} width="52" height="19" rx="5" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.3)" strokeWidth="1" />
      <text x={hx} y={padT + 10} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="Inter, sans-serif" letterSpacing="0.5">
        HOJE
      </text>

      {/* Label % previsto — branco visível */}
      <text x={hx + 8} y={PY(prevToday) - 10} fontSize="11" fontWeight="700" fill="rgba(255,255,255,.75)" fontFamily="Inter, sans-serif" filter="url(#labelShadow)">
        {fmt(prevToday, 0)}%
      </text>

      {/* Desvio — destaque com fundo */}
      {desvio !== 0 && (
        <g>
          <rect
            x={hx + 6} y={PY(prevToday) - 2} width="54" height="16" rx="4"
            fill={desvioPositivo ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}
            stroke={desvioPositivo ? 'rgba(34,197,94,.5)' : 'rgba(239,68,68,.5)'}
            strokeWidth="1"
          />
          <text x={hx + 33} y={PY(prevToday) + 10} textAnchor="middle" fontSize="11" fontWeight="800"
            fill={desvioPositivo ? '#4ade80' : '#f87171'}
            fontFamily="Inter, sans-serif">
            {desvio > 0 ? '+' : ''}{fmt(desvio, 1)}pp
          </text>
        </g>
      )}
    </svg>
  )
}

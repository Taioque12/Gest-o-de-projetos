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
  const desvioColor = desvio >= 0 ? '#0f7a3d' : '#dc2626'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        {/* Gradiente área realizado */}
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0f7a3d" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0f7a3d" stopOpacity="0.02" />
        </linearGradient>
        {/* Sombra linha realizado */}
        <filter id="lineShadow" x="-10%" y="-40%" width="120%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f7a3d" floodOpacity="0.25" />
        </filter>
        {/* Brilho ponto final */}
        <filter id="dotGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#0f7a3d" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Fundo levíssimo */}
      <rect x={padL} y={padT} width={pw} height={ph} rx="4" fill="rgba(240,253,244,.4)" />

      {/* Grid horizontal */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line
            x1={padL} y1={PY(v)} x2={W - padR} y2={PY(v)}
            stroke={v === 0 || v === 100 ? '#c8d8d0' : '#e8f0ec'}
            strokeWidth={v === 0 || v === 100 ? 1.5 : 1}
          />
          <text x={padL - 10} y={PY(v) + 4} textAnchor="end" fontSize="11" fill="#7fa090" fontFamily="Inter, sans-serif" fontWeight="500">
            {v}%
          </text>
        </g>
      ))}

      {/* Ticks do eixo X */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PX(t.x)} y1={y0} x2={PX(t.x)} y2={y0 + 4} stroke="#c8d8d0" strokeWidth="1" />
          <text x={PX(t.x)} y={H - 12} textAnchor="middle" fontSize="10.5" fill="#7fa090" fontFamily="Inter, sans-serif">
            {t.label}
          </text>
        </g>
      ))}

      {/* Baseline — laranja tracejado */}
      {baseline?.pts?.length > 1 && (() => {
        const bPath = baseline.pts.map(pt => `${PX(pt.x)},${PY(pt.y)}`).join(' ')
        const lastBL = baseline.pts[baseline.pts.length - 1]
        return (
          <g>
            <polyline points={bPath} fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="8 4" strokeLinejoin="round" opacity="0.75" />
            <circle cx={PX(lastBL.x)} cy={PY(lastBL.y)} r="4" fill="#f97316" opacity="0.8" />
            <rect x={PX(lastBL.x) - 14} y={PY(lastBL.y) - 18} width="28" height="14" rx="4" fill="#f97316" opacity="0.9" />
            <text x={PX(lastBL.x)} y={PY(lastBL.y) - 8} textAnchor="middle" fontSize="9" fill="#fff" fontFamily="Inter, sans-serif" fontWeight="700">BL</text>
          </g>
        )
      })()}

      {/* Linha previsto — tracejado cinza refinado */}
      <polyline points={pPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8 5" strokeLinejoin="round" opacity="0.85" />

      {/* Área realizado com gradiente */}
      <polygon points={areaPath} fill="url(#areaGrad)" />

      {/* Linha realizado com sombra */}
      <polyline points={aPath} fill="none" stroke="#0f7a3d" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" filter="url(#lineShadow)" />

      {/* Pontos na linha realizado */}
      {actualPts.map((p, i) => {
        const isLast = i === actualPts.length - 1
        return (
          <circle
            key={i}
            cx={PX(p.x)} cy={PY(p.y)}
            r={isLast ? 6 : 3}
            fill={isLast ? '#0f7a3d' : '#0f7a3d'}
            stroke="#fff"
            strokeWidth={isLast ? 2.5 : 1.5}
            filter={isLast ? 'url(#dotGlow)' : undefined}
          />
        )
      })}

      {/* Label % realizado */}
      <rect x={PX(last.x) + 10} y={PY(realToday) - 11} width="46" height="18" rx="5" fill="#0f7a3d" />
      <text x={PX(last.x) + 33} y={PY(realToday) + 2} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Inter, sans-serif">
        {fmt(realToday, 0)}%
      </text>

      {/* Linha HOJE */}
      <line x1={hx} y1={padT} x2={hx} y2={y0} stroke="#1e293b" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.4" />

      {/* Badge HOJE */}
      <rect x={hx - 26} y={padT - 4} width="52" height="19" rx="5" fill="#1e293b" />
      <text x={hx} y={padT + 10} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="Inter, sans-serif" letterSpacing="0.5">
        HOJE
      </text>

      {/* Label % previsto + desvio */}
      <text x={hx + 8} y={PY(prevToday) - 10} fontSize="11" fontWeight="600" fill="#64748b" fontFamily="Inter, sans-serif">
        {fmt(prevToday, 0)}%
      </text>
      {desvio !== 0 && (
        <text x={hx + 8} y={PY(prevToday) + 6} fontSize="10" fontWeight="700" fill={desvioColor} fontFamily="Inter, sans-serif">
          {desvio > 0 ? '+' : ''}{fmt(desvio, 1)}pp
        </text>
      )}
    </svg>
  )
}

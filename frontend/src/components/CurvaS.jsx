import { fmt } from '../utils/helpers'

export default function CurvaS({ opts, height = 340 }) {
  if (!opts) return null
  const { plannedPts, actualPts, ticks, todayX, prevToday, realToday } = opts
  const W = 800, H = height
  const padL = 44, padR = 24, padT = 18, padB = 36
  const pw = W - padL - padR, ph = H - padT - padB
  const y0 = padT + ph
  const PX = x => padL + x * pw
  const PY = v => y0 - v * (ph / 100)

  const pPath = plannedPts.map(p => `${PX(p.x)},${PY(p.y)}`).join(' ')
  const aPath = actualPts.map(p => `${PX(p.x)},${PY(p.y)}`).join(' ')
  const areaPath = `${PX(actualPts[0].x)},${y0} ${aPath} ${PX(actualPts[actualPts.length - 1].x)},${y0}`
  const hx = PX(todayX)
  const last = actualPts[actualPts.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={padL} y1={PY(v)} x2={W - padR} y2={PY(v)} stroke="#eef2f0" strokeWidth="1" />
          <text x={padL - 8} y={PY(v) + 4} textAnchor="end" fontSize="11" fill="#90a298" fontFamily="Inter">{v}%</text>
        </g>
      ))}

      {ticks.map((t, i) => (
        <text key={i} x={PX(t.x)} y={H - 14} textAnchor="middle" fontSize="10.5" fill="#90a298" fontFamily="Inter">{t.label}</text>
      ))}

      <line x1={hx} y1={padT} x2={hx} y2={y0} stroke="#c4cfc8" strokeWidth="1.5" strokeDasharray="4 4" />
      <rect x={hx - 22} y={padT - 3} width="44" height="17" rx="4" fill="#102018" />
      <text x={hx} y={padT + 9} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Inter">HOJE</text>

      <polyline points={pPath} fill="none" stroke="#90a298" strokeWidth="2.5" strokeDasharray="7 5" strokeLinejoin="round" />

      <polygon points={areaPath} fill="rgba(15,122,61,.10)" />
      <polyline points={aPath} fill="none" stroke="#0f7a3d" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />

      {actualPts.map((p, i) => (
        <circle key={i} cx={PX(p.x)} cy={PY(p.y)} r={i === actualPts.length - 1 ? 5 : 3} fill="#0f7a3d" stroke="#fff" strokeWidth="2" />
      ))}

      <text x={PX(last.x) + 8} y={PY(realToday) + 4} fontSize="12" fontWeight="800" fill="#0f7a3d" fontFamily="Inter">{fmt(realToday, 0)}%</text>
      <text x={hx + 8} y={PY(prevToday) - 7} fontSize="12" fontWeight="700" fill="#64748b" fontFamily="Inter">{fmt(prevToday, 0)}%</text>
    </svg>
  )
}

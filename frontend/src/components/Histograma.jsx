import { fmt } from '../utils/helpers'

// Cores
const C_PREV   = '#E0A82E' // barras: profissionais previstos (âmbar)
const C_MOB    = '#0f7a3d' // barras: profissionais mobilizados (verde marca)
const C_LINEP  = '#90a298' // linha: avanço previsto (cinza tracejado)
const C_LINER  = '#2563EB' // linha: avanço realizado (azul)
const C_GRID   = '#eef2f0'
const C_AXIS   = '#90a298'

export default function Histograma({ opts, height = 360 }) {
  if (!opts) return null
  const { plannedPts, actualPts, ticks, todayX, prevToday, realToday, bars, maxEf } = opts

  const W = 820, H = height
  const padL = 44, padR = 46, padT = 38, padB = 40
  const pw = W - padL - padR, ph = H - padT - padB
  const y0 = padT + ph
  const PX  = x => padL + x * pw
  const PY  = v => y0 - v * (ph / 100)      // eixo esquerdo: % (Curva S)
  const PYe = v => y0 - v * (ph / maxEf)     // eixo direito: nº profissionais

  const pPath = plannedPts.map(p => `${PX(p.x)},${PY(p.y)}`).join(' ')
  const aPath = actualPts.map(p => `${PX(p.x)},${PY(p.y)}`).join(' ')
  const hx = PX(todayX)
  const last = actualPts[actualPts.length - 1]

  // Geometria das barras agrupadas (previstos | mobilizados)
  const spacing = bars.length ? pw / bars.length : pw
  const bw = Math.max(2, Math.min(15, spacing / 2 - 1))
  const showNums = bars.length > 0 && bars.length <= 12

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Legenda */}
      <g fontFamily="Inter" fontSize="11" fill="#64748b">
        <rect x={padL}      y={8} width="13" height="10" rx="2" fill={C_PREV} />
        <text x={padL + 18} y={17}>Previstos</text>
        <rect x={padL + 84} y={8} width="13" height="10" rx="2" fill={C_MOB} />
        <text x={padL + 102} y={17}>Mobilizados</text>
        <line x1={padL + 184} y1={13} x2={padL + 206} y2={13} stroke={C_LINEP} strokeWidth="2.5" strokeDasharray="6 4" />
        <text x={padL + 211} y={17}>Previsto %</text>
        <line x1={padL + 286} y1={13} x2={padL + 308} y2={13} stroke={C_LINER} strokeWidth="3" />
        <text x={padL + 313} y={17}>Realizado %</text>
      </g>

      {/* Grade + eixo esquerdo (%) e direito (nº) */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={padL} y1={PY(v)} x2={W - padR} y2={PY(v)} stroke={C_GRID} strokeWidth="1" />
          <text x={padL - 8} y={PY(v) + 4} textAnchor="end" fontSize="11" fill={C_AXIS} fontFamily="Inter">{v}%</text>
          <text x={W - padR + 8} y={PY(v) + 4} textAnchor="start" fontSize="11" fill={C_AXIS} fontFamily="Inter">
            {Math.round(maxEf * v / 100)}
          </text>
        </g>
      ))}

      {/* Barras de efetivo */}
      {bars.map((b, i) => {
        const cx = PX(b.x)
        return (
          <g key={i}>
            <title>{b.label} · previstos: {b.prev}{b.mob != null ? ` · mobilizados: ${b.mob}` : ''}</title>
            {/* previstos */}
            <rect x={cx - bw - 1} y={PYe(b.prev)} width={bw} height={Math.max(0, y0 - PYe(b.prev))} fill={C_PREV} opacity="0.9" rx="1" />
            {showNums && b.prev > 0 && (
              <text x={cx - bw / 2 - 1} y={PYe(b.prev) - 3} textAnchor="middle" fontSize="8" fill={C_PREV} fontFamily="Inter" fontWeight="700">{b.prev}</text>
            )}
            {/* mobilizados */}
            {b.mob != null && (
              <>
                <rect x={cx + 1} y={PYe(b.mob)} width={bw} height={Math.max(0, y0 - PYe(b.mob))} fill={C_MOB} opacity="0.9" rx="1" />
                {showNums && b.mob > 0 && (
                  <text x={cx + bw / 2 + 1} y={PYe(b.mob) - 3} textAnchor="middle" fontSize="8" fill={C_MOB} fontFamily="Inter" fontWeight="700">{b.mob}</text>
                )}
              </>
            )}
          </g>
        )
      })}

      {/* Rótulos do eixo X */}
      {ticks.map((t, i) => (
        <text key={i} x={PX(t.x)} y={H - 14} textAnchor="middle" fontSize="10.5" fill={C_AXIS} fontFamily="Inter">{t.label}</text>
      ))}

      {/* Linha HOJE */}
      <line x1={hx} y1={padT} x2={hx} y2={y0} stroke="#c4cfc8" strokeWidth="1.5" strokeDasharray="4 4" />
      <rect x={hx - 22} y={padT - 3} width="44" height="17" rx="4" fill="#102018" />
      <text x={hx} y={padT + 9} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Inter">HOJE</text>

      {/* Curva S — previsto (tracejado) e realizado (sólido) */}
      <polyline points={pPath} fill="none" stroke={C_LINEP} strokeWidth="2.5" strokeDasharray="7 5" strokeLinejoin="round" />
      <polyline points={aPath} fill="none" stroke={C_LINER} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {actualPts.map((p, i) => (
        <circle key={i} cx={PX(p.x)} cy={PY(p.y)} r={i === actualPts.length - 1 ? 4.5 : 2.5} fill={C_LINER} stroke="#fff" strokeWidth="1.5" />
      ))}

      {/* Valores de hoje */}
      <text x={PX(last.x) + 8} y={PY(realToday) + 4} fontSize="12" fontWeight="800" fill={C_LINER} fontFamily="Inter">{fmt(realToday, 0)}%</text>
      <text x={hx + 8} y={PY(prevToday) - 7} fontSize="12" fontWeight="700" fill="#64748b" fontFamily="Inter">{fmt(prevToday, 0)}%</text>
    </svg>
  )
}

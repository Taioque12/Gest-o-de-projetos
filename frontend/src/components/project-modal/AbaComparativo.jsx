import { lazy, Suspense } from 'react'
const CurvaS = lazy(() => import('../CurvaS'))

export default function AbaComparativo({ p, curveOpts, baselineOpts, baselineAtivo }) {
  if (!baselineAtivo) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-3)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📐</div>
      <p style={{ fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Nenhum baseline congelado</p>
      <p style={{ fontSize: 13 }}>Vá em Visão Geral → Baseline do planejamento e congele o planejamento original.</p>
    </div>
  )

  const blInicio = new Date(baselineAtivo.inicio_original + 'T00:00:00')
  const blFim    = new Date(baselineAtivo.fim_original    + 'T00:00:00')
  const atInicio = new Date(p.inicio + 'T00:00:00')
  const atFim    = new Date(p.fim    + 'T00:00:00')
  const blDias   = Math.round((blFim - blInicio) / 86400000)
  const atDias   = Math.round((atFim - atInicio) / 86400000)
  const deltaFim = Math.round((atFim - blFim) / 86400000)
  const deltaDur = atDias - blDias
  const deltaPrev = +(p.prev - Number(baselineAtivo.prev_original)).toFixed(1)
  const deltaReal = +(p.real - Number(baselineAtivo.prev_original)).toFixed(1)
  const semDesvio = v => v === 0 ? 'var(--ink-2)' : v > 0 ? 'var(--verde)' : 'var(--vermelho)'
  const prazoColor = deltaFim <= 0 ? 'var(--verde)' : deltaFim <= 14 ? '#ca8a04' : 'var(--vermelho)'
  const fmt2 = (v, suf = '') => `${v > 0 ? '+' : ''}${v}${suf}`
  const fmtDate2 = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      {/* Cards de desvio */}
      <div className="m-sec">
        <h4>📐 Desvio vs. Baseline — <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 12 }}>{baselineAtivo.descricao || fmtDate2(new Date(baselineAtivo.data_congelamento + 'T00:00:00'))}</span></h4>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          {[
            { label: 'Atraso no término', value: fmt2(deltaFim, ' dias'), color: prazoColor, hint: deltaFim > 0 ? 'prazo estendido' : deltaFim < 0 ? 'prazo antecipado' : 'no prazo' },
            { label: 'Δ Duração', value: fmt2(deltaDur, ' dias'), color: semDesvio(-deltaDur), hint: `BL: ${blDias} dias → Atual: ${atDias} dias` },
            { label: 'Previsto vs. BL', value: fmt2(deltaPrev, ' p.p.'), color: semDesvio(deltaPrev), hint: `BL: ${baselineAtivo.prev_original}% → Atual: ${p.prev}%` },
            { label: 'Realizado vs. BL prev.', value: fmt2(deltaReal, ' p.p.'), color: semDesvio(deltaReal), hint: `BL prev: ${baselineAtivo.prev_original}% → Real: ${p.real}%` },
          ].map(card => (
            <div key={card.label} style={{ flex: '1 1 140px', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: card.color, lineHeight: 1.2 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{card.hint}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela comparativa */}
      <div className="m-sec">
        <h4>📋 Baseline × Atual</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--line)' }}>
              {['', 'Baseline', 'Atual', 'Δ'].map(h => (
                <th key={h} style={{ textAlign: h === '' ? 'left' : 'center', padding: '6px 10px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Início',     bl: fmtDate2(blInicio), at: fmtDate2(atInicio), delta: fmt2(Math.round((atInicio-blInicio)/86400000), ' dias'), dv: Math.round((atInicio-blInicio)/86400000) },
              { label: 'Término',    bl: fmtDate2(blFim),    at: fmtDate2(atFim),    delta: fmt2(deltaFim, ' dias'), dv: deltaFim },
              { label: 'Duração',    bl: `${blDias} dias`,   at: `${atDias} dias`,   delta: fmt2(deltaDur, ' dias'), dv: -deltaDur },
              { label: '% Previsto', bl: `${baselineAtivo.prev_original}%`, at: `${p.prev}%`, delta: fmt2(deltaPrev, ' p.p.'), dv: deltaPrev },
              { label: '% Realizado',bl: `—`,                at: `${p.real}%`,       delta: fmt2(deltaReal, ' p.p. vs BL prev.'), dv: deltaReal },
            ].map((row, i) => (
              <tr key={row.label} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'var(--surface-2)' : 'transparent' }}>
                <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--ink-2)' }}>{row.label}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center', color: '#f97316', fontWeight: 600 }}>{row.bl}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600 }}>{row.at}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: semDesvio(row.dv) }}>{row.delta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="m-sec" style={{ marginTop: 24 }}>
        <h4>📈 Gráfico comparativo de Curva S</h4>
        <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando gráfico...</div>}>
          <CurvaS opts={curveOpts} baseline={baselineOpts} />
        </Suspense>
      </div>
    </>
  )
}

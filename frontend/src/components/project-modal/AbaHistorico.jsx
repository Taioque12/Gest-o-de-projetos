import { classify, fmt } from '../../utils/helpers'

export default function AbaHistorico({ hist }) {
  if (hist.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
        <p>Nenhuma atualização registrada ainda.</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'var(--line)' }} />
      {hist.map((h, i) => {
        const prev = hist[i + 1]
        const deltaReal = prev ? h.avanco_realizado - prev.avanco_realizado : null
        const d = new Date(h.data_atualizacao)
        const dataFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        const cl = classify(h.avanco_previsto, h.avanco_realizado)
        return (
          <div key={h.id ?? i} style={{ position: 'relative', marginBottom: 20, paddingLeft: 16 }}>
            <div style={{ position: 'absolute', left: -17, top: 4, width: 10, height: 10, borderRadius: '50%', background: `var(--${cl.k})`, border: '2px solid var(--surface)' }} />
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span>{dataFmt}</span>
              {h.lancado_por && <span>· {h.lancado_por}</span>}
              {h.origem && h.origem !== 'manual' && (
                <span style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h.origem}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Previsto: {fmt(h.avanco_previsto)}%</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Realizado: {fmt(h.avanco_realizado)}%</span>
              {deltaReal !== null && (
                <span style={{ fontSize: 12, color: deltaReal >= 0 ? 'var(--verde)' : 'var(--vermelho)' }}>
                  {deltaReal >= 0 ? '+' : ''}{fmt(deltaReal)} p.p.
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: `var(--${cl.k})`, marginTop: 2 }}>{cl.emo} {cl.lbl}</div>
          </div>
        )
      })}
    </div>
  )
}

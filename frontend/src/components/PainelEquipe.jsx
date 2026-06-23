function corNota(n) {
  if (n >= 7) return { bar: '#16a34a', txt: '#166534', bg: '#dcfce7', label: 'Coberto' }
  if (n >= 5) return { bar: '#ca8a04', txt: '#92400e', bg: '#fef9c3', label: 'Intermediário' }
  return             { bar: '#dc2626', txt: '#991b1b', bg: '#fee2e2', label: 'Gap crítico' }
}

export default function PainelEquipe({ selecionados, habilidades = [], onRemover, onLimpar }) {
  if (selecionados.length === 0) return null

  const cobertura = habilidades.map(h => {
    const max = Math.max(...selecionados.map(f => parseFloat(f.avaliacoes?.[h.id] ?? 0)))
    return { id: h.id, label: h.nome, max }
  })

  const gaps      = cobertura.filter(c => c.max < 5)
  const atencao   = cobertura.filter(c => c.max >= 5 && c.max < 7)
  const equilibrio = cobertura.length
    ? (cobertura.reduce((s, c) => s + c.max, 0) / cobertura.length).toFixed(1)
    : '—'
  const corEq = parseFloat(equilibrio) >= 7 ? '#166534' : parseFloat(equilibrio) >= 5 ? '#92400e' : '#991b1b'

  return (
    <div className="painel-equipe">
      <div className="painel-equipe-header">
        <div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>👷 Equipe Montada</span>
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ink-3)' }}>
            {selecionados.length} pessoa{selecionados.length > 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: corEq, lineHeight: 1 }}>{equilibrio}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>Equilíbrio</div>
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--ink-3)' }} onClick={onLimpar}>
            Limpar
          </button>
        </div>
      </div>

      <div className="painel-membros">
        {selecionados.map(f => (
          <div key={f.id} className="painel-membro">
            <div className="painel-membro-avatar">{f.nome.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nome}</div>
              {f.cargo && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{f.cargo}</div>}
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14, padding: 2 }} onClick={() => onRemover(f.id)}>×</button>
          </div>
        ))}
      </div>

      {cobertura.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--ink-2)', marginBottom: 8 }}>
            Cobertura da equipe (nota máxima por área)
          </div>
          {cobertura.map(({ id, label, max }) => {
            const c = corNota(max)
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11.5, width: 170, flexShrink: 0, color: 'var(--ink)' }}>{label}</span>
                <div style={{ flex: 1, height: 7, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${max * 10}%`, height: '100%', background: c.bar, borderRadius: 4, transition: '.3s' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.txt, width: 20, textAlign: 'right' }}>{max}</span>
                <span style={{ fontSize: 10, background: c.bg, color: c.txt, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap', minWidth: 76 }}>{c.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {gaps.length > 0 && (
        <div className="painel-alerta painel-alerta-red">
          ⚠️ <b>Gaps críticos:</b> {gaps.map(g => g.label).join(', ')} — nenhum membro tem nota suficiente nestas áreas.
        </div>
      )}
      {gaps.length === 0 && atencao.length > 0 && (
        <div className="painel-alerta painel-alerta-yellow">
          🟡 <b>Atenção:</b> {atencao.map(g => g.label).join(', ')} — cobertura intermediária, considere reforço.
        </div>
      )}
      {gaps.length === 0 && atencao.length === 0 && cobertura.length > 0 && (
        <div className="painel-alerta painel-alerta-green">
          ✅ Equipe equilibrada! Boa cobertura em todas as competências.
        </div>
      )}
    </div>
  )
}

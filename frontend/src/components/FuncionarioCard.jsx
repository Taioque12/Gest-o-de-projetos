function corNota(n) {
  if (n >= 8) return { bg: '#dcfce7', txt: '#166534', bar: '#16a34a' }
  if (n >= 5) return { bg: '#fef9c3', txt: '#92400e', bar: '#ca8a04' }
  return              { bg: '#fee2e2', txt: '#991b1b', bar: '#dc2626' }
}

function mediaGeral(f, habilidades) {
  if (!habilidades.length) return '—'
  const vals = habilidades.map(h => parseFloat(f.avaliacoes?.[h.id] ?? 0))
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
}

export default function FuncionarioCard({ funcionario: f, habilidades = [], onEditar, onExcluir, selecionado, onToggleSeleção }) {
  const media    = mediaGeral(f, habilidades)
  const corMedia = media !== '—' ? corNota(parseFloat(media)) : { txt: 'var(--ink-3)' }

  return (
    <div className={`func-card${selecionado ? ' func-card-sel' : ''}`}>
      <div className="func-card-top">
        {f.foto_url
          ? <img src={f.foto_url} alt={f.nome} className="func-avatar" style={{ objectFit: 'cover' }} />
          : <div className="func-avatar">{f.nome.charAt(0).toUpperCase()}</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="func-nome">{f.nome}</div>
          {f.cargo  && <div className="func-sub">{f.cargo}</div>}
          {f.equipe && <div className="func-equipe">{f.equipe}</div>}
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: corMedia.txt }}>{media}</div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase' }}>Média</div>
        </div>
      </div>

      {habilidades.length > 0 && (
        <div className="func-competencias">
          {habilidades.map(h => {
            const n = parseFloat(f.avaliacoes?.[h.id] ?? 0)
            const c = corNota(n)
            return (
              <div key={h.id} className="func-comp-row">
                <span className="func-comp-label">{h.nome}</span>
                <div className="func-comp-bar-wrap">
                  <div className="func-comp-bar" style={{ width: `${n * 10}%`, background: c.bar }} />
                </div>
                <span className="func-comp-nota" style={{ color: c.txt }}>{n}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="func-actions">
        <button
          className={`btn func-btn func-btn-sel${selecionado ? ' ativo' : ''}`}
          onClick={onToggleSeleção}
          title={selecionado ? 'Remover da equipe' : 'Adicionar à equipe'}
        >
          {selecionado ? '✅ Na equipe' : '➕ Adicionar à equipe'}
        </button>
        <button className="btn btn-ghost func-btn" onClick={onEditar}>✏️</button>
        <button className="btn btn-ghost func-btn func-btn-del" onClick={onExcluir}>🗑️</button>
      </div>
    </div>
  )
}

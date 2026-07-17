import { useState } from 'react'

export default function ModalHabilidades({ habilidades, onCriar, onExcluir, onFechar, onErro }) {
  const [novaHab, setNovaHab] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleCriar(e) {
    e.preventDefault()
    if (!novaHab.trim()) { setErro('Digite o nome da habilidade.'); return }
    if (habilidades.some(h => h.nome.toLowerCase() === novaHab.trim().toLowerCase())) {
      setErro('Habilidade já existe.'); return
    }
    setSalvando(true)
    setErro('')
    try {
      await onCriar(novaHab)
      setNovaHab('')
    } catch (err) {
      setErro('Erro: ' + err.message)
    }
    setSalvando(false)
  }

  async function handleExcluir(h) {
    if (!window.confirm(`Remover "${h.nome}"?\n\nAs notas existentes serão preservadas, mas a habilidade não aparecerá mais em novos cadastros.`)) return
    try {
      await onExcluir(h.id)
    } catch (err) {
      onErro('Erro: ' + err.message)
    }
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-head verde">
          <button className="close" onClick={onFechar}>×</button>
          <h2>⚙️ Gerenciar Habilidades</h2>
          <p>Defina as áreas técnicas avaliadas em todos os colaboradores</p>
        </div>
        <div className="modal-body">
          <form onSubmit={handleCriar} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              value={novaHab}
              onChange={e => { setNovaHab(e.target.value); setErro('') }}
              placeholder="Ex: Automação Industrial, Fibra Óptica..."
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-login"
              style={{ width: 'auto', padding: '10px 18px', margin: 0, whiteSpace: 'nowrap' }}
              disabled={salvando}
            >
              {salvando ? '...' : '+ Adicionar'}
            </button>
          </form>
          {erro && <div className="form-erro" style={{ marginTop: -12, marginBottom: 12 }}>{erro}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {habilidades.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '16px 0' }}>
                Nenhuma habilidade cadastrada. Adicione a primeira acima.
              </p>
            )}
            {habilidades.map((h, i) => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: 'var(--surface-2)', border: '1px solid var(--line)',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, minWidth: 0, wordBreak: 'break-word' }}>{h.nome}</span>
                <button
                  onClick={() => handleExcluir(h)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#dc2626', fontSize: 16, padding: '2px 6px', borderRadius: 4,
                    lineHeight: 1,
                  }}
                  title="Remover habilidade"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 12, color: '#166534' }}>
            💡 <b>Multi-empresa:</b> Cada empresa terá seu próprio conjunto de habilidades. As habilidades aqui configuradas se aplicam a todos os colaboradores desta empresa.
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" style={{ color: 'var(--ink)', border: '1px solid var(--line)' }} onClick={onFechar}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

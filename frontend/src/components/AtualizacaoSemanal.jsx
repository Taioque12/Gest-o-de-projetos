import { useState, useEffect } from 'react'

export default function AtualizacaoSemanal({ projetos, onSalvar, onFechar, salvando }) {
  const hoje = new Date().toISOString().slice(0, 10)
  const [data, setData] = useState(hoje)
  const [linhas, setLinhas] = useState([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    setLinhas(projetos.map(p => ({
      id:       p.id,
      os:       p.os,
      nome:     p.nome,
      prevOrig: p.prev ?? 0,
      realOrig: p.real ?? 0,
      prev:     p.prev ?? 0,
      real:     p.real ?? 0,
    })))
  }, [projetos])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  function setVal(id, campo, valor) {
    const n = Math.min(100, Math.max(0, parseFloat(valor) || 0))
    setLinhas(ls => ls.map(l => l.id === id ? { ...l, [campo]: n } : l))
  }

  const alteradas = linhas.filter(l => l.prev !== l.prevOrig || l.real !== l.realOrig)

  async function handleSalvar() {
    if (!data) { setErro('Selecione a data de referência.'); return }
    if (alteradas.length === 0) { setErro('Nenhum valor foi alterado.'); return }
    setErro('')
    await onSalvar(data, alteradas.map(l => ({ id: l.id, prev: l.prev, real: l.real })))
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal" style={{ maxWidth: 820 }}>
        <div className="modal-head verde">
          <button className="close" onClick={onFechar}>×</button>
          <h2>📅 Atualização Semanal de Avanço</h2>
          <p>Registre o avanço previsto e realizado de cada projeto para a semana.</p>
        </div>

        <div className="modal-body">
          {erro && <div className="form-erro">{erro}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <label style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>Data de referência</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              style={{ width: 180 }}
            />
            {alteradas.length > 0 && (
              <span style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600 }}>
                {alteradas.length} projeto(s) alterado(s)
              </span>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--ink-2)', fontWeight: 600 }}>OS</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--ink-2)', fontWeight: 600 }}>Projeto</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--ink-2)', fontWeight: 600 }}>Previsto atual</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--ink-2)', fontWeight: 600 }}>Realizado atual</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--brand)', fontWeight: 600 }}>Novo previsto %</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--brand)', fontWeight: 600 }}>Novo realizado %</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(l => {
                  const alterada = l.prev !== l.prevOrig || l.real !== l.realOrig
                  return (
                    <tr key={l.id} style={{
                      borderBottom: '1px solid var(--line)',
                      background: alterada ? 'rgba(15,122,61,.04)' : 'transparent',
                      transition: '.15s'
                    }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{l.os}</td>
                      <td style={{ padding: '8px 10px', maxWidth: 220 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nome}</span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--ink-3)' }}>{l.prevOrig}%</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--ink-3)' }}>{l.realOrig}%</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={l.prev}
                          onChange={e => setVal(l.id, 'prev', e.target.value)}
                          style={{ width: 72, textAlign: 'center', borderColor: alterada ? 'var(--brand)' : undefined }}
                        />
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={l.real}
                          onChange={e => setVal(l.id, 'real', e.target.value)}
                          style={{ width: 72, textAlign: 'center', borderColor: alterada ? 'var(--brand)' : undefined }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-ghost"
              style={{ color: 'var(--ink)', border: '1px solid var(--line)' }}
              onClick={onFechar}>
              Cancelar
            </button>
            <button
              className="btn-login"
              style={{ width: 'auto', padding: '10px 28px', margin: 0 }}
              onClick={handleSalvar}
              disabled={salvando || alteradas.length === 0}
            >
              {salvando ? 'Salvando...' : `Salvar ${alteradas.length > 0 ? `(${alteradas.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

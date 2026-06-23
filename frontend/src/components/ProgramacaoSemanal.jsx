import { useState, useMemo, useCallback } from 'react'

const MS_WEEK = 7 * 24 * 3600 * 1000

function toISO(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtWeek(iso) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function ProgramacaoSemanal({ projeto: p, funcionarios, alocacoes, onAlocar, podeEditar, onSincronizar, sincronizando }) {
  const semanas = useMemo(() => {
    const arr = []
    let ms = p._s
    while (ms <= p._e) { arr.push(toISO(ms)); ms += MS_WEEK }
    return arr
  }, [p._s, p._e])

  const dbGrid = useMemo(() => {
    const g = {}
    for (const a of alocacoes) g[`${a.funcionario_id}__${a.data_semana}`] = a.dias
    return g
  }, [alocacoes])

  const [localEdits, setLocalEdits] = useState({})
  const [saving, setSaving] = useState({})

  const getDias = useCallback((fid, semana) => {
    const key = `${fid}__${semana}`
    return localEdits[key] !== undefined ? localEdits[key] : (dbGrid[key] ?? '')
  }, [localEdits, dbGrid])

  function handleChange(fid, semana, val) {
    const v = val === '' ? '' : Math.max(0, Math.min(7, Number(val)))
    setLocalEdits(e => ({ ...e, [`${fid}__${semana}`]: v }))
  }

  async function handleBlur(fid, semana) {
    const key = `${fid}__${semana}`
    if (localEdits[key] === undefined) return
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await onAlocar({ funcionario_id: fid, data_semana: semana, dias: localEdits[key] === '' ? 0 : Number(localEdits[key]) })
      setLocalEdits(e => { const n = { ...e }; delete n[key]; return n })
    } catch { /* silently ignore — DB offline */ }
    setSaving(s => { const n = { ...s }; delete n[key]; return n })
  }

  // Count of people with dias > 0 per week (feeds the Histograma "mobilizados")
  const totals = useMemo(() => {
    const t = {}
    for (const s of semanas) {
      t[s] = funcionarios.filter(f => {
        const key = `${f.id}__${s}`
        const v = localEdits[key] !== undefined ? localEdits[key] : (dbGrid[key] ?? 0)
        return Number(v) > 0
      }).length
    }
    return t
  }, [semanas, funcionarios, dbGrid, localEdits])

  const hojeISO = toISO(Date.now())

  if (!funcionarios.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 13 }}>
        <p>Nenhum funcionário cadastrado ainda.</p>
        <p style={{ fontSize: 11, marginTop: 4 }}>Acesse a aba Equipes para cadastrar a equipe.</p>
      </div>
    )
  }

  const thBase = { padding: '8px 4px', borderBottom: '2px solid var(--line)', textAlign: 'center', fontSize: 11, whiteSpace: 'nowrap' }
  const tdFoot = { textAlign: 'center', fontSize: 12, padding: '6px 4px' }

  return (
    <div>
      <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--line)' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={{ ...thBase, textAlign: 'left', padding: '8px 12px', position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 4, minWidth: 160, borderRight: '1px solid var(--line)', fontWeight: 700 }}>
                Profissional / Equipe
              </th>
              {semanas.map(s => {
                const weekEnd = toISO(new Date(s).getTime() + MS_WEEK)
                const isAtual = s <= hojeISO && hojeISO < weekEnd
                return (
                  <th key={s} style={{ ...thBase, minWidth: 52, color: isAtual ? 'var(--brand)' : 'var(--ink-2)', fontWeight: isAtual ? 700 : 500, background: isAtual ? 'rgba(37,99,235,.07)' : 'var(--surface-2)' }}>
                    {fmtWeek(s)}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {funcionarios.map((f, fi) => {
              const rowBg = fi % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)'
              return (
                <tr key={f.id} style={{ background: rowBg }}>
                  <td style={{ padding: '6px 12px', position: 'sticky', left: 0, background: rowBg, zIndex: 1, borderRight: '1px solid var(--line)', minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nome}</div>
                    {f.equipe && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{f.equipe}</div>}
                  </td>
                  {semanas.map(s => {
                    const key = `${f.id}__${s}`
                    const val = getDias(f.id, s)
                    const dias = Number(val) || 0
                    const hasVal = dias > 0
                    const isSaving = saving[key]
                    return (
                      <td key={s} style={{ textAlign: 'center', padding: '3px 4px' }}>
                        {podeEditar ? (
                          <input
                            type="number" min="0" max="7"
                            value={val}
                            onChange={e => handleChange(f.id, s, e.target.value)}
                            onBlur={() => handleBlur(f.id, s)}
                            style={{
                              width: 42, textAlign: 'center', padding: '3px 2px',
                              borderRadius: 6,
                              border: hasVal ? '1.5px solid #0f7a3d' : '1px solid var(--line)',
                              background: isSaving ? 'var(--surface-2)' : hasVal ? 'rgba(15,122,61,.10)' : 'var(--surface)',
                              color: hasVal ? '#0f7a3d' : 'var(--ink-3)',
                              fontSize: 12, fontWeight: hasVal ? 700 : 400, outline: 'none',
                            }}
                          />
                        ) : (
                          <span style={{ color: hasVal ? '#0f7a3d' : 'var(--ink-3)', fontWeight: hasVal ? 700 : 400 }}>
                            {hasVal ? `${dias}d` : '—'}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>

          <tfoot>
            <tr style={{ borderTop: '2px solid var(--line)', background: 'var(--surface-2)' }}>
              <td style={{ ...tdFoot, textAlign: 'left', padding: '6px 12px', position: 'sticky', left: 0, background: 'var(--surface-2)', fontWeight: 700, borderRight: '1px solid var(--line)', zIndex: 1 }}>
                Mobilizados
              </td>
              {semanas.map(s => {
                const tot = totals[s]
                return (
                  <td key={s} style={{ ...tdFoot, fontWeight: tot > 0 ? 700 : 400, color: tot > 0 ? '#0f7a3d' : 'var(--ink-3)' }}>
                    {tot > 0 ? tot : '—'}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {podeEditar && (
        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => onSincronizar(semanas, totals)}
            disabled={sincronizando}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: sincronizando ? 0.6 : 1 }}
          >
            {sincronizando ? 'Atualizando...' : 'Sincronizar → Histograma'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            Atualiza os "Mobilizados" do Histograma com a contagem desta tabela.
          </span>
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-3)' }}>
        Digite 0–7 dias por célula e pressione Tab/Enter para salvar. A linha "Mobilizados" é atualizada ao sincronizar com o Histograma.
      </div>
    </div>
  )
}

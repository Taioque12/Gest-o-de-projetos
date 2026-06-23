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

export default function ProgramacaoSemanal({ projeto: p, funcionarios, alocacoes, onAlocar, podeEditar }) {
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
  const [saving, setSaving]         = useState({})
  // #2 — conflito: { [fid__semana]: totalDiasOutrosProjetos }
  const [conflitos, setConflitos]   = useState({})

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
      const diasNovos = localEdits[key] === '' ? 0 : Number(localEdits[key])
      // #1 — alocar() agora auto-sincroniza efetivo_semana e retorna conflitos externos
      const conflitosExternos = await onAlocar({ funcionario_id: fid, data_semana: semana, dias: diasNovos })
      setLocalEdits(e => { const n = { ...e }; delete n[key]; return n })
      // #2 — atualiza alerta de conflito para esta célula
      const totalOutros = (conflitosExternos ?? []).reduce((s, c) => s + (c.dias || 0), 0)
      setConflitos(c => ({ ...c, [key]: totalOutros }))
    } catch { /* DB offline */ }
    setSaving(s => { const n = { ...s }; delete n[key]; return n })
  }

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
                    const key       = `${f.id}__${s}`
                    const val       = getDias(f.id, s)
                    const dias      = Number(val) || 0
                    const hasVal    = dias > 0
                    const isSaving  = saving[key]
                    const outrosDias = conflitos[key] ?? 0
                    // #2 — conflito: funcionário já tem horas em outro projeto e o total passa de 5d
                    const temConflito = hasVal && outrosDias > 0 && (dias + outrosDias) > 5

                    const borderColor = temConflito ? '#dc2626' : hasVal ? '#0f7a3d' : 'var(--line)'
                    const bgColor     = isSaving
                      ? 'var(--surface-2)'
                      : temConflito ? 'rgba(220,38,38,.12)'
                      : hasVal      ? 'rgba(15,122,61,.10)'
                      : 'var(--surface)'
                    const textColor   = temConflito ? '#dc2626' : hasVal ? '#0f7a3d' : 'var(--ink-3)'

                    return (
                      <td key={s} style={{ textAlign: 'center', padding: '3px 4px' }}>
                        {podeEditar ? (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <input
                              type="number" min="0" max="7"
                              value={val}
                              onChange={e => handleChange(f.id, s, e.target.value)}
                              onBlur={() => handleBlur(f.id, s)}
                              title={temConflito ? `⚠ ${f.nome} já tem ${outrosDias}d em outro projeto esta semana (total: ${dias + outrosDias}d)` : ''}
                              style={{
                                width: 42, textAlign: 'center', padding: '3px 2px',
                                borderRadius: 6,
                                border: `${temConflito ? 2 : hasVal ? 1.5 : 1}px solid ${borderColor}`,
                                background: bgColor,
                                color: textColor,
                                fontSize: 12, fontWeight: hasVal ? 700 : 400, outline: 'none',
                              }}
                            />
                            {temConflito && (
                              <span style={{ position: 'absolute', top: -6, right: -6, fontSize: 10, lineHeight: 1 }} title={`${f.nome} já tem ${outrosDias}d em outro projeto esta semana`}>⚠</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: textColor, fontWeight: hasVal ? 700 : 400 }}>
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

      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-3)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>Digite 0–7 dias e pressione Tab para salvar. O Histograma é atualizado automaticamente.</span>
        <span style={{ color: '#92400e' }}>⚠ = conflito com outro projeto na mesma semana.</span>
      </div>
    </div>
  )
}

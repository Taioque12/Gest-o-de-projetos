import { useMemo } from 'react'

const MS_WEEK = 7 * 24 * 3600 * 1000

function toISO(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtWeek(iso) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function ProgramacaoGlobal({ funcionarios, alocacoes, projetos }) {
  // Usa as datas reais do banco como colunas — evita desalinhamento com as
  // semanas geradas pelos projetos (que partem da data_inicio de cada OS)
  const semanas = useMemo(() => {
    const seen = new Set(alocacoes.map(a => a.data_semana))
    return [...seen].sort()
  }, [alocacoes])
  const hojeISO = toISO(Date.now())

  // Mapa projeto_id → { os, nome }
  const projMap = useMemo(
    () => Object.fromEntries(projetos.map(p => [p.id, p])),
    [projetos]
  )

  // Grid: chave `funcId__dataSemana` → [{ dias, os, nome }]
  const grid = useMemo(() => {
    const g = {}
    for (const a of alocacoes) {
      const key = `${a.funcionario_id}__${a.data_semana}`
      if (!g[key]) g[key] = []
      const proj = projMap[a.projeto_id] ?? {}
      g[key].push({ dias: a.dias, os: proj.os ?? '?', nome: proj.nome ?? '?' })
    }
    return g
  }, [alocacoes, projMap])

  if (!funcionarios.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 13 }}>
        <p>Nenhum funcionário cadastrado ainda.</p>
      </div>
    )
  }

  if (!semanas.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 13 }}>
        <p>Nenhuma alocação lançada ainda.</p>
        <p style={{ fontSize: 11, marginTop: 4 }}>Abra um projeto, vá na aba <b>Programação</b> e preencha os dias por semana.</p>
      </div>
    )
  }

  const thBase = {
    padding: '8px 4px', borderBottom: '2px solid var(--line)',
    textAlign: 'center', fontSize: 11, whiteSpace: 'nowrap', fontWeight: 500,
  }

  return (
    <div>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--line)' }}>
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
                  <th key={s} style={{ ...thBase, minWidth: 72, color: isAtual ? 'var(--brand)' : 'var(--ink-2)', fontWeight: isAtual ? 700 : 500, background: isAtual ? 'rgba(37,99,235,.07)' : 'var(--surface-2)' }}>
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
                  <td style={{ padding: '7px 12px', position: 'sticky', left: 0, background: rowBg, zIndex: 1, borderRight: '1px solid var(--line)', minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nome}</div>
                    {f.equipe && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{f.equipe}</div>}
                  </td>
                  {semanas.map(s => {
                    const itens = grid[`${f.id}__${s}`] ?? []
                    const totalDias = itens.reduce((acc, i) => acc + (i.dias || 0), 0)
                    const conflito = totalDias > 5
                    const vazio = itens.length === 0

                    return (
                      <td key={s} style={{ textAlign: 'center', padding: '4px 3px', verticalAlign: 'middle' }}>
                        {vazio ? (
                          <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>—</span>
                        ) : (
                          <div
                            title={itens.map(i => `OS ${i.os} · ${i.nome}\n${i.dias} dia${i.dias !== 1 ? 's' : ''}`).join('\n\n')}
                            style={{
                              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                              background: conflito ? 'rgba(220,38,38,.10)' : 'rgba(15,122,61,.10)',
                              border: `1.5px solid ${conflito ? '#dc2626' : '#0f7a3d'}`,
                              borderRadius: 6, padding: '3px 6px', minWidth: 68,
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: 12, color: conflito ? '#dc2626' : '#0f7a3d' }}>
                              {totalDias}d {conflito ? '⚠' : ''}
                            </span>
                            {itens.map((it, idx) => (
                              <span key={idx} style={{ fontSize: 9, color: conflito ? '#991b1b' : '#166534', lineHeight: 1.3, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                {it.os}
                              </span>
                            ))}
                            {itens.map((it, idx) => (
                              <span key={`n${idx}`} style={{ fontSize: 8, color: conflito ? '#991b1b' : '#166534', opacity: 0.75, lineHeight: 1.2, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                {it.nome.length > 18 ? it.nome.slice(0, 17) + '…' : it.nome}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-3)', display: 'flex', gap: 16 }}>
        <span style={{ color: '#0f7a3d', fontWeight: 600 }}>■</span> Alocado &nbsp;
        <span style={{ color: '#dc2626', fontWeight: 600 }}>■</span> Conflito (&gt;5 dias/semana) &nbsp;
        <span style={{ color: 'var(--ink-3)' }}>— Livre</span>
      </div>
    </div>
  )
}

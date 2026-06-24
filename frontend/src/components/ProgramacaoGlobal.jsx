import { useMemo, useState, useRef, useEffect } from 'react'

const MS_WEEK = 7 * 24 * 3600 * 1000

function toISO(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtWeek(iso) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// Editor inline que aparece ao clicar numa célula
function CelulaEditor({ funcionario, semanas, projetos, alocacoes, onAlocar, onFechar }) {
  const ref = useRef(null)
  const [saving, setSaving] = useState(false)

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onFechar() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onFechar])

  // Alocações existentes para este funcionário nessas semanas
  const minhasSemanas = semanas // pode ser 1 ou 2 (quinzena)
  const alocsFun = alocacoes.filter(a => a.funcionario_id === funcionario.id && minhasSemanas.includes(a.data_semana))

  // Agrupa por projeto → semana → dias
  const porProjeto = useMemo(() => {
    const m = {}
    for (const a of alocsFun) {
      if (!m[a.projeto_id]) m[a.projeto_id] = {}
      m[a.projeto_id][a.data_semana] = a.dias
    }
    return m
  }, [alocsFun])

  const [local, setLocal] = useState(() => {
    const l = {}
    for (const [pid, semMap] of Object.entries(porProjeto)) {
      for (const [sem, dias] of Object.entries(semMap)) {
        l[`${pid}__${sem}`] = dias
      }
    }
    return l
  })
  const [novoProjeto, setNovoProjeto] = useState('')
  const [errMsg, setErrMsg] = useState('')

  const projetosUsados = [...new Set(Object.keys(local).map(k => k.split('__')[0]))]
  const projetosDisponiveis = projetos.filter(p => !projetosUsados.includes(p.id))

  async function salvar(pid, sem, val) {
    const dias = val === '' ? 0 : Math.max(0, Math.min(7, Number(val)))
    setSaving(true)
    setErrMsg('')
    try {
      await onAlocar({ funcionario_id: funcionario.id, projeto_id: pid, data_semana: sem, dias })
      setLocal(l => ({ ...l, [`${pid}__${sem}`]: dias }))
    } catch (e) {
      setErrMsg('Erro ao salvar: ' + e.message)
    }
    setSaving(false)
  }

  function adicionarProjeto() {
    if (!novoProjeto) return
    const pid = novoProjeto
    setNovoProjeto('')
    const updates = {}
    for (const sem of minhasSemanas) updates[`${pid}__${sem}`] = 0
    setLocal(l => ({ ...l, ...updates }))
  }

  const todosProjetosLocal = [...new Set(Object.keys(local).map(k => k.split('__')[0]))]

  return (
    <div ref={ref} style={{
      position: 'absolute', zIndex: 50, top: '100%', left: 0,
      background: 'var(--surface)', border: '1.5px solid var(--brand)',
      borderRadius: 10, padding: 12, minWidth: 260, boxShadow: '0 8px 24px rgba(0,0,0,.18)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', marginBottom: 8 }}>
        {funcionario.nome}
        {funcionario.equipe && <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> · {funcionario.equipe}</span>}
      </div>

      {todosProjetosLocal.length === 0 && (
        <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '4px 0 10px' }}>Sem alocações. Adicione um projeto abaixo.</p>
      )}

      {todosProjetosLocal.map(pid => {
        const proj = projetos.find(p => p.id === pid)
        if (!proj) return null
        const totalDias = minhasSemanas.reduce((s, sem) => s + (Number(local[`${pid}__${sem}`]) || 0), 0)
        return (
          <div key={pid} style={{ marginBottom: 8, padding: '6px 8px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              OS {proj.os} <span style={{ fontWeight: 400, color: 'var(--ink-2)' }}>— {proj.nome.length > 28 ? proj.nome.slice(0, 27) + '…' : proj.nome}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {minhasSemanas.map(sem => (
                <label key={sem} style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span>{fmtWeek(sem)}</span>
                  <input
                    type="number" min="0" max="7"
                    value={local[`${pid}__${sem}`] ?? 0}
                    onChange={e => setLocal(l => ({ ...l, [`${pid}__${sem}`]: e.target.value }))}
                    onBlur={e => salvar(pid, sem, e.target.value)}
                    style={{ width: 44, textAlign: 'center', padding: '3px 2px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, fontWeight: 600 }}
                  />
                </label>
              ))}
              <span style={{ fontSize: 11, color: totalDias > 5 ? 'var(--vermelho)' : 'var(--ink-3)', marginLeft: 4, alignSelf: 'flex-end', paddingBottom: 3 }}>
                {totalDias}d {totalDias > 5 * minhasSemanas.length ? '⚠' : ''}
              </span>
            </div>
          </div>
        )
      })}

      {projetosDisponiveis.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <select value={novoProjeto} onChange={e => setNovoProjeto(e.target.value)}
            style={{ flex: 1, fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)' }}>
            <option value="">+ Adicionar projeto...</option>
            {projetosDisponiveis.map(p => (
              <option key={p.id} value={p.id}>OS {p.os} — {p.nome.slice(0, 30)}</option>
            ))}
          </select>
          {novoProjeto && (
            <button onClick={adicionarProjeto}
              style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              OK
            </button>
          )}
        </div>
      )}

      {errMsg && <p style={{ fontSize: 11, color: 'var(--vermelho)', marginTop: 6 }}>{errMsg}</p>}
      {saving && <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Salvando...</p>}

      <button onClick={onFechar} style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'right' }}>
        Fechar ×
      </button>
    </div>
  )
}

export default function ProgramacaoGlobal({ funcionarios, alocacoes, projetos, onAlocar, podeEditar }) {
  const [periodo, setPeriodo]         = useState('semana')   // 'semana' | 'quinzena'
  const [filtroEquipe, setFiltroEquipe] = useState('todas')
  const [celulaAtiva, setCelulaAtiva] = useState(null)       // { funcId, colIdx }

  const equipes = useMemo(() => ['todas', ...Array.from(new Set(funcionarios.map(f => f.equipe).filter(Boolean))).sort()], [funcionarios])
  const funcsFiltrados = useMemo(() =>
    filtroEquipe === 'todas' ? funcionarios : funcionarios.filter(f => f.equipe === filtroEquipe),
  [funcionarios, filtroEquipe])

  // Todas as semanas únicas com alocações, ordenadas
  const semanasBase = useMemo(() => {
    const seen = new Set(alocacoes.map(a => a.data_semana))
    // Adiciona semanas futuras dos projetos ativos (próx. 12 semanas)
    const hoje = Date.now()
    for (let i = 0; i < 12; i++) {
      const ms = hoje + i * MS_WEEK
      const d = new Date(ms)
      // Normaliza para segunda-feira
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff)
      seen.add(toISO(d.getTime()))
    }
    return [...seen].sort()
  }, [alocacoes])

  // Agrupa em colunas (semana ou quinzena)
  const colunas = useMemo(() => {
    if (periodo === 'semana') return semanasBase.map(s => [s])
    const cols = []
    for (let i = 0; i < semanasBase.length; i += 2) {
      const par = semanasBase.slice(i, i + 2)
      if (par.length) cols.push(par)
    }
    return cols
  }, [semanasBase, periodo])

  const hojeISO = toISO(Date.now())

  // Mapa projeto_id → projeto
  const projMap = useMemo(() => Object.fromEntries(projetos.map(p => [p.id, p])), [projetos])

  // Grid: funcId → colIdx → [{ dias, projeto_id, os, nome, data_semana }]
  const grid = useMemo(() => {
    const g = {}
    for (const a of alocacoes) {
      const colIdx = colunas.findIndex(col => col.includes(a.data_semana))
      if (colIdx === -1) continue
      const key = `${a.funcionario_id}__${colIdx}`
      if (!g[key]) g[key] = []
      const proj = projMap[a.projeto_id] ?? {}
      g[key].push({ dias: a.dias, projeto_id: a.projeto_id, os: proj.os ?? '?', nome: proj.nome ?? '?', data_semana: a.data_semana })
    }
    return g
  }, [alocacoes, colunas, projMap])

  if (!funcionarios.length) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 13 }}>
      <p>Nenhum funcionário cadastrado ainda.</p>
    </div>
  )

  const thBase = { padding: '8px 4px', borderBottom: '2px solid var(--line)', textAlign: 'center', fontSize: 11, whiteSpace: 'nowrap', fontWeight: 500 }

  return (
    <div>
      {/* Controles */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {/* Toggle período */}
        <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          {['semana', 'quinzena'].map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: periodo === p ? 'var(--brand)' : 'var(--surface)',
                color: periodo === p ? '#fff' : 'var(--ink-2)', transition: '.15s' }}>
              {p === 'semana' ? 'Semanal' : 'Quinzenal'}
            </button>
          ))}
        </div>

        {/* Filtro equipe */}
        {equipes.length > 1 && equipes.map(eq => (
          <button key={eq} onClick={() => setFiltroEquipe(eq)}
            style={{ padding: '5px 12px', fontSize: 12, borderRadius: 20, border: '1px solid var(--line)', cursor: 'pointer', fontWeight: 600, transition: '.15s',
              background: filtroEquipe === eq ? 'var(--brand)' : 'var(--surface)',
              color: filtroEquipe === eq ? '#fff' : 'var(--ink-2)' }}>
            {eq === 'todas' ? 'Todas as equipes' : eq}
          </button>
        ))}
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--line)' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={{ ...thBase, textAlign: 'left', padding: '8px 12px', position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 4, minWidth: 170, borderRight: '1px solid var(--line)', fontWeight: 700 }}>
                Profissional / Equipe
              </th>
              {colunas.map((col, ci) => {
                const label = col.length === 1 ? fmtWeek(col[0]) : `${fmtWeek(col[0])} – ${fmtWeek(col[1])}`
                const isAtual = col.some(s => {
                  const weekEnd = toISO(new Date(s).getTime() + MS_WEEK)
                  return s <= hojeISO && hojeISO < weekEnd
                })
                return (
                  <th key={ci} style={{ ...thBase, minWidth: col.length === 2 ? 90 : 72, color: isAtual ? 'var(--brand)' : 'var(--ink-2)', fontWeight: isAtual ? 700 : 500, background: isAtual ? 'rgba(37,99,235,.07)' : 'var(--surface-2)' }}>
                    {label}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {funcsFiltrados.map((f, fi) => {
              const rowBg = fi % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)'
              return (
                <tr key={f.id} style={{ background: rowBg }}>
                  <td style={{ padding: '7px 12px', position: 'sticky', left: 0, background: rowBg, zIndex: 1, borderRight: '1px solid var(--line)', minWidth: 170 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nome}</div>
                    {f.equipe && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{f.equipe}</div>}
                  </td>
                  {colunas.map((col, ci) => {
                    const itens = grid[`${f.id}__${ci}`] ?? []
                    const totalDias = itens.reduce((acc, i) => acc + (i.dias || 0), 0)
                    const maxDias = 5 * col.length
                    const conflito = totalDias > maxDias
                    const vazio = itens.length === 0
                    const ativa = celulaAtiva?.funcId === f.id && celulaAtiva?.colIdx === ci

                    return (
                      <td key={ci} style={{ textAlign: 'center', padding: '4px 3px', verticalAlign: 'middle', position: 'relative' }}>
                        <div
                          onClick={() => podeEditar && setCelulaAtiva(ativa ? null : { funcId: f.id, colIdx: ci })}
                          title={vazio ? (podeEditar ? 'Clique para alocar' : '') : itens.map(i => `OS ${i.os}: ${i.dias}d`).join(' | ')}
                          style={{
                            display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            minWidth: 68, borderRadius: 6, padding: '3px 6px',
                            cursor: podeEditar ? 'pointer' : 'default',
                            background: vazio
                              ? (podeEditar ? 'transparent' : 'transparent')
                              : conflito ? 'rgba(220,38,38,.10)' : 'rgba(15,122,61,.10)',
                            border: `1.5px solid ${vazio ? (podeEditar ? 'var(--line)' : 'transparent') : conflito ? '#dc2626' : '#0f7a3d'}`,
                            transition: '.15s',
                          }}
                        >
                          {vazio ? (
                            <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{podeEditar ? '+' : '—'}</span>
                          ) : (
                            <>
                              <span style={{ fontWeight: 700, fontSize: 12, color: conflito ? '#dc2626' : '#0f7a3d' }}>
                                {totalDias}d {conflito ? '⚠' : ''}
                              </span>
                              {itens.map((it, idx) => (
                                <span key={idx} style={{ fontSize: 9, color: conflito ? '#991b1b' : '#166534', lineHeight: 1.3, maxWidth: 84, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {it.os} · {it.dias}d
                                </span>
                              ))}
                            </>
                          )}
                        </div>

                        {ativa && (
                          <CelulaEditor
                            funcionario={f}
                            semanas={col}
                            projetos={projetos}
                            alocacoes={alocacoes}
                            onAlocar={onAlocar}
                            onFechar={() => setCelulaAtiva(null)}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>

          {/* Rodapé — capacidade */}
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--line)', background: 'var(--surface-2)' }}>
              <td style={{ padding: '6px 12px', position: 'sticky', left: 0, background: 'var(--surface-2)', fontWeight: 700, borderRight: '1px solid var(--line)', fontSize: 12, zIndex: 1 }}>
                Capacidade
              </td>
              {colunas.map((col, ci) => {
                const total = funcsFiltrados.length
                const alocados = funcsFiltrados.filter(f => {
                  const itens = grid[`${f.id}__${ci}`] ?? []
                  return itens.reduce((s, i) => s + (i.dias || 0), 0) > 0
                }).length
                const pct = total > 0 ? Math.round((alocados / total) * 100) : 0
                const cor = pct >= 80 ? '#dc2626' : pct >= 50 ? '#ca8a04' : '#0f7a3d'
                return (
                  <td key={ci} style={{ textAlign: 'center', padding: '6px 4px', fontSize: 11 }}>
                    <span style={{ fontWeight: 700, color: cor }}>{alocados}/{total}</span>
                    <span style={{ color: 'var(--ink-3)', fontSize: 10, display: 'block' }}>{pct}%</span>
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-3)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ color: '#0f7a3d', fontWeight: 600 }}>■</span> Alocado &nbsp;
        <span style={{ color: '#dc2626', fontWeight: 600 }}>■</span> Conflito (&gt;5d/semana) &nbsp;
        {podeEditar && <span>Clique na célula para editar alocação.</span>}
      </div>
    </div>
  )
}

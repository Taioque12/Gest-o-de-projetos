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

function semanaAtualISO() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toISO(d.getTime())
}

const MOTIVOS = [
  { value: 'ferias',      label: 'Férias' },
  { value: 'folga',       label: 'Folga' },
  { value: 'afastamento', label: 'Afastamento' },
  { value: 'outro',       label: 'Outro' },
]

const MOTIVO_COR = {
  ferias:      { bg: 'rgba(59,130,246,.10)', border: '#3b82f6', text: '#1d4ed8', label: '🏖 Férias' },
  folga:       { bg: 'rgba(139,92,246,.10)', border: '#8b5cf6', text: '#6d28d9', label: '🏠 Folga' },
  afastamento: { bg: 'rgba(245,158,11,.10)', border: '#f59e0b', text: '#92400e', label: '🩺 Afastamento' },
  outro:       { bg: 'rgba(107,114,128,.10)', border: '#6b7280', text: '#374151', label: '⬜ Indisponível' },
}

// ── Editor inline por célula ─────────────────────────────────
function CelulaEditor({ funcionario, semanas, projetos, alocacoes, indisponibilidades, onAlocar, onMarcarIndisp, onDesmarcarIndisp, onFechar }) {
  const ref = useRef(null)
  const [saving, setSaving] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [novoProjeto, setNovoProjeto] = useState('')
  const [showIndisp, setShowIndisp] = useState(false)
  const [motivoIndisp, setMotivoIndisp] = useState('folga')
  const [obsIndisp, setObsIndisp] = useState('')

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onFechar() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onFechar])

  // Indisponibilidades para este funcionário nas semanas desta coluna
  const indispAtiva = indisponibilidades.filter(
    i => i.funcionario_id === funcionario.id && semanas.includes(i.data_semana)
  )

  // Alocações existentes para este funcionário nestas semanas
  const alocsFun = alocacoes.filter(a => a.funcionario_id === funcionario.id && semanas.includes(a.data_semana))

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

  const projetosUsados = [...new Set(Object.keys(local).map(k => k.split('__')[0]))]
  const projetosDisponiveis = projetos.filter(p => !projetosUsados.includes(p.id))
  const todosProjetosLocal = [...new Set(Object.keys(local).map(k => k.split('__')[0]))]

  async function salvar(pid, sem, val) {
    const dias = val === '' ? 0 : Math.max(0, Math.min(7, Number(val)))
    setSaving(true); setErrMsg('')
    try {
      await onAlocar({ funcionario_id: funcionario.id, projeto_id: pid, data_semana: sem, dias })
      setLocal(l => ({ ...l, [`${pid}__${sem}`]: dias }))
    } catch (e) { setErrMsg('Erro: ' + e.message) }
    setSaving(false)
  }

  function adicionarProjeto() {
    if (!novoProjeto) return
    const pid = novoProjeto
    setNovoProjeto('')
    const updates = {}
    for (const sem of semanas) updates[`${pid}__${sem}`] = 0
    setLocal(l => ({ ...l, ...updates }))
  }

  async function handleMarcarIndisp() {
    setSaving(true); setErrMsg('')
    try {
      for (const sem of semanas) {
        await onMarcarIndisp({ funcionario_id: funcionario.id, data_semana: sem, motivo: motivoIndisp, observacao: obsIndisp || null })
      }
      setShowIndisp(false)
    } catch (e) { setErrMsg('Erro: ' + e.message) }
    setSaving(false)
  }

  async function handleDesmarcar(sem) {
    setSaving(true)
    try { await onDesmarcarIndisp({ funcionario_id: funcionario.id, data_semana: sem }) }
    catch (e) { setErrMsg('Erro: ' + e.message) }
    setSaving(false)
  }

  return (
    <div ref={ref} style={{
      position: 'absolute', zIndex: 50, top: '100%', left: 0,
      background: 'var(--surface)', border: '1.5px solid var(--brand)',
      borderRadius: 10, padding: 12, minWidth: 270, maxWidth: 320,
      boxShadow: '0 8px 24px rgba(0,0,0,.18)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', marginBottom: 8 }}>
        {funcionario.nome}
        {funcionario.equipe && <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> · {funcionario.equipe}</span>}
      </div>

      {/* Indisponibilidades ativas */}
      {indispAtiva.map(i => {
        const cor = MOTIVO_COR[i.motivo] ?? MOTIVO_COR.outro
        return (
          <div key={i.id} style={{ marginBottom: 8, padding: '6px 8px', borderRadius: 7, background: cor.bg, border: `1px solid ${cor.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: cor.text }}>
              {cor.label} {i.observacao ? `— ${i.observacao}` : ''} <span style={{ fontWeight: 400 }}>({fmtWeek(i.data_semana)})</span>
            </span>
            <button onClick={() => handleDesmarcar(i.data_semana)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: cor.text, fontSize: 13, fontWeight: 700 }} title="Remover">×</button>
          </div>
        )
      })}

      {/* Alocações por projeto */}
      {todosProjetosLocal.length === 0 && indispAtiva.length === 0 && (
        <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '4px 0 10px' }}>Sem alocações. Adicione um projeto abaixo.</p>
      )}

      {todosProjetosLocal.map(pid => {
        const proj = projetos.find(p => p.id === pid)
        if (!proj) return null
        const totalDias = semanas.reduce((s, sem) => s + (Number(local[`${pid}__${sem}`]) || 0), 0)
        return (
          <div key={pid} style={{ marginBottom: 8, padding: '6px 8px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              OS {proj.os} <span style={{ fontWeight: 400, color: 'var(--ink-2)' }}>— {proj.nome.length > 26 ? proj.nome.slice(0, 25) + '…' : proj.nome}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {semanas.map(sem => (
                <label key={sem} style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span>{fmtWeek(sem)}</span>
                  <input type="number" min="0" max="7"
                    value={local[`${pid}__${sem}`] ?? 0}
                    onChange={e => setLocal(l => ({ ...l, [`${pid}__${sem}`]: e.target.value }))}
                    onBlur={e => salvar(pid, sem, e.target.value)}
                    style={{ width: 44, textAlign: 'center', padding: '3px 2px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, fontWeight: 600 }}
                  />
                </label>
              ))}
              <span style={{ fontSize: 11, color: totalDias > 5 * semanas.length ? 'var(--vermelho)' : 'var(--ink-3)', marginLeft: 4, alignSelf: 'flex-end', paddingBottom: 3 }}>
                {totalDias}d {totalDias > 5 * semanas.length ? '⚠' : ''}
              </span>
            </div>
          </div>
        )
      })}

      {/* Adicionar projeto */}
      {projetosDisponiveis.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <select value={novoProjeto} onChange={e => setNovoProjeto(e.target.value)}
            style={{ flex: 1, fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)' }}>
            <option value="">+ Adicionar projeto...</option>
            {projetosDisponiveis.map(p => (
              <option key={p.id} value={p.id}>OS {p.os} — {p.nome.slice(0, 28)}</option>
            ))}
          </select>
          {novoProjeto && (
            <button onClick={adicionarProjeto}
              style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>OK</button>
          )}
        </div>
      )}

      {/* Marcar indisponível */}
      <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
        {!showIndisp ? (
          <button onClick={() => setShowIndisp(true)}
            style={{ fontSize: 11, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', width: '100%' }}>
            ⚠ Marcar indisponível nesta semana
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <select value={motivoIndisp} onChange={e => setMotivoIndisp(e.target.value)}
              style={{ fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)' }}>
              {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <input value={obsIndisp} onChange={e => setObsIndisp(e.target.value)}
              placeholder="Observação (opcional)" maxLength={80}
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleMarcarIndisp}
                style={{ flex: 1, padding: '5px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                Confirmar
              </button>
              <button onClick={() => setShowIndisp(false)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 12, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {errMsg && <p style={{ fontSize: 11, color: 'var(--vermelho)', marginTop: 6 }}>{errMsg}</p>}
      {saving && <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Salvando...</p>}

      <button onClick={onFechar}
        style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'right' }}>
        Fechar ×
      </button>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────
export default function ProgramacaoGlobal({ funcionarios, alocacoes, projetos, indisponibilidades = [], onAlocar, onMarcarIndisp, onDesmarcarIndisp, podeEditar, copiarSemana }) {
  const [periodo, setPeriodo]           = useState('semana')
  const [filtroEquipe, setFiltroEquipe] = useState('todas')
  const [celulaAtiva, setCelulaAtiva]   = useState(null)
  const [copiando, setCopiando]         = useState(false)
  const [msgCopia, setMsgCopia]         = useState('')

  const semAtual    = semanaAtualISO()
  const semAnterior = toISO(new Date(semAtual).getTime() - MS_WEEK)
  const hojeISO     = toISO(Date.now())

  const equipes = useMemo(() =>
    ['todas', ...Array.from(new Set(funcionarios.map(f => f.equipe).filter(Boolean))).sort()],
  [funcionarios])

  const funcsFiltrados = useMemo(() =>
    filtroEquipe === 'todas' ? funcionarios : funcionarios.filter(f => f.equipe === filtroEquipe),
  [funcionarios, filtroEquipe])

  // Semanas base: existentes no banco + próximas 12 semanas a partir de hoje
  const semanasBase = useMemo(() => {
    const seen = new Set(alocacoes.map(a => a.data_semana))
    for (let i = 0; i < 12; i++) {
      const d = new Date(semAtual)
      d.setDate(d.getDate() + i * 7)
      seen.add(toISO(d.getTime()))
    }
    // Inclui semana anterior para "copiar semana"
    seen.add(semAnterior)
    return [...seen].sort()
  }, [alocacoes, semAtual, semAnterior])

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

  // Mapa de indisponibilidades: funcId__semana → motivo
  const indispMap = useMemo(() => {
    const m = {}
    for (const i of indisponibilidades) m[`${i.funcionario_id}__${i.data_semana}`] = i.motivo
    return m
  }, [indisponibilidades])

  // Coluna "dias livres" — calcula para semana atual
  const colIdxAtual = colunas.findIndex(col => col.includes(semAtual))

  async function handleCopiarSemana() {
    if (!copiarSemana) return
    const temDados = alocacoes.some(a => a.data_semana === semAnterior)
    if (!temDados) { setMsgCopia('Semana anterior sem alocações para copiar.'); return }
    setCopiando(true); setMsgCopia('')
    try {
      await copiarSemana(semAnterior, semAtual)
      setMsgCopia('✓ Programação da semana anterior copiada!')
      setTimeout(() => setMsgCopia(''), 3000)
    } catch { setMsgCopia('Erro ao copiar.') }
    setCopiando(false)
  }

  if (!funcionarios.length) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 13 }}>
      <p>Nenhum funcionário cadastrado ainda.</p>
    </div>
  )

  const thBase = { padding: '8px 4px', borderBottom: '2px solid var(--line)', textAlign: 'center', fontSize: 11, whiteSpace: 'nowrap', fontWeight: 500 }

  return (
    <div>
      {/* Toolbar */}
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

        {/* Copiar semana anterior */}
        {podeEditar && copiarSemana && (
          <button onClick={handleCopiarSemana} disabled={copiando}
            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #0f7a3d', background: copiando ? 'var(--surface-2)' : '#f0fdf4', color: '#0f7a3d', cursor: copiando ? 'default' : 'pointer', transition: '.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {copiando ? '⏳ Copiando...' : '↩ Repetir semana anterior'}
          </button>
        )}

        {msgCopia && (
          <span style={{ fontSize: 12, color: msgCopia.startsWith('✓') ? '#0f7a3d' : 'var(--vermelho)', fontWeight: 600 }}>
            {msgCopia}
          </span>
        )}

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
                  <th key={ci} style={{ ...thBase, minWidth: col.length === 2 ? 90 : 72,
                    color: isAtual ? 'var(--brand)' : 'var(--ink-2)',
                    fontWeight: isAtual ? 700 : 500,
                    background: isAtual ? 'rgba(37,99,235,.07)' : 'var(--surface-2)' }}>
                    {label}{isAtual ? ' ◀' : ''}
                  </th>
                )
              })}
              {/* Coluna dias livres */}
              <th style={{ ...thBase, minWidth: 80, position: 'sticky', right: 0, background: 'var(--surface-2)', zIndex: 4, borderLeft: '1px solid var(--line)', color: '#0f7a3d', fontWeight: 700 }}>
                Livre hoje
              </th>
            </tr>
          </thead>

          <tbody>
            {funcsFiltrados.map((f, fi) => {
              const rowBg = fi % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)'

              // Dias livres na semana atual
              const itensAtual = colIdxAtual >= 0 ? (grid[`${f.id}__${colIdxAtual}`] ?? []) : []
              const diasAlocAtual = itensAtual.reduce((s, i) => s + (i.dias || 0), 0)
              const indispAtual = colIdxAtual >= 0 && colunas[colIdxAtual]?.some(sem => indispMap[`${f.id}__${sem}`])
              const diasLivres = indispAtual ? null : Math.max(0, 5 - diasAlocAtual)

              return (
                <tr key={f.id} style={{ background: rowBg }}>
                  <td style={{ padding: '7px 12px', position: 'sticky', left: 0, background: rowBg, zIndex: 1, borderRight: '1px solid var(--line)', minWidth: 170 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nome}</div>
                    {f.equipe && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{f.equipe}</div>}
                  </td>

                  {colunas.map((col, ci) => {
                    const itens      = grid[`${f.id}__${ci}`] ?? []
                    const totalDias  = itens.reduce((acc, i) => acc + (i.dias || 0), 0)
                    const maxDias    = 5 * col.length
                    const conflito   = totalDias > maxDias
                    const ativa      = celulaAtiva?.funcId === f.id && celulaAtiva?.colIdx === ci

                    // Indisponibilidade: verifica qualquer semana da coluna
                    const motivoIndisp = col.map(s => indispMap[`${f.id}__${s}`]).find(Boolean)
                    const corIndisp    = motivoIndisp ? (MOTIVO_COR[motivoIndisp] ?? MOTIVO_COR.outro) : null

                    return (
                      <td key={ci} style={{ textAlign: 'center', padding: '4px 3px', verticalAlign: 'middle', position: 'relative' }}>
                        {motivoIndisp ? (
                          // Célula de indisponibilidade
                          <div
                            onClick={() => podeEditar && setCelulaAtiva(ativa ? null : { funcId: f.id, colIdx: ci })}
                            title={corIndisp.label}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              minWidth: 68, borderRadius: 6, padding: '4px 6px', cursor: podeEditar ? 'pointer' : 'default',
                              background: corIndisp.bg, border: `1.5px solid ${corIndisp.border}`,
                            }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: corIndisp.text }}>{corIndisp.label}</span>
                          </div>
                        ) : (
                          // Célula normal
                          <div
                            onClick={() => podeEditar && setCelulaAtiva(ativa ? null : { funcId: f.id, colIdx: ci })}
                            title={itens.length === 0 ? (podeEditar ? 'Clique para alocar' : '') : itens.map(i => `OS ${i.os}: ${i.dias}d`).join(' | ')}
                            style={{
                              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                              minWidth: 68, borderRadius: 6, padding: '3px 6px',
                              cursor: podeEditar ? 'pointer' : 'default',
                              background: itens.length === 0 ? 'transparent' : conflito ? 'rgba(220,38,38,.10)' : 'rgba(15,122,61,.10)',
                              border: `1.5px solid ${itens.length === 0 ? (podeEditar ? 'var(--line)' : 'transparent') : conflito ? '#dc2626' : '#0f7a3d'}`,
                              transition: '.15s',
                            }}>
                            {itens.length === 0 ? (
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
                        )}

                        {ativa && (
                          <CelulaEditor
                            funcionario={f}
                            semanas={col}
                            projetos={projetos}
                            alocacoes={alocacoes}
                            indisponibilidades={indisponibilidades}
                            onAlocar={onAlocar}
                            onMarcarIndisp={onMarcarIndisp}
                            onDesmarcarIndisp={onDesmarcarIndisp}
                            onFechar={() => setCelulaAtiva(null)}
                          />
                        )}
                      </td>
                    )
                  })}

                  {/* Coluna "Livre hoje" */}
                  <td style={{ textAlign: 'center', padding: '6px 8px', position: 'sticky', right: 0, background: rowBg, borderLeft: '1px solid var(--line)', minWidth: 80 }}>
                    {indispAtual ? (
                      <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Indisp.</span>
                    ) : colIdxAtual < 0 ? (
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>—</span>
                    ) : (
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: diasLivres === 0 ? '#dc2626' : diasLivres <= 2 ? '#ca8a04' : '#0f7a3d',
                      }}>
                        {diasLivres}d livre{diasLivres !== 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Rodapé capacidade */}
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--line)', background: 'var(--surface-2)' }}>
              <td style={{ padding: '6px 12px', position: 'sticky', left: 0, background: 'var(--surface-2)', fontWeight: 700, borderRight: '1px solid var(--line)', fontSize: 12, zIndex: 1 }}>
                Capacidade
              </td>
              {colunas.map((col, ci) => {
                const total    = funcsFiltrados.length
                const alocados = funcsFiltrados.filter(f => {
                  const indisp = col.some(s => indispMap[`${f.id}__${s}`])
                  if (indisp) return false
                  const itens = grid[`${f.id}__${ci}`] ?? []
                  return itens.reduce((s, i) => s + (i.dias || 0), 0) > 0
                }).length
                const indispCount = funcsFiltrados.filter(f => col.some(s => indispMap[`${f.id}__${s}`])).length
                const disponiveis = total - indispCount
                const pct = disponiveis > 0 ? Math.round((alocados / disponiveis) * 100) : 0
                const cor = pct >= 80 ? '#dc2626' : pct >= 50 ? '#ca8a04' : '#0f7a3d'
                return (
                  <td key={ci} style={{ textAlign: 'center', padding: '6px 4px', fontSize: 11 }}>
                    <span style={{ fontWeight: 700, color: cor }}>{alocados}/{disponiveis}</span>
                    <span style={{ color: 'var(--ink-3)', fontSize: 10, display: 'block' }}>
                      {pct}%{indispCount > 0 ? ` · ${indispCount} indisp.` : ''}
                    </span>
                  </td>
                )
              })}
              {/* placeholder coluna livre */}
              <td style={{ position: 'sticky', right: 0, background: 'var(--surface-2)', borderLeft: '1px solid var(--line)' }} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-3)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ color: '#0f7a3d', fontWeight: 600 }}>■</span> Alocado &nbsp;
        <span style={{ color: '#dc2626', fontWeight: 600 }}>■</span> Conflito &nbsp;
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>■</span> Indisponível &nbsp;
        {podeEditar && <span>Clique na célula para editar.</span>}
      </div>
    </div>
  )
}

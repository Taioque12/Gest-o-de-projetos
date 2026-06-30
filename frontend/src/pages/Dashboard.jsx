import { useState, useEffect, lazy, Suspense } from 'react'
import { useProjetos } from '../hooks/useProjetos'
import { classify, valorFmt, fmt, portfolioCurveOpts, projectCurveOpts } from '../utils/helpers'
import Header from '../components/Header'
import KPICard from '../components/KPICard'
import CurvaS from '../components/CurvaS'
import ProjectCard from '../components/ProjectCard'
import ProjectModal from '../components/ProjectModal'
import ProjetoForm from '../components/ProjetoForm'
import AlocacaoTable from '../components/AlocacaoTable'
import AtualizacaoSemanal from '../components/AtualizacaoSemanal'
import Toast from '../components/Toast'
import NotificacoesPrazo from '../components/NotificacoesPrazo'
import ChunkErrorBoundary from '../components/ChunkErrorBoundary'

const UploadXML = lazy(() => import('./UploadXML'))
const Relatorio = lazy(() => import('../components/Relatorio'))

export default function Dashboard({ user, perfil, onSignOut, onChangeView }) {
  const { projetos, atualizacoes, loading, usandoMock, refetch, criarProjeto, editarProjeto, excluirProjeto, atualizarSemanal } = useProjetos(perfil, user?.id, user?.email)
  const [filtro, setFiltro] = useState('todos')
  const [filtroResp, setFiltroResp] = useState('todos')
  const [curvaFiltro, setCurvaFiltro] = useState('portfolio')
  const [curvaResp, setCurvaResp] = useState('todos')
  const [modalProjeto, setModalProjeto] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showSemanal, setShowSemanal] = useState(false)
  const [showRelatorio, setShowRelatorio] = useState(false)
  const [formProjeto, setFormProjeto] = useState(null) // null | 'novo' | projeto
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [toast, setToast] = useState('')
  const [toastErro, setToastErro] = useState('')
  const [ocultarValores, setOcultarValores] = useState(() => localStorage.getItem('ocultarValores') === '1')

  useEffect(() => {
    localStorage.setItem('ocultarValores', ocultarValores ? '1' : '0')
  }, [ocultarValores])

  const podeEditar = perfil === 'admin' || perfil === 'equipe'
  const mask = v => ocultarValores ? '••••••' : v

  function exportarCSV() {
    const cols = ['OS', 'Projeto', 'Cliente', 'Escopo', 'Responsável', 'Início', 'Término', 'Prazo', 'Valor (R$)', 'Previsto (%)', 'Realizado (%)', 'Desvio (p.p.)', 'Status']
    const rows = projetos.map(p => {
      const c = classify(p.prev, p.real)
      return [p.os, p.nome, p.cliente, p.escopo, p.responsavel, p.inicio, p.fim, p.prazo, p.valor, p.prev, p.real, (p.real - p.prev).toFixed(1), c.lbl]
    })
    const csv = [cols, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `projetos_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  if (loading) return <div className="loading-screen">Carregando projetos...</div>

  async function handleSalvarSemanal(data, atualizacoes) {
    setSalvando(true)
    try {
      await atualizarSemanal(data, atualizacoes)
      setShowSemanal(false)
      setToast(`Avanço de ${atualizacoes.length} projeto(s) atualizado para ${data}!`)
    } catch (err) {
      setToastErro('Erro ao salvar: ' + err.message)
    }
    setSalvando(false)
  }

  if (showRelatorio) {
    return (
      <ChunkErrorBoundary>
        <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
          <Relatorio projetos={projetos} onFechar={() => setShowRelatorio(false)} />
        </Suspense>
      </ChunkErrorBoundary>
    )
  }

  if (showUpload) {
    return (
      <>
        <Header perfil={perfil} onSignOut={onSignOut} onUpload={() => setShowUpload(true)} onNovoProjeto={podeEditar ? () => setFormProjeto('novo') : null} />
        <ChunkErrorBoundary>
          <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
            <UploadXML
              onBack={() => { setShowUpload(false); refetch() }}
              onCriado={msg => { setShowUpload(false); refetch(); setToast(msg) }}
              projetos={projetos}
              criarProjeto={criarProjeto}
              editarProjeto={editarProjeto}
              user={user}
            />
          </Suspense>
        </ChunkErrorBoundary>
      </>
    )
  }

  const responsaveis = ['todos', ...Array.from(new Set(projetos.map(p => p.responsavel).filter(Boolean))).sort()]

  const projetosFiltrados = projetos
    .filter(p => filtro === 'todos' || classify(p.prev, p.real).k === filtro)
    .filter(p => filtroResp === 'todos' || p.responsavel === filtroResp)

  const projetoSelecionado = projetos.find(p => p.id === curvaFiltro)
  const projetosCurva = curvaResp === 'todos' ? projetos : projetos.filter(p => p.responsavel === curvaResp)
  const curveOpts = projetosCurva.length
    ? (projetoSelecionado ? projectCurveOpts(projetoSelecionado) : portfolioCurveOpts(projetosCurva))
    : null

  // KPIs reagem ao filtro da Curva S
  const kpiBase = projetoSelecionado ? [projetoSelecionado] : projetosCurva
  const VTOT     = kpiBase.reduce((s, p) => s + p.valor, 0)
  const wAvgPrev = kpiBase.length && VTOT ? kpiBase.reduce((s, p) => s + p.valor * p.prev, 0) / VTOT : 0
  const wAvgReal = kpiBase.length && VTOT ? kpiBase.reduce((s, p) => s + p.valor * p.real, 0) / VTOT : 0
  const desv     = wAvgReal - wAvgPrev
  const clsDesv  = classify(wAvgPrev, wAvgReal)
  const nC = kpiBase.filter(p => classify(p.prev, p.real).k === 'vermelho').length
  const nA = kpiBase.filter(p => classify(p.prev, p.real).k === 'amarelo').length
  const kpiLabel = projetoSelecionado
    ? `OS ${projetoSelecionado.os}`
    : curvaResp !== 'todos' ? curvaResp : 'portfólio completo'

  async function handleSalvar(dados) {
    setSalvando(true)
    setErroForm('')
    try {
      if (formProjeto === 'novo') {
        await criarProjeto(dados)
      } else {
        await editarProjeto(formProjeto.id, dados)
      }
      setFormProjeto(null)
    } catch (err) {
      setErroForm(err.message ?? 'Erro ao salvar.')
    }
    setSalvando(false)
  }

  async function handleExcluir(projeto) {
    if (!window.confirm(`Excluir a OS "${projeto.os} — ${projeto.nome}"? Esta ação não pode ser desfeita.`)) return
    try {
      await excluirProjeto(projeto.id)
    } catch (err) {
      setToastErro('Erro ao excluir: ' + err.message)
    }
  }

  return (
    <>
      <Header
        perfil={perfil}
        onSignOut={onSignOut}
        onUpload={() => setShowUpload(true)}
        onNovoProjeto={podeEditar ? () => setFormProjeto('novo') : null}
        onAtualizarSemanal={podeEditar ? () => setShowSemanal(true) : null}
        onRelatorio={() => setShowRelatorio(true)}
        view="dashboard"
        onChangeView={onChangeView}
      />

      <div className="wrap">
        {/* KPIs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div />
          <button
            onClick={() => setOcultarValores(v => !v)}
            title={ocultarValores ? 'Mostrar valores' : 'Ocultar valores'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 8px', borderRadius: 7 }}
          >
            {ocultarValores
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
            {ocultarValores ? 'Mostrar valores' : 'Ocultar valores'}
          </button>
        </div>
        <div className="kpis">
          <KPICard lbl="Projetos Ativos" val={kpiBase.length} sub={kpiLabel} />
          <KPICard lbl="Valor em Carteira" val={mask(valorFmt(VTOT))} sub={`${kpiBase.length} ${kpiBase.length === 1 ? 'ordem de serviço' : 'ordens de serviço'}`} />
          <KPICard lbl="Avanço Previsto" val={`${fmt(wAvgPrev)}%`} sub="ponderado por valor" />
          <KPICard lbl="Avanço Realizado" val={`${fmt(wAvgReal)}%`} sub="ponderado por valor" />
          <KPICard
            lbl="Desvio Médio"
            val={`${desv >= 0 ? '+' : '−'}${fmt(Math.abs(desv))} p.p.`}
            sub={clsDesv.lbl}
            cls={clsDesv.k}
            valCls={clsDesv.k}
          />
          <KPICard
            lbl="Exigem Ação"
            val={`${nC} 🔴 / ${nA} 🟡`}
            sub="crítico / atenção"
            cls={nC ? 'vermelho' : 'amarelo'}
          />
        </div>

        <NotificacoesPrazo projetos={projetos} />

        {/* Curva S */}
        <div className="panel">
          <div className="panel-head">
            <h2>
              <span className="ico">📈</span>
              {projetoSelecionado
                ? `Curva S — OS ${projetoSelecionado.os} · ${projetoSelecionado.nome}`
                : 'Curva S do Portfólio — Avanço Físico'}
            </h2>
            <div className="legend">
              <span><i className="swatch-dash" /> Previsto (linha de base)</span>
              <span><i className="swatch-solid" /> Realizado</span>
            </div>
          </div>
          <div className="panel-body">
            {/* Filtros da Curva S */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <select
                value={curvaFiltro}
                onChange={e => setCurvaFiltro(e.target.value)}
                style={{ fontSize: 13, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit', cursor: 'pointer', minWidth: 220 }}
              >
                <option value="portfolio">Portfólio completo</option>
                {projetosCurva.map(p => (
                  <option key={p.id} value={p.id}>OS {p.os} · {p.nome}</option>
                ))}
              </select>
              <select
                value={curvaResp}
                onChange={e => { setCurvaResp(e.target.value); setCurvaFiltro('portfolio') }}
                style={{ fontSize: 13, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit', cursor: 'pointer', minWidth: 200 }}
              >
                <option value="todos">Todos os responsáveis</option>
                {responsaveis.filter(r => r !== 'todos').map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {curveOpts && <CurvaS opts={curveOpts} />}
            <p style={{ marginTop: 10, color: 'var(--ink-3)', fontSize: 12 }}>
              {projetoSelecionado
                ? `Curva individual · ${projetoSelecionado.cliente}`
                : 'Médias ponderadas por valor de contrato · linha do tempo em calendário (semanal).'}
            </p>
          </div>
        </div>

        {/* Projetos */}
        <div className="panel">
          <div className="panel-head">
            <h2><span className="ico">🗂️</span> Projetos do Portfólio</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
              <div className="filters" style={{ flexShrink: 0 }}>
                {['todos', 'verde', 'amarelo', 'vermelho'].map(f => (
                  <button key={f} className={`chip${filtro === f ? ' active' : ''}`} onClick={() => setFiltro(f)}>
                    {f !== 'todos' && <span className={`dot ${f}`} />}
                    {f === 'todos' ? 'Todos' : f === 'verde' ? 'Verde' : f === 'amarelo' ? 'Atenção' : 'Crítico'}
                  </button>
                ))}
              </div>
              <select
                value={filtroResp}
                onChange={e => setFiltroResp(e.target.value)}
                style={{ fontSize: 13, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit', cursor: 'pointer', width: 190, flexShrink: 0 }}
              >
                <option value="todos">Todos os responsáveis</option>
                {responsaveis.filter(r => r !== 'todos').map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button className="btn btn-ghost" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={exportarCSV} title="Exportar CSV">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                CSV
              </button>
              {podeEditar && (
                <button className="btn btn-ghost" style={{ background: 'var(--brand)', color: '#fff', border: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={() => setFormProjeto('novo')}>
                  + Nova OS
                </button>
              )}
            </div>
          </div>
          <div className="panel-body">
            {projetosFiltrados.length > 0 ? (
              <div className="grid-proj">
                {projetosFiltrados.map(p => (
                  <ProjectCard
                    key={p.id ?? p.os}
                    projeto={p}
                    onClick={() => setModalProjeto(p)}
                    podeEditar={podeEditar}
                    onEditar={e => { e.stopPropagation(); setFormProjeto(p) }}
                    onExcluir={e => { e.stopPropagation(); handleExcluir(p) }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)' }}>
                <p>Nenhum projeto nesta classificação.</p>
                {podeEditar && filtro === 'todos' && (
                  <button className="btn btn-ghost" style={{ marginTop: 12, color: 'var(--brand)', border: '1px solid var(--brand)' }}
                    onClick={() => setFormProjeto('novo')}>
                    + Cadastrar primeira OS
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <footer>
          <b>Gestão de Projetos</b>
          {usandoMock && ' · dados fictícios para validação do formato'}
          <br />
          Estrutura: Projeto · OS · Cliente · Responsável · Prazo · Valor · Avanço Previsto × Realizado · Desvio · Alocação · Ação.
        </footer>
      </div>

      {modalProjeto && (
        <ProjectModal
          projeto={modalProjeto}
          atualizacoes={atualizacoes}
          podeEditar={podeEditar}
          onClose={() => setModalProjeto(null)}
        />
      )}

      {toast && <Toast mensagem={toast} onClose={() => setToast('')} />}
      {toastErro && <Toast mensagem={toastErro} tipo="erro" onClose={() => setToastErro('')} />}

      {showSemanal && (
        <AtualizacaoSemanal
          projetos={projetos}
          onSalvar={handleSalvarSemanal}
          onFechar={() => setShowSemanal(false)}
          salvando={salvando}
        />
      )}

      {formProjeto && (
        <ProjetoForm
          projeto={formProjeto === 'novo' ? null : formProjeto}
          onSalvar={handleSalvar}
          onFechar={() => { setFormProjeto(null); setErroForm('') }}
          salvando={salvando}
        />
      )}
    </>
  )
}

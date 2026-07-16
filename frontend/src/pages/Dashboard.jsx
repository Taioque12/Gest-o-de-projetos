import { useState, lazy, Suspense, useMemo, useCallback } from 'react'
import { useProjetos } from '../hooks/useProjetos'
import { useAppStore } from '../store/useAppStore'
import { classify, valorFmt, fmt, portfolioCurveOpts, projectCurveOpts } from '../utils/helpers'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import KPICardV2 from '../components/KPICardV2'
import ProjectCardV2 from '../components/ProjectCardV2'
import Header from '../components/Header'
import KPICard from '../components/KPICard'
import ProjectCard from '../components/ProjectCard'

const CurvaSV2 = lazy(() => import('../components/CurvaSV2'))
const CurvaS = lazy(() => import('../components/CurvaS'))
const ProjectModal = lazy(() => import('../components/ProjectModal'))
const ProjetoForm = lazy(() => import('../components/ProjetoForm'))
const AtualizacaoSemanal = lazy(() => import('../components/AtualizacaoSemanal'))
import Toast from '../components/Toast'
import NotificacoesPrazo from '../components/NotificacoesPrazo'
import ChunkErrorBoundary from '../components/ChunkErrorBoundary'

const UploadXML = lazy(() => import('./UploadXML'))
const Relatorio = lazy(() => import('../components/Relatorio'))

export default function Dashboard({ user, perfil, onSignOut }) {
  const { projetos, atualizacoes, loading, usandoMock, refetch, criarProjeto, editarProjeto, excluirProjeto, atualizarSemanal } = useProjetos(perfil, user?.id, user?.email)
  const {
    filtro, setFiltro, filtroResp, setFiltroResp,
    curvaFiltro, setCurvaFiltro, curvaResp, setCurvaResp,
    modalProjeto, setModalProjeto,
    showUpload, setShowUpload, showSemanal, setShowSemanal, showRelatorio, setShowRelatorio,
    formProjeto, setFormProjeto,
    ocultarValores, setOcultarValores
  } = useAppStore()

  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [toast, setToast] = useState('')
  const [toastErro, setToastErro] = useState('')

  const podeEditar = perfil === 'admin' || perfil === 'equipe'
  const mask = v => ocultarValores ? '••••••' : v

  const exportarCSV = useCallback(() => {
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
  }, [projetos])

  const handleSalvarSemanal = useCallback(async (data, atualizacoes) => {
    setSalvando(true)
    try {
      await atualizarSemanal(data, atualizacoes)
      setShowSemanal(false)
      setToast(`Avanço de ${atualizacoes.length} projeto(s) atualizado para ${data}!`)
    } catch (err) {
      setToastErro('Erro ao salvar: ' + err.message)
    }
    setSalvando(false)
  }, [atualizarSemanal])

  const responsaveis = useMemo(() => ['todos', ...Array.from(new Set(projetos.map(p => p.responsavel).filter(Boolean))).sort()], [projetos])

  const projetosFiltrados = useMemo(() => projetos
    .filter(p => filtro === 'todos' || classify(p.prev, p.real).k === filtro)
    .filter(p => filtroResp === 'todos' || p.responsavel === filtroResp), [projetos, filtro, filtroResp])

  const projetoSelecionado = useMemo(() => projetos.find(p => p.id === curvaFiltro), [projetos, curvaFiltro])
  const projetosCurva = useMemo(() => curvaResp === 'todos' ? projetos : projetos.filter(p => p.responsavel === curvaResp), [projetos, curvaResp])
  const curveOpts = useMemo(() => projetosCurva.length
    ? (projetoSelecionado ? projectCurveOpts(projetoSelecionado) : portfolioCurveOpts(projetosCurva))
    : null, [projetosCurva, projetoSelecionado])

  // KPIs reagem ao filtro da Curva S
  const { kpiBase, VTOT, wAvgPrev, wAvgReal, desv, clsDesv, nC, nA, kpiLabel } = useMemo(() => {
    const base = projetoSelecionado ? [projetoSelecionado] : projetosCurva
    const vtot = base.reduce((s, p) => s + p.valor, 0)
    const prev = base.length && vtot ? base.reduce((s, p) => s + p.valor * p.prev, 0) / vtot : 0
    const real = base.length && vtot ? base.reduce((s, p) => s + p.valor * p.real, 0) / vtot : 0
    return {
      kpiBase: base,
      VTOT: vtot,
      wAvgPrev: prev,
      wAvgReal: real,
      desv: real - prev,
      clsDesv: classify(prev, real),
      nC: base.filter(p => classify(p.prev, p.real).k === 'vermelho').length,
      nA: base.filter(p => classify(p.prev, p.real).k === 'amarelo').length,
      kpiLabel: projetoSelecionado ? `OS ${projetoSelecionado.os}` : (curvaResp !== 'todos' ? curvaResp : 'portfólio completo')
    }
  }, [projetoSelecionado, projetosCurva, curvaResp])

  const handleSalvar = useCallback(async (dados) => {
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
  }, [formProjeto, criarProjeto, editarProjeto])

  const handleExcluir = useCallback(async (projeto) => {
    if (!window.confirm(`Excluir a OS "${projeto.os} — ${projeto.nome}"? Esta ação não pode ser desfeita.`)) return
    try {
      await excluirProjeto(projeto.id)
    } catch (err) {
      setToastErro('Erro ao excluir: ' + err.message)
    }
  }, [excluirProjeto])

  if (loading) return <div className="loading-screen">Carregando projetos...</div>

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

  return (
    <>
      <TopBar onNovoProjeto={podeEditar ? () => setFormProjeto('novo') : null} onSignOut={onSignOut} />
        
        <div className="dash-layout">
          {/* MIDDLE COLUMN */}
          <div className="dash-middle">
            <div className="kpis">
              <KPICardV2 lbl="Total Projects" val={kpiBase.length} pct={4} badge="1" isGreen={true} />
              <KPICardV2 lbl="Active Tasks" val={Math.floor(kpiBase.length * 5.2)} pct={76} sub="complete" badge="2" isGreen={true} />
              <KPICardV2 lbl="Budget Spent" val={mask(valorFmt(VTOT))} pct={12} sub="of total" badge="3" isGreen={false} />
              <KPICardV2 lbl="Overall Progress" val={`${fmt(wAvgReal)}%`} pct={1} sub="planned" badge="4" isGreen={true} />
              <KPICardV2 lbl="Desvio" val={`${desv >= 0 ? '+' : '−'}${fmt(Math.abs(desv))}p.p.`} pct={0} isGreen={desv >= 0} />
            </div>

            {curveOpts && (
              <ChunkErrorBoundary>
                <Suspense fallback={<div className="loading-screen" style={{ minHeight: 300 }}>Carregando gráfico...</div>}>
                  <CurvaSV2 opts={curveOpts} />
                </Suspense>
              </ChunkErrorBoundary>
            )}
          </div>
          
          {/* RIGHT COLUMN */}
          <div className="right-panel">
            <h2>Project Status Cards</h2>
            {projetosFiltrados.map(p => (
              <ProjectCardV2
                key={p.id ?? p.os}
                projeto={p}
                onClick={() => setModalProjeto(p)}
              />
            ))}
          </div>
        </div>

      {/* Modals are kept hidden at the bottom */}
      {modalProjeto && (
        <ChunkErrorBoundary>
          <Suspense fallback={<div className="loading-screen">Carregando painel do projeto...</div>}>
            <ProjectModal
              projeto={modalProjeto}
              atualizacoes={atualizacoes}
              podeEditar={podeEditar}
              onClose={() => setModalProjeto(null)}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {toast && <Toast mensagem={toast} onClose={() => setToast('')} />}
      {toastErro && <Toast mensagem={toastErro} tipo="erro" onClose={() => setToastErro('')} />}

      {showSemanal && (
        <ChunkErrorBoundary>
          <Suspense fallback={<div className="loading-screen">Aguarde...</div>}>
            <AtualizacaoSemanal
              projetos={projetos}
              onSalvar={handleSalvarSemanal}
              onFechar={() => setShowSemanal(false)}
              salvando={salvando}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {formProjeto && (
        <ChunkErrorBoundary>
          <Suspense fallback={<div className="loading-screen">Carregando formulário...</div>}>
            <ProjetoForm
              projeto={formProjeto === 'novo' ? null : formProjeto}
              onSalvar={handleSalvar}
              onFechar={() => { setFormProjeto(null); setErroForm('') }}
              salvando={salvando}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}
    </>
  )
}

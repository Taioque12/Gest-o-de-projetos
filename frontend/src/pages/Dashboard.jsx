import { useState } from 'react'
import { useProjetos } from '../hooks/useProjetos'
import { classify, valorFmt, fmt, portfolioCurveOpts } from '../utils/helpers'
import Header from '../components/Header'
import KPICard from '../components/KPICard'
import CurvaS from '../components/CurvaS'
import ProjectCard from '../components/ProjectCard'
import ProjectModal from '../components/ProjectModal'
import AlocacaoTable from '../components/AlocacaoTable'
import UploadMPP from './UploadMPP'

export default function Dashboard({ user, perfil, onSignOut }) {
  const { projetos, loading, usandoMock, refetch } = useProjetos(perfil, user?.id)
  const [filtro, setFiltro] = useState('todos')
  const [modalProjeto, setModalProjeto] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  if (loading) return <div className="loading-screen">Carregando projetos...</div>

  if (showUpload) {
    return (
      <>
        <Header perfil={perfil} onSignOut={onSignOut} onUpload={() => setShowUpload(true)} />
        <UploadMPP onBack={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); refetch() }} />
      </>
    )
  }

  const VTOT = projetos.reduce((s, p) => s + p.valor, 0)
  const wAvgPrev = projetos.length ? projetos.reduce((s, p) => s + p.valor * p.prev, 0) / VTOT : 0
  const wAvgReal = projetos.length ? projetos.reduce((s, p) => s + p.valor * p.real, 0) / VTOT : 0
  const desv = wAvgReal - wAvgPrev
  const clsDesv = classify(wAvgPrev, wAvgReal)
  const nC = projetos.filter(p => classify(p.prev, p.real).k === 'vermelho').length
  const nA = projetos.filter(p => classify(p.prev, p.real).k === 'amarelo').length

  const projetosFiltrados = filtro === 'todos'
    ? projetos
    : projetos.filter(p => classify(p.prev, p.real).k === filtro)

  const curveOpts = projetos.length ? portfolioCurveOpts(projetos) : null

  return (
    <>
      <Header perfil={perfil} onSignOut={onSignOut} onUpload={() => setShowUpload(true)} />

      <div className="wrap">
        {/* KPIs */}
        <div className="kpis">
          <KPICard lbl="Projetos Ativos" val={projetos.length} sub="em execução" />
          <KPICard lbl="Valor em Carteira" val={valorFmt(VTOT)} sub={`${projetos.length} ordens de serviço`} />
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

        {/* Curva S Portfólio */}
        <div className="panel">
          <div className="panel-head">
            <h2><span className="ico">📈</span> Curva S do Portfólio — Avanço Físico</h2>
            <div className="legend">
              <span><i className="swatch-dash" /> Previsto (linha de base)</span>
              <span><i className="swatch-solid" /> Realizado</span>
            </div>
          </div>
          <div className="panel-body">
            {curveOpts && <CurvaS opts={curveOpts} />}
            <p style={{ marginTop: 10, color: 'var(--ink-3)', fontSize: 12 }}>
              Médias ponderadas por valor de contrato · linha do tempo em calendário (semanal).
            </p>
          </div>
        </div>

        {/* Projetos */}
        <div className="panel">
          <div className="panel-head">
            <h2><span className="ico">🗂️</span> Projetos do Portfólio</h2>
            <div className="filters">
              {['todos', 'verde', 'amarelo', 'vermelho'].map(f => (
                <button
                  key={f}
                  className={`chip${filtro === f ? ' active' : ''}`}
                  onClick={() => setFiltro(f)}
                >
                  {f !== 'todos' && <span className={`dot ${f}`} />}
                  {f === 'todos' ? 'Todos' : f === 'verde' ? 'Verde' : f === 'amarelo' ? 'Atenção' : 'Crítico'}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-body">
            {projetosFiltrados.length > 0 ? (
              <div className="grid-proj">
                {projetosFiltrados.map((p, i) => (
                  <ProjectCard key={p.id ?? p.os} projeto={p} onClick={() => setModalProjeto(p)} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--ink-3)' }}>Nenhum projeto nesta classificação.</p>
            )}
          </div>
        </div>

        {/* Alocação */}
        <div className="panel">
          <div className="panel-head">
            <h2><span className="ico">👷</span> Mapa de Alocação & Gargalos de Recurso</h2>
            <span className="hint">Equipes em mais de um projeto/OS sinalizam conflito de recurso</span>
          </div>
          <div className="panel-body" style={{ overflowX: 'auto' }}>
            <AlocacaoTable projetos={projetos} />
          </div>
        </div>

        <footer>
          <b>Painel MA CONEGLIAN</b>
          {usandoMock && ' · dados fictícios para validação do formato'}
          <br />
          Estrutura: Projeto · OS · Cliente · Responsável · Prazo · Valor · Avanço Previsto × Realizado · Desvio · Alocação · Ação.
        </footer>
      </div>

      {modalProjeto && (
        <ProjectModal projeto={modalProjeto} onClose={() => setModalProjeto(null)} />
      )}
    </>
  )
}

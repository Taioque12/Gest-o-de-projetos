import { useState } from 'react'
import { useProjetos } from '../hooks/useProjetos'
import { classify, valorFmt, fmt, portfolioCurveOpts, projectCurveOpts } from '../utils/helpers'
import Header from '../components/Header'
import KPICard from '../components/KPICard'
import CurvaS from '../components/CurvaS'
import ProjectCard from '../components/ProjectCard'
import ProjectModal from '../components/ProjectModal'
import ProjetoForm from '../components/ProjetoForm'
import AlocacaoTable from '../components/AlocacaoTable'
import UploadXML from './UploadXML'
import AtualizacaoSemanal from '../components/AtualizacaoSemanal'
import Relatorio from '../components/Relatorio'
import Toast from '../components/Toast'

export default function Dashboard({ user, perfil, onSignOut, onChangeView }) {
  const { projetos, loading, usandoMock, refetch, criarProjeto, editarProjeto, excluirProjeto, atualizarSemanal } = useProjetos(perfil, user?.id)
  const [filtro, setFiltro] = useState('todos')
  const [curvaFiltro, setCurvaFiltro] = useState('portfolio')
  const [modalProjeto, setModalProjeto] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showSemanal, setShowSemanal] = useState(false)
  const [showRelatorio, setShowRelatorio] = useState(false)
  const [formProjeto, setFormProjeto] = useState(null) // null | 'novo' | projeto
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [toast, setToast] = useState('')

  const podeEditar = perfil === 'admin' || perfil === 'equipe'

  if (loading) return <div className="loading-screen">Carregando projetos...</div>

  async function handleSalvarSemanal(data, atualizacoes) {
    setSalvando(true)
    try {
      await atualizarSemanal(data, atualizacoes)
      setShowSemanal(false)
      setToast(`Avanço de ${atualizacoes.length} projeto(s) atualizado para ${data}!`)
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    }
    setSalvando(false)
  }

  if (showRelatorio) {
    return <Relatorio projetos={projetos} onFechar={() => setShowRelatorio(false)} />
  }

  if (showUpload) {
    return (
      <>
        <Header perfil={perfil} onSignOut={onSignOut} onUpload={() => setShowUpload(true)} onNovoProjeto={podeEditar ? () => setFormProjeto('novo') : null} />
        <UploadXML
          onBack={() => { setShowUpload(false); refetch() }}
          onCriado={msg => { setShowUpload(false); refetch(); setToast(msg) }}
          projetos={projetos}
          criarProjeto={criarProjeto}
          editarProjeto={editarProjeto}
        />
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

  const projetoSelecionado = projetos.find(p => p.id === curvaFiltro)
  const curveOpts = projetos.length
    ? (projetoSelecionado ? projectCurveOpts(projetoSelecionado) : portfolioCurveOpts(projetos))
    : null

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
      alert('Erro ao excluir: ' + err.message)
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
            {/* Filtro por projeto */}
            <div style={{ marginBottom: 16 }}>
              <select
                value={curvaFiltro}
                onChange={e => setCurvaFiltro(e.target.value)}
                style={{ fontSize: 13, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit', cursor: 'pointer', minWidth: 260 }}
              >
                <option value="portfolio">Portfólio completo</option>
                {projetos.map(p => (
                  <option key={p.id} value={p.id}>OS {p.os} · {p.nome}</option>
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
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
              {podeEditar && (
                <button className="btn btn-ghost" style={{ background: 'var(--brand)', color: '#fff', border: 'none' }}
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

      {toast && <Toast mensagem={toast} onClose={() => setToast('')} />}

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

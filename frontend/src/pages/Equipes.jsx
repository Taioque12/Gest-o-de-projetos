import { useState } from 'react'
import { useFuncionarios } from '../hooks/useFuncionarios'
import { useProgramacaoGlobal } from '../hooks/useProgramacaoGlobal'
import FuncionarioCard from '../components/FuncionarioCard'
import FuncionarioForm from '../components/FuncionarioForm'
import PainelEquipe from '../components/PainelEquipe'
import ProgramacaoGlobal from '../components/ProgramacaoGlobal'
import Header from '../components/Header'
import Toast from '../components/Toast'

const COMPETENCIAS_LABEL = {
  sdai:                'SDAI',
  instalacao_eletrica: 'Inst. Elétrica',
  infraestrutura:      'Infraestrutura',
  instrumentacao:      'Instrumentação',
  media_tensao:        'Média Tensão',
  alta_tensao:         'Alta Tensão',
}

export default function Equipes({ user, perfil, onSignOut, onChangeView }) {
  const { funcionarios, loading, usandoMock, criarFuncionario, editarFuncionario, excluirFuncionario } = useFuncionarios()
  const { alocacoes, projetos, loading: loadingProg } = useProgramacaoGlobal()
  const [abaEquipe, setAbaEquipe] = useState('equipe') // 'equipe' | 'programacao'
  const [form, setForm]           = useState(null)
  const [salvando, setSalvando]   = useState(false)
  const [filtroEquipe, setFiltroEquipe] = useState('todas')
  const [toast, setToast]         = useState('')
  const [selecionados, setSelecionados] = useState([])

  const podeEditar = perfil === 'admin' || perfil === 'equipe'

  const equipes = ['todas', ...Array.from(new Set(funcionarios.map(f => f.equipe).filter(Boolean))).sort()]

  const lista = filtroEquipe === 'todas'
    ? funcionarios
    : funcionarios.filter(f => f.equipe === filtroEquipe)

  const funcSelecionados = funcionarios.filter(f => selecionados.includes(f.id))

  function toggleSeleção(id) {
    setSelecionados(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function handleSalvar(dados) {
    setSalvando(true)
    try {
      if (form === 'novo') {
        await criarFuncionario(dados)
        setToast(`${dados.nome} cadastrado com sucesso!`)
      } else {
        await editarFuncionario(form.id, dados)
        setToast(`${dados.nome} atualizado!`)
      }
      setForm(null)
    } catch (err) {
      alert('Erro: ' + err.message)
    }
    setSalvando(false)
  }

  async function handleExcluir(f) {
    if (!window.confirm(`Excluir "${f.nome}"? Esta ação não pode ser desfeita.`)) return
    try {
      await excluirFuncionario(f.id)
      setSelecionados(s => s.filter(id => id !== f.id))
      setToast(`${f.nome} removido.`)
    } catch (err) {
      alert('Erro: ' + err.message)
    }
  }

  const keys = Object.keys(COMPETENCIAS_LABEL)
  const medias = keys.map(k => ({
    key:   k,
    label: COMPETENCIAS_LABEL[k],
    media: lista.length
      ? (lista.reduce((s, f) => s + parseFloat(f[k] ?? 0), 0) / lista.length).toFixed(1)
      : '—',
  }))

  if (loading) return <div className="loading-screen">Carregando equipes...</div>

  return (
    <>
      <Header
        perfil={perfil}
        onSignOut={onSignOut}
        view="equipes"
        onChangeView={onChangeView}
      />

      {/* Sub-tabs: Equipe | Programação */}
      <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', marginBottom: 0 }}>
        <div className="wrap" style={{ display: 'flex', gap: 0, paddingTop: 0, paddingBottom: 0 }}>
          {[['equipe', '👷 Equipe'], ['programacao', '🗓️ Programação']].map(([key, label]) => (
            <button key={key} onClick={() => setAbaEquipe(key)}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: abaEquipe === key ? 700 : 500, cursor: 'pointer', background: 'none', border: 'none', borderBottom: abaEquipe === key ? '2px solid var(--brand)' : '2px solid transparent', color: abaEquipe === key ? 'var(--brand)' : 'var(--ink-2)', transition: '.15s', whiteSpace: 'nowrap' }}>
              {label}
              {key === 'programacao' && alocacoes.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: '#0f7a3d', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>{alocacoes.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="wrap" style={{ display: 'grid', gridTemplateColumns: funcSelecionados.length > 0 && abaEquipe === 'equipe' ? '1fr 340px' : '1fr', gap: 24, alignItems: 'start' }}>
        <div>

          {/* ── ABA PROGRAMAÇÃO ── */}
          {abaEquipe === 'programacao' && (
            <div className="panel">
              <div className="panel-head">
                <h2><span className="ico">🗓️</span> Programação Semanal — Visão Geral</h2>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Próximas 14 semanas · todos os projetos</span>
              </div>
              <div className="panel-body">
                {loadingProg ? (
                  <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Carregando...</p>
                ) : (
                  <ProgramacaoGlobal
                    funcionarios={funcionarios}
                    alocacoes={alocacoes}
                    projetos={projetos}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── ABA EQUIPE ── */}
          {abaEquipe === 'equipe' && (
          <>
          {/* Painel de resumo */}
          <div className="panel">
            <div className="panel-head">
              <h2><span className="ico">📊</span> Mapa de Competências — Média do Grupo</h2>
              {usandoMock && <span className="badge-fic">dados fictícios</span>}
            </div>
            <div className="panel-body">
              <div className="comp-resumo-grid">
                {medias.map(({ key, label, media }) => {
                  const n = parseFloat(media) || 0
                  const cor = n >= 7 ? '#16a34a' : n >= 5 ? '#ca8a04' : '#dc2626'
                  return (
                    <div key={key} className="comp-resumo-item">
                      <div className="comp-resumo-bar-wrap">
                        <div className="comp-resumo-bar" style={{ height: `${n * 10}%`, background: cor }} />
                      </div>
                      <div className="comp-resumo-val" style={{ color: cor }}>{media}</div>
                      <div className="comp-resumo-label">{label}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-3)' }}>
                🟢 Coberto (≥7) &nbsp;|&nbsp; 🟡 Intermediário (5–6) &nbsp;|&nbsp; 🔴 Gap crítico (&lt;5)
              </div>
            </div>
          </div>

          {/* Lista de funcionários */}
          <div className="panel">
            <div className="panel-head">
              <h2><span className="ico">👷</span> Funcionários e Equipes</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="filters">
                  {equipes.map(eq => (
                    <button
                      key={eq}
                      className={`chip${filtroEquipe === eq ? ' active' : ''}`}
                      onClick={() => setFiltroEquipe(eq)}
                    >
                      {eq === 'todas' ? 'Todas' : eq}
                    </button>
                  ))}
                </div>
                {podeEditar && (
                  <button
                    className="btn btn-ghost"
                    style={{ background: 'var(--brand)', color: '#fff', border: 'none' }}
                    onClick={() => setForm('novo')}
                  >
                    + Novo Funcionário
                  </button>
                )}
              </div>
            </div>
            <div className="panel-body">
              {lista.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)' }}>
                  <p>Nenhum funcionário cadastrado.</p>
                  {podeEditar && (
                    <button className="btn btn-ghost"
                      style={{ marginTop: 12, color: 'var(--brand)', border: '1px solid var(--brand)' }}
                      onClick={() => setForm('novo')}>
                      + Cadastrar primeiro funcionário
                    </button>
                  )}
                </div>
              ) : (
                <div className="func-grid">
                  {lista.map(f => (
                    <FuncionarioCard
                      key={f.id}
                      funcionario={f}
                      selecionado={selecionados.includes(f.id)}
                      onToggleSeleção={() => toggleSeleção(f.id)}
                      onEditar={() => podeEditar && setForm(f)}
                      onExcluir={() => podeEditar && handleExcluir(f)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <footer>
            <b>Painel MA CONEGLIAN</b>
            {usandoMock && ' · dados fictícios para validação do formato'}
          </footer>
          </>)}

        </div>

        {/* Painel lateral de equipe — só na aba Equipe */}
        {abaEquipe === 'equipe' && funcSelecionados.length > 0 && (
          <div style={{ position: 'sticky', top: 88 }}>
            <PainelEquipe
              selecionados={funcSelecionados}
              onRemover={id => setSelecionados(s => s.filter(x => x !== id))}
              onLimpar={() => setSelecionados([])}
            />
          </div>
        )}
      </div>

      {form && (
        <FuncionarioForm
          funcionario={form === 'novo' ? null : form}
          onSalvar={handleSalvar}
          onFechar={() => setForm(null)}
          salvando={salvando}
        />
      )}

      {toast && <Toast mensagem={toast} onClose={() => setToast('')} />}
    </>
  )
}

import { useState } from 'react'
import { useFuncionarios } from '../hooks/useFuncionarios'
import FuncionarioCard from '../components/FuncionarioCard'
import FuncionarioForm from '../components/FuncionarioForm'
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
  const [form, setForm]       = useState(null) // null | 'novo' | funcionario
  const [salvando, setSalvando] = useState(false)
  const [filtroEquipe, setFiltroEquipe] = useState('todas')
  const [toast, setToast]     = useState('')

  const podeEditar = perfil === 'admin' || perfil === 'equipe'

  const equipes = ['todas', ...Array.from(new Set(funcionarios.map(f => f.equipe).filter(Boolean))).sort()]

  const lista = filtroEquipe === 'todas'
    ? funcionarios
    : funcionarios.filter(f => f.equipe === filtroEquipe)

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
      setToast(`${f.nome} removido.`)
    } catch (err) {
      alert('Erro: ' + err.message)
    }
  }

  // Resumo por competência (média do grupo)
  const keys = Object.keys(COMPETENCIAS_LABEL)
  const medias = keys.map(k => ({
    key:  k,
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

      <div className="wrap">
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
                const cor = n >= 8 ? '#16a34a' : n >= 5 ? '#ca8a04' : '#dc2626'
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
              🟢 Especialista (8-10) &nbsp;|&nbsp; 🟡 Intermediário (5-7) &nbsp;|&nbsp; 🔴 Em desenvolvimento (0-4)
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
                    {eq === 'todas' ? 'Todas as equipes' : eq}
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

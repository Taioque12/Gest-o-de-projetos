import { useState } from 'react'
import { useFuncionarios } from '../hooks/useFuncionarios'
import { useHabilidades } from '../hooks/useHabilidades'
import { useProgramacaoGlobal } from '../hooks/useProgramacaoGlobal'
import { useUsuarios } from '../hooks/useUsuarios'
import FuncionarioCard from '../components/FuncionarioCard'
import FuncionarioForm from '../components/FuncionarioForm'
import PainelEquipe from '../components/PainelEquipe'
import ProgramacaoGlobal from '../components/ProgramacaoGlobal'
import Header from '../components/Header'
import Toast from '../components/Toast'

// ── Modal CRUD de habilidades ────────────────────────────────
function ModalHabilidades({ habilidades, onCriar, onExcluir, onFechar }) {
  const [novaHab, setNovaHab] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleCriar(e) {
    e.preventDefault()
    if (!novaHab.trim()) { setErro('Digite o nome da habilidade.'); return }
    if (habilidades.some(h => h.nome.toLowerCase() === novaHab.trim().toLowerCase())) {
      setErro('Habilidade já existe.'); return
    }
    setSalvando(true)
    setErro('')
    try {
      await onCriar(novaHab)
      setNovaHab('')
    } catch (err) {
      setErro('Erro: ' + err.message)
    }
    setSalvando(false)
  }

  async function handleExcluir(h) {
    if (!window.confirm(`Remover "${h.nome}"?\n\nAs notas existentes serão preservadas, mas a habilidade não aparecerá mais em novos cadastros.`)) return
    try {
      await onExcluir(h.id)
    } catch (err) {
      alert('Erro: ' + err.message)
    }
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-head verde">
          <button className="close" onClick={onFechar}>×</button>
          <h2>⚙️ Gerenciar Habilidades</h2>
          <p>Defina as áreas técnicas avaliadas em todos os colaboradores</p>
        </div>
        <div className="modal-body">
          <form onSubmit={handleCriar} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              value={novaHab}
              onChange={e => { setNovaHab(e.target.value); setErro('') }}
              placeholder="Ex: Automação Industrial, Fibra Óptica..."
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-login"
              style={{ width: 'auto', padding: '10px 18px', margin: 0, whiteSpace: 'nowrap' }}
              disabled={salvando}
            >
              {salvando ? '...' : '+ Adicionar'}
            </button>
          </form>
          {erro && <div className="form-erro" style={{ marginTop: -12, marginBottom: 12 }}>{erro}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {habilidades.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '16px 0' }}>
                Nenhuma habilidade cadastrada. Adicione a primeira acima.
              </p>
            )}
            {habilidades.map((h, i) => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: 'var(--surface-2)', border: '1px solid var(--line)',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, minWidth: 0, wordBreak: 'break-word' }}>{h.nome}</span>
                <button
                  onClick={() => handleExcluir(h)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#dc2626', fontSize: 16, padding: '2px 6px', borderRadius: 4,
                    lineHeight: 1,
                  }}
                  title="Remover habilidade"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 12, color: '#166534' }}>
            💡 <b>Multi-empresa:</b> Cada empresa terá seu próprio conjunto de habilidades. As habilidades aqui configuradas se aplicam a todos os colaboradores desta empresa.
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" style={{ color: 'var(--ink)', border: '1px solid var(--line)' }} onClick={onFechar}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function Equipes({ user, perfil, empresaId, onSignOut, onChangeView }) {
  const { funcionarios, loading, usandoMock, criarFuncionario, editarFuncionario, excluirFuncionario } = useFuncionarios(empresaId)
  const { habilidades, criarHabilidade, excluirHabilidade } = useHabilidades(empresaId)
  const { alocacoes, projetos, indisponibilidades, loading: loadingProg, alocar, copiarSemana, marcarIndisponivel, desmarcarIndisponivel } = useProgramacaoGlobal(empresaId)
  const { membros } = useUsuarios(empresaId)
  const membrosEquipe = membros.filter(m => m.perfil === 'equipe')

  const [abaEquipe, setAbaEquipe]       = useState('equipe')
  const [form, setForm]                 = useState(null)
  const [salvando, setSalvando]         = useState(false)
  const [filtroEquipe, setFiltroEquipe] = useState('todas')
  const [toast, setToast]               = useState('')
  const [selecionados, setSelecionados] = useState([])
  const [modalHab, setModalHab]         = useState(false)

  const podeEditar = perfil === 'admin' || perfil === 'equipe'
  const isAdmin    = perfil === 'admin'

  const equipes = ['todas', ...Array.from(new Set(funcionarios.map(f => f.equipe).filter(Boolean))).sort()]
  const lista   = filtroEquipe === 'todas' ? funcionarios : funcionarios.filter(f => f.equipe === filtroEquipe)
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

  // Mapa de competências — média por habilidade
  const medias = habilidades.map(h => ({
    id:    h.id,
    label: h.nome,
    media: lista.length
      ? (lista.reduce((s, f) => s + parseFloat(f.avaliacoes?.[h.id] ?? 0), 0) / lista.length).toFixed(1)
      : '—',
  }))

  if (loading) return <div className="loading-screen">Carregando equipes...</div>

  return (
    <>
      <Header perfil={perfil} onSignOut={onSignOut} view="equipes" onChangeView={onChangeView} />

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

      <div className="wrap equipe-layout" style={{ display: 'grid', gridTemplateColumns: funcSelecionados.length > 0 && abaEquipe === 'equipe' ? '1fr 340px' : '1fr', gap: 24, alignItems: 'start' }}>
        <div>

          {/* ── ABA PROGRAMAÇÃO ── */}
          {abaEquipe === 'programacao' && (
            <div className="panel">
              <div className="panel-head" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <span className="ico">🗓️</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Programação Semanal</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>Visão geral · todos os colaboradores e projetos</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 10px' }}>
                    {funcionarios.length} colaborador{funcionarios.length !== 1 ? 'es' : ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 10px' }}>
                    {alocacoes.length > 0 ? `${new Set(alocacoes.map(a => a.projeto_id)).size} projetos ativos` : 'Sem alocações'}
                  </span>
                </div>
              </div>
              <div className="panel-body">
                {loadingProg ? (
                  <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Carregando...</p>
                ) : (
                  <ProgramacaoGlobal
                    funcionarios={funcionarios}
                    alocacoes={alocacoes}
                    projetos={projetos}
                    indisponibilidades={indisponibilidades}
                    onAlocar={alocar}
                    copiarSemana={copiarSemana}
                    onMarcarIndisp={marcarIndisponivel}
                    onDesmarcarIndisp={desmarcarIndisponivel}
                    podeEditar={podeEditar}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── ABA EQUIPE ── */}
          {abaEquipe === 'equipe' && (
          <>
            {/* Mapa de competências */}
            <div className="panel">
              <div className="panel-head">
                <h2><span className="ico">📊</span> Mapa de Competências — Média do Grupo</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {usandoMock && <span className="badge-fic">dados fictícios</span>}
                  {isAdmin && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '5px 12px', color: 'var(--brand)', border: '1px solid var(--brand)' }}
                      onClick={() => setModalHab(true)}
                    >
                      ⚙️ Gerenciar Habilidades
                    </button>
                  )}
                </div>
              </div>
              <div className="panel-body">
                {medias.length === 0 ? (
                  <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                    Nenhuma habilidade cadastrada.{isAdmin && <> <button className="btn btn-ghost" style={{ color: 'var(--brand)', border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }} onClick={() => setModalHab(true)}>Adicionar agora →</button></>}
                  </p>
                ) : (
                  <>
                    <div className="comp-resumo-grid">
                      {medias.map(({ id, label, media }) => {
                        const n = parseFloat(media) || 0
                        const cor = n >= 7 ? '#16a34a' : n >= 5 ? '#ca8a04' : '#dc2626'
                        return (
                          <div key={id} className="comp-resumo-item">
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
                  </>
                )}
              </div>
            </div>

            {/* Lista de funcionários */}
            <div className="panel">
              <div className="panel-head">
                <h2><span className="ico">👷</span> Funcionários e Equipes</h2>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="filters">
                    {equipes.map(eq => (
                      <button key={eq} className={`chip${filtroEquipe === eq ? ' active' : ''}`} onClick={() => setFiltroEquipe(eq)}>
                        {eq === 'todas' ? 'Todas' : eq}
                      </button>
                    ))}
                  </div>
                  {podeEditar && (
                    <button className="btn btn-ghost" style={{ background: 'var(--brand)', color: '#fff', border: 'none' }} onClick={() => setForm('novo')}>
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
                      <button className="btn btn-ghost" style={{ marginTop: 12, color: 'var(--brand)', border: '1px solid var(--brand)' }} onClick={() => setForm('novo')}>
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
                        habilidades={habilidades}
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
              <b>Gestão de Projetos</b>
              {usandoMock && ' · dados fictícios para validação do formato'}
            </footer>
          </>)}
        </div>

        {abaEquipe === 'equipe' && funcSelecionados.length > 0 && (
          <div style={{ position: 'sticky', top: 88 }}>
            <PainelEquipe
              selecionados={funcSelecionados}
              habilidades={habilidades}
              onRemover={id => setSelecionados(s => s.filter(x => x !== id))}
              onLimpar={() => setSelecionados([])}
            />
          </div>
        )}
      </div>

      {form && (
        <FuncionarioForm
          funcionario={form === 'novo' ? null : form}
          habilidades={habilidades}
          usuariosDisponiveis={membrosEquipe}
          onSalvar={handleSalvar}
          onFechar={() => setForm(null)}
          salvando={salvando}
        />
      )}

      {modalHab && (
        <ModalHabilidades
          habilidades={habilidades}
          onCriar={criarHabilidade}
          onExcluir={excluirHabilidade}
          onFechar={() => setModalHab(false)}
        />
      )}

      {toast && <Toast mensagem={toast} onClose={() => setToast('')} />}
    </>
  )
}

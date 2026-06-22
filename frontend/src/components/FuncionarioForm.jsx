import { useState, useEffect } from 'react'

const ITENS = [
  { key: 'sdai',                label: 'Alarme de Incêndio (SDAI)' },
  { key: 'instalacao_eletrica', label: 'Instalação Elétrica' },
  { key: 'infraestrutura',      label: 'Montagem de Infraestrutura' },
  { key: 'instrumentacao',      label: 'Instrumentação' },
  { key: 'media_tensao',        label: 'Média Tensão' },
  { key: 'alta_tensao',         label: 'Alta Tensão' },
]

function corNota(n) {
  if (n >= 8) return '#166534'
  if (n >= 5) return '#92400e'
  return '#991b1b'
}

export default function FuncionarioForm({ funcionario, onSalvar, onFechar, salvando }) {
  const ed = !!funcionario
  const [form, setForm] = useState({
    nome:               funcionario?.nome               ?? '',
    cargo:              funcionario?.cargo              ?? '',
    equipe:             funcionario?.equipe             ?? '',
    sdai:               funcionario?.sdai               ?? 0,
    instalacao_eletrica:funcionario?.instalacao_eletrica?? 0,
    infraestrutura:     funcionario?.infraestrutura     ?? 0,
    instrumentacao:     funcionario?.instrumentacao     ?? 0,
    media_tensao:       funcionario?.media_tensao       ?? 0,
    alta_tensao:        funcionario?.alta_tensao        ?? 0,
  })
  const [erro, setErro] = useState('')

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onFechar])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) { setErro('Informe o nome.'); return }
    setErro('')
    onSalvar({
      nome:                form.nome.trim(),
      cargo:               form.cargo.trim(),
      equipe:              form.equipe.trim(),
      sdai:                Number(form.sdai),
      instalacao_eletrica: Number(form.instalacao_eletrica),
      infraestrutura:      Number(form.infraestrutura),
      instrumentacao:      Number(form.instrumentacao),
      media_tensao:        Number(form.media_tensao),
      alta_tensao:         Number(form.alta_tensao),
    })
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-head verde">
          <button className="close" onClick={onFechar}>×</button>
          <h2>{ed ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
          <p>Preencha os dados e as notas de avaliação técnica (0 a 10)</p>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {erro && <div className="form-erro">{erro}</div>}

          <div className="form-section-title">Dados Pessoais</div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Nome *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="João da Silva" />
            </div>
            <div className="field">
              <label>Cargo</label>
              <input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Técnico Eletricista" />
            </div>
            <div className="field">
              <label>Equipe</label>
              <input value={form.equipe} onChange={e => set('equipe', e.target.value)} placeholder="Equipe A" />
            </div>
          </div>

          <div className="form-section-title">Avaliação Técnica</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ITENS.map(({ key, label }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>{label}</label>
                  <span style={{ fontWeight: 800, fontSize: 15, color: corNota(form[key]), minWidth: 24, textAlign: 'right' }}>
                    {form[key]}
                  </span>
                </div>
                <input
                  type="range" min="0" max="10" step="0.5"
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  className="avaliacao-slider"
                  style={{ '--pct': `${form[key] * 10}%` }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                  <span>0 — Sem conhecimento</span>
                  <span>5 — Intermediário</span>
                  <span>10 — Especialista</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-ghost"
              style={{ color: 'var(--ink)', border: '1px solid var(--line)' }} onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn-login"
              style={{ width: 'auto', padding: '10px 28px', margin: 0 }} disabled={salvando}>
              {salvando ? 'Salvando...' : ed ? 'Salvar alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

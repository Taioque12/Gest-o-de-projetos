import { useState, useEffect } from 'react'

const ESCOPOS = [
  'Instalações elétricas / MT',
  'Infraestrutura / BT',
  'SPDA / Aterramento',
  'SDAI',
  'Automação / Comissionamento',
  'Iluminação',
  'Outro',
]

function calcPrazo(inicio, fim) {
  if (!inicio || !fim) return ''
  const ms = new Date(fim) - new Date(inicio)
  if (ms <= 0) return ''
  return Math.round((ms / (1000 * 60 * 60 * 24 * 30.44)) * 10) / 10
}

export default function ProjetoForm({ projeto, onSalvar, onFechar, salvando }) {
  const ed = !!projeto

  const [form, setForm] = useState({
    os:            projeto?.os            ?? '',
    nome:          projeto?.nome          ?? '',
    cliente:       projeto?.cliente       ?? '',
    escopo:        projeto?.escopo        ?? '',
    responsavel:   projeto?.responsavel   ?? '',
    data_inicio:   projeto?.inicio        ?? '',
    data_fim:      projeto?.fim           ?? '',
    valor_os:      projeto?.valor         ?? '',
    acao:          projeto?.acao          ?? '',
    prev:          projeto?.prev          ?? 0,
    real:          projeto?.real          ?? 0,
  })
  const [equipes, setEquipes] = useState(projeto?.equipes ?? [])
  const [equipeInput, setEquipeInput] = useState('')
  const [erro, setErro] = useState('')

  const prazo = calcPrazo(form.data_inicio, form.data_fim)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function addEquipe() {
    const v = equipeInput.trim()
    if (v && !equipes.includes(v)) setEquipes(eq => [...eq, v])
    setEquipeInput('')
  }

  function removeEquipe(i) { setEquipes(eq => eq.filter((_, idx) => idx !== i)) }

  function validate() {
    if (!form.os.trim())         return 'Informe o número da OS.'
    if (!form.nome.trim())       return 'Informe o nome do projeto.'
    if (!form.cliente.trim())    return 'Informe o cliente.'
    if (!form.data_inicio)       return 'Informe a data de início.'
    if (!form.data_fim)          return 'Informe a data de término.'
    if (form.data_fim <= form.data_inicio) return 'Data de término deve ser após o início.'
    const prev = Number(form.prev), real = Number(form.real)
    if (prev < 0 || prev > 100) return 'Avanço previsto deve estar entre 0 e 100.'
    if (real < 0 || real > 100) return 'Avanço realizado deve estar entre 0 e 100.'
    return ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setErro(err); return }
    setErro('')
    onSalvar({
      os:              form.os.trim(),
      nome:            form.nome.trim(),
      cliente:         form.cliente.trim(),
      escopo:          form.escopo.trim(),
      responsavel:     form.responsavel.trim(),
      data_inicio:     form.data_inicio,
      data_fim:        form.data_fim,
      prazo_meses:     prazo || null,
      valor_os:        form.valor_os ? Number(form.valor_os) : null,
      equipes,
      acao_recomendada: form.acao.trim(),
      prev:            Number(form.prev),
      real:            Number(form.real),
    })
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal" style={{ maxWidth: 860 }}>
        <div className="modal-head verde">
          <button className="close" onClick={onFechar}>×</button>
          <h2>{ed ? 'Editar Projeto / OS' : 'Nova Ordem de Serviço'}</h2>
          <p>{ed ? `OS ${projeto.os}` : 'Preencha os dados da nova OS'}</p>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {erro && <div className="form-erro">{erro}</div>}

          <div className="form-section-title">Identificação</div>
          <div className="form-grid">
            <div className="field">
              <label>Nº OS *</label>
              <input value={form.os} onChange={e => set('os', e.target.value)}
                placeholder="2024-0142" disabled={ed} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Nome do Projeto *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                placeholder="Subestação 13,8kV / 480V — Ampliação" />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Cliente *</label>
              <input value={form.cliente} onChange={e => set('cliente', e.target.value)}
                placeholder="Petroquímica Norte S.A." />
            </div>
            <div className="field">
              <label>Escopo</label>
              <select value={form.escopo} onChange={e => set('escopo', e.target.value)}>
                <option value="">Selecione...</option>
                {ESCOPOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Responsável</label>
              <input value={form.responsavel} onChange={e => set('responsavel', e.target.value)}
                placeholder="Eng. Carlos Menezes" />
            </div>
          </div>

          <div className="form-section-title">Cronograma & Valor</div>
          <div className="form-grid">
            <div className="field">
              <label>Data Início *</label>
              <input type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
            </div>
            <div className="field">
              <label>Data Término *</label>
              <input type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} />
            </div>
            <div className="field">
              <label>Prazo (meses)</label>
              <input value={prazo || ''} readOnly style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Valor da OS (R$)</label>
              <input type="number" min="0" step="1000" value={form.valor_os}
                onChange={e => set('valor_os', e.target.value)} placeholder="2850000" />
            </div>
          </div>

          <div className="form-section-title">Avanço Físico Atual</div>
          <div className="form-grid">
            <div className="field">
              <label>Previsto (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.prev}
                onChange={e => set('prev', e.target.value)} />
            </div>
            <div className="field">
              <label>Realizado (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.real}
                onChange={e => set('real', e.target.value)} />
            </div>
            <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
              {form.prev !== '' && form.real !== '' && (
                <div style={{ fontSize: 13, color: 'var(--ink-2)', paddingBottom: 10 }}>
                  Desvio: <b style={{ color: Number(form.real) - Number(form.prev) >= -5 ? 'var(--verde)' : Number(form.real) - Number(form.prev) >= -10 ? 'var(--amarelo)' : 'var(--vermelho)' }}>
                    {(Number(form.real) - Number(form.prev)).toFixed(1)} p.p.
                  </b>
                </div>
              )}
            </div>
          </div>

          <div className="form-section-title">Equipes</div>
          <div className="field">
            <label>Adicionar equipe</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={equipeInput} onChange={e => setEquipeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEquipe() } }}
                placeholder="Equipe A · Montagem Eletromecânica" style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost"
                style={{ color: 'var(--brand)', border: '1px solid var(--brand)' }}
                onClick={addEquipe}>+ Adicionar</button>
            </div>
            {equipes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {equipes.map((eq, i) => (
                  <span key={i} className="tag" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {eq}
                    <button type="button" onClick={() => removeEquipe(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-2)', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-section-title">Ação Recomendada</div>
          <div className="field">
            <label>Descrição da ação</label>
            <textarea value={form.acao} onChange={e => set('acao', e.target.value)}
              rows={3} placeholder="Manter ritmo. Antecipar mobilização da Equipe D..." />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost"
              style={{ color: 'var(--ink)', border: '1px solid var(--line)' }} onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn-login"
              style={{ width: 'auto', padding: '10px 28px', margin: 0 }} disabled={salvando}>
              {salvando ? 'Salvando...' : ed ? 'Salvar alterações' : 'Criar OS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

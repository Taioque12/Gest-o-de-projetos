import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

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

export default function ProjetoForm({ projeto, initialValues, onSalvar, onFechar, salvando }) {
  const ed = !!projeto
  // initialValues é usado apenas no modo criação (projeto=null) para pré-preencher campos do XML
  const iv = initialValues ?? {}

  const [form, setForm] = useState({
    os:            projeto?.os            ?? '',
    nome:          projeto?.nome          ?? iv.nome          ?? '',
    cliente:       projeto?.cliente       ?? iv.cliente       ?? '',
    escopo:        projeto?.escopo        ?? iv.escopo        ?? '',
    responsavel:   projeto?.responsavel   ?? iv.responsavel   ?? '',
    data_inicio:   projeto?.inicio        ?? iv.data_inicio   ?? '',
    data_fim:      projeto?.fim           ?? iv.data_fim      ?? '',
    valor_os:      projeto?.valor         ?? iv.valor_os      ?? '',
    acao:          projeto?.acao          ?? iv.acao          ?? '',
    prev:          projeto?.prev          ?? iv.prev          ?? 0,
    real:          projeto?.real          ?? iv.real          ?? 0,
  })
  const [equipes, setEquipes] = useState(projeto?.equipes ?? iv.equipes ?? [])
  const [equipeInput, setEquipeInput] = useState('')
  const [erro, setErro] = useState('')
  const [camposErro, setCamposErro] = useState({})

  const [iaPrompt, setIaPrompt] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const [projetosSimilares, setProjetosSimilares] = useState([])

  async function handleGerarIA() {
    if (!iaPrompt) return
    setIaLoading(true)
    setErro('')
    try {
      const { data, error } = await supabase.functions.invoke('wbs-generator', {
        body: { prompt: iaPrompt }
      })
      if (error) throw error
      if (data.error || data.erro) throw new Error(data.error || data.erro)
      
      setForm(prev => ({
        ...prev,
        nome: data.nome || prev.nome,
        escopo: data.escopo || prev.escopo
      }))
      if (data.frentes && Array.isArray(data.frentes)) {
        setEquipes(data.frentes)
      }
      
      // Se retornou dias_estimados e temos data de inicio preenchida, calculamos o fim
      if (data.dias_estimados && form.data_inicio) {
        const d = new Date(form.data_inicio)
        d.setDate(d.getDate() + data.dias_estimados)
        setForm(prev => ({ ...prev, data_fim: d.toISOString().slice(0, 10) }))
      }
      if (data.projetos_similares && Array.isArray(data.projetos_similares)) {
        setProjetosSimilares(data.projetos_similares)
      } else {
        setProjetosSimilares([])
      }
      
      setIaPrompt('')
    } catch (err) {
      console.error(err)
      setErro('Erro na IA: ' + err.message)
    } finally {
      setIaLoading(false)
    }
  }

  const prazo = calcPrazo(form.data_inicio, form.data_fim)

  const hoje = new Date().toISOString().slice(0, 10)
  const warnings = []
  if (form.data_fim && form.data_fim < hoje)
    warnings.push('⚠️ Data de término no passado — projeto já encerrado.')
  if (form.data_inicio && form.data_inicio > hoje && Number(form.real) > 0)
    warnings.push('⚠️ Projeto tem avanço realizado mas ainda não iniciou.')
  if (Number(form.real) - Number(form.prev) > 20)
    warnings.push('⚠️ Realizado está muito acima do previsto (+20 p.p.) — verifique os valores.')

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    if (camposErro[k]) setCamposErro(e => { const n = { ...e }; delete n[k]; return n })
  }

  const fieldStyle = k => camposErro[k] ? { border: '1.5px solid var(--vermelho)' } : {}
  const FieldErro = ({ k }) => camposErro[k]
    ? <span style={{ fontSize: 11, color: 'var(--vermelho)', marginTop: 2 }}>{camposErro[k]}</span>
    : null

  function addEquipe() {
    const v = equipeInput.trim()
    if (v && !equipes.includes(v)) setEquipes(eq => [...eq, v])
    setEquipeInput('')
  }

  function removeEquipe(i) { setEquipes(eq => eq.filter((_, idx) => idx !== i)) }

  function validate() {
    const erros = {}
    if (!form.os.trim())         erros.os = 'Obrigatório.'
    if (!form.nome.trim())       erros.nome = 'Obrigatório.'
    if (!form.cliente.trim())    erros.cliente = 'Obrigatório.'
    if (!form.data_inicio)       erros.data_inicio = 'Obrigatório.'
    if (!form.data_fim)          erros.data_fim = 'Obrigatório.'
    if (form.data_inicio && form.data_fim && form.data_fim <= form.data_inicio)
      erros.data_fim = 'Término deve ser após o início.'
    const prev = Number(form.prev), real = Number(form.real)
    if (prev < 0 || prev > 100) erros.prev = 'Entre 0 e 100.'
    if (real < 0 || real > 100) erros.real = 'Entre 0 e 100.'
    return erros
  }

  function handleSubmit(e) {
    e.preventDefault()
    const erros = validate()
    if (Object.keys(erros).length) {
      setCamposErro(erros)
      setErro('Corrija os campos destacados antes de salvar.')
      return
    }
    setCamposErro({})
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
          {!ed && (
            <div className="ia-box" style={{ marginBottom: 24, padding: 16, background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)', marginBottom: 8 }}>✨ WBS Inteligente (Gerador de Escopo)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  placeholder="Ex: Instalação de gerador 500kVA na filial Sul..." 
                  value={iaPrompt}
                  onChange={e => setIaPrompt(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'oklch(0 0 0 / .3)', color: 'var(--ink)' }}
                />
                <button 
                  type="button" 
                  onClick={handleGerarIA} 
                  disabled={iaLoading || !iaPrompt}
                  style={{ background: 'var(--brand)', color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 600, cursor: iaLoading || !iaPrompt ? 'not-allowed' : 'pointer', opacity: iaLoading || !iaPrompt ? 0.6 : 1 }}
                >
                  {iaLoading ? 'Gerando...' : 'Gerar IA'}
                </button>
              </div>
              
              {projetosSimilares.length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>📚 Histórico Semelhante (AgentDB)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {projetosSimilares.map((p, i) => (
                      <div key={i} style={{ padding: 12, background: 'var(--surface-solid)', borderRadius: 8, border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{Math.round(p.similaridade * 100)}% Match</div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>{p.conteudo_texto}</div>
                        {p.metadata && p.metadata.acao_recomendada && (
                          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--laranja)', background: 'oklch(1 0 0 / .05)', padding: '4px 8px', borderRadius: 4 }}>
                            <strong>Risco Histórico:</strong> {p.metadata.acao_recomendada}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {erro && <div className="form-erro">{erro}</div>}
          {warnings.map((w, i) => (
            <div key={i} style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#854d0e', marginBottom: 8 }}>{w}</div>
          ))}

          <div className="form-section-title">Identificação</div>
          <div className="form-grid">
            <div className="field">
              <label>Nº OS *</label>
              <input value={form.os} onChange={e => set('os', e.target.value)}
                placeholder="2024-0142" disabled={ed} style={fieldStyle('os')} />
              <FieldErro k="os" />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Nome do Projeto *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                placeholder="Subestação 13,8kV / 480V — Ampliação" style={fieldStyle('nome')} />
              <FieldErro k="nome" />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Cliente *</label>
              <input value={form.cliente} onChange={e => set('cliente', e.target.value)}
                placeholder="Petroquímica Norte S.A." style={fieldStyle('cliente')} />
              <FieldErro k="cliente" />
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
              <input type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} style={fieldStyle('data_inicio')} />
              <FieldErro k="data_inicio" />
            </div>
            <div className="field">
              <label>Data Término *</label>
              <input type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} style={fieldStyle('data_fim')} />
              <FieldErro k="data_fim" />
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
                onChange={e => set('prev', e.target.value)} style={fieldStyle('prev')} />
              <FieldErro k="prev" />
            </div>
            <div className="field">
              <label>Realizado (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.real}
                onChange={e => set('real', e.target.value)} style={fieldStyle('real')} />
              <FieldErro k="real" />
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

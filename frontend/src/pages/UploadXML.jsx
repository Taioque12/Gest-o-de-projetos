import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import ProjetoForm from '../components/ProjetoForm'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_KEY}`

function buildPrompt(projeto, tarefas) {
  const hoje = new Date().toISOString().slice(0, 10)
  const linhasTarefas = tarefas.slice(0, 40).map(t =>
    `  - ${t.nome}: ${t.previsto}% completo | ${t.inicio} → ${t.fim}`
  ).join('\n')

  return `Você é um consultor sênior especializado em gerenciamento de projetos de engenharia elétrica (instalações, subestações, automação, comissionamento).

Analise o cronograma abaixo e responda em português, de forma objetiva e prática.

## Dados do Projeto
- Nome: ${projeto.nome || '(não informado)'}
- Data de início: ${projeto.inicio || '(não informada)'}
- Data de término prevista: ${projeto.fim || '(não informada)'}
- Avanço físico geral: ${projeto.prev}%
- Data de referência: ${hoje}
- Total de tarefas: ${tarefas.length}

## Tarefas do Cronograma
${linhasTarefas}
${tarefas.length > 40 ? `  ... (+ ${tarefas.length - 40} tarefas não exibidas)` : ''}

## Instruções
Forneça uma análise estruturada com exatamente estas seções (use os títulos abaixo):

### 🔎 Situação geral
Uma frase resumindo a saúde do projeto (Verde / Atenção / Crítico) e o motivo principal.

### ⚠️ Pontos de atenção
Liste de 2 a 4 tarefas ou áreas que representam maior risco ao prazo ou qualidade. Seja específico com base nos dados.

### 🎯 Plano de ação recomendado
Liste de 3 a 5 ações concretas, numeradas, que o gestor deve tomar imediatamente. Use linguagem direta.

### 📊 Indicadores-chave
- Risco de atraso: (Baixo / Médio / Alto)
- Recomendação de revisão do cronograma: (Sim / Não / Opcional)
- Prioridade de ação: (Esta semana / Este mês / Monitorar)

Seja direto. Não repita os dados brutos. Foque em insights e ações.`
}

export default function UploadXML({ onBack, onCriado, projetos = [], criarProjeto, editarProjeto }) {
  const [over, setOver]           = useState(false)
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [acao, setAcao]           = useState(null)
  const [projetoSel, setProjetoSel] = useState('')
  const [salvando, setSalvando]   = useState(false)
  const [feedbackFinal, setFeedbackFinal] = useState('')
  const [analise, setAnalise]     = useState('')
  const [analisando, setAnalisando] = useState(false)
  const [erroIA, setErroIA]       = useState('')
  const inputRef = useRef()

  function extrairProjeto(doc) {
    const nome   = doc.querySelector('Project > Name')?.textContent ?? ''
    const inicio = doc.querySelector('Project > StartDate')?.textContent?.slice(0, 10) ?? ''
    const fim    = doc.querySelector('Project > FinishDate')?.textContent?.slice(0, 10) ?? ''
    const resumo = [...doc.querySelectorAll('Task')].find(t => t.querySelector('UID')?.textContent === '0')
    const prev   = parseFloat(resumo?.querySelector('PercentComplete')?.textContent ?? '0')
    return { nome, inicio, fim, prev }
  }

  async function processarXML(file) {
    setLoading(true)
    setResultado(null)
    setAcao(null)
    setAnalise('')
    setErroIA('')
    setFeedbackFinal('')
    try {
      const texto = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(texto, 'application/xml')
      const parseErr = doc.querySelector('parsererror')
      if (parseErr) throw new Error('Arquivo XML inválido ou corrompido.')

      const projeto = extrairProjeto(doc)
      const tarefas = [...doc.querySelectorAll('Task')]
        .filter(t => {
          const sumario = t.querySelector('Summary')?.textContent
          const uid     = t.querySelector('UID')?.textContent
          const nome    = t.querySelector('Name')?.textContent ?? ''
          return sumario !== '1' && uid !== '0' && nome.trim() !== ''
        })
        .map(t => ({
          nome:     t.querySelector('Name')?.textContent ?? '',
          previsto: parseFloat(t.querySelector('PercentComplete')?.textContent ?? '0'),
          inicio:   t.querySelector('Start')?.textContent?.slice(0, 10) ?? '',
          fim:      t.querySelector('Finish')?.textContent?.slice(0, 10) ?? '',
        }))

      supabase.from('uploads_xml').insert({
        nome_arquivo:  file.name,
        status:        'sucesso',
        processado_em: new Date().toISOString(),
      }).then(() => {}).catch(() => {})

      setResultado({ ok: true, tarefas, nome: file.name, projeto })
    } catch (err) {
      setResultado({ ok: false, erro: err.message })
    }
    setLoading(false)
  }

  async function analisarComIA() {
    if (!resultado?.ok) return
    if (!GEMINI_KEY) {
      setErroIA('Chave da API do Gemini não configurada. Adicione VITE_GEMINI_API_KEY nas variáveis de ambiente do Vercel.')
      return
    }
    setAnalisando(true)
    setAnalise('')
    setErroIA('')
    try {
      const prompt = buildPrompt(resultado.projeto, resultado.tarefas)
      const resp = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.3 },
        }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error?.message ?? `Erro ${resp.status}`)
      }
      const data = await resp.json()
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta da IA.'
      setAnalise(texto)
    } catch (err) {
      setErroIA('Erro ao consultar Gemini: ' + err.message)
    }
    setAnalisando(false)
  }

  async function handleCriarProjeto(dados) {
    setSalvando(true)
    try {
      await criarProjeto(dados)
      if (onCriado) onCriado(`Projeto "${dados.nome}" importado do XML e adicionado ao dashboard!`)
    } catch (err) {
      alert('Erro ao criar projeto: ' + err.message)
      setSalvando(false)
    }
  }

  async function handleAtualizar() {
    if (!projetoSel) return
    const proj = projetos.find(p => p.id === projetoSel)
    if (!proj) return
    setSalvando(true)
    try {
      const prev = resultado.projeto.prev ?? proj.prev
      await editarProjeto(proj.id, {
        os: proj.os, nome: proj.nome, cliente: proj.cliente,
        escopo: proj.escopo, responsavel: proj.responsavel,
        data_inicio: proj.inicio, data_fim: proj.fim,
        prazo_meses: proj.prazo ? parseFloat(proj.prazo) : null,
        valor_os: proj.valor || null, equipes: proj.equipes ?? [],
        acao_recomendada: proj.acao ?? '', prev, real: prev,
      })
      setFeedbackFinal(`✅ Avanço de "${proj.nome}" atualizado para ${prev}%.`)
      setAcao(null)
    } catch (err) {
      alert('Erro ao atualizar: ' + err.message)
    }
    setSalvando(false)
  }

  function onDrop(e) {
    e.preventDefault(); setOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processarXML(file)
  }

  function onFileChange(e) {
    const file = e.target.files[0]
    if (file) processarXML(file)
    e.target.value = ''
  }

  // Renderiza o texto markdown simples da IA (headings ### e listas -)
  function renderAnalise(texto) {
    return texto.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h4 key={i} className="ia-heading">{line.slice(4)}</h4>
      if (line.startsWith('## '))  return <h3 key={i} className="ia-heading">{line.slice(3)}</h3>
      if (line.startsWith('- ') || line.match(/^\d+\. /)) return <li key={i} className="ia-item">{line.replace(/^[-\d.] ?/, '')}</li>
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="ia-bold">{line.slice(2, -2)}</p>
      if (line.trim() === '') return <br key={i} />
      return <p key={i} className="ia-p">{line}</p>
    })
  }

  if (acao === 'novo' && resultado?.projeto) {
    const { nome, inicio, fim, prev } = resultado.projeto
    return (
      <ProjetoForm
        projeto={null}
        initialValues={{ nome, data_inicio: inicio, data_fim: fim, prev, real: prev }}
        onSalvar={handleCriarProjeto}
        onFechar={() => setAcao(null)}
        salvando={salvando}
      />
    )
  }

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>📂 Importar XML do MS Project</h2>
        <p>No MS Project: <b>Arquivo → Salvar Como → XML (*.xml)</b> e importe aqui.</p>

        <div
          className={`drop-zone${over ? ' over' : ''}`}
          onDragOver={e => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current.click()}
        >
          <div style={{ fontSize: 36 }}>📄</div>
          <p>Arraste o arquivo <b>.xml</b> aqui ou <b>clique para selecionar</b></p>
          <input ref={inputRef} type="file" accept=".xml" style={{ display: 'none' }} onChange={onFileChange} />
        </div>

        {loading && <p style={{ marginTop: 16, color: 'var(--ink-3)' }}>⏳ Processando...</p>}

        {resultado && !resultado.ok && (
          <div className="upload-result" style={{ background: 'var(--vermelho-bg)', color: '#991b1b', border: '1px solid #fca5a5' }}>
            ❌ Erro: {resultado.erro}
          </div>
        )}

        {feedbackFinal && <div className="upload-result">{feedbackFinal}</div>}

        {resultado?.ok && !feedbackFinal && (
          <>
            <div className="upload-result">
              ✅ <b>"{resultado.nome}"</b> lido — {resultado.tarefas.length} tarefa(s).
              {resultado.projeto.prev > 0 && <span> Avanço geral: <b>{resultado.projeto.prev}%</b></span>}
            </div>

            {resultado.tarefas.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 16 }}>
                <table className="upload-table">
                  <thead>
                    <tr><th>Tarefa</th><th>% Prev.</th><th>Início</th><th>Término</th></tr>
                  </thead>
                  <tbody>
                    {resultado.tarefas.slice(0, 15).map((t, i) => (
                      <tr key={i}>
                        <td>{t.nome}</td><td>{t.previsto}%</td><td>{t.inicio}</td><td>{t.fim}</td>
                      </tr>
                    ))}
                    {resultado.tarefas.length > 15 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
                          + {resultado.tarefas.length - 15} tarefa(s) adicionais
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Análise IA */}
            <div className="ia-box">
              <div className="ia-box-header">
                <span>🤖 Análise de IA — Gemini 1.5 Pro</span>
                <button
                  className="btn-login"
                  style={{ width: 'auto', padding: '8px 20px', margin: 0, fontSize: 13 }}
                  onClick={analisarComIA}
                  disabled={analisando}
                >
                  {analisando ? '⏳ Analisando...' : analise ? '🔄 Reanalisar' : '✨ Analisar cronograma'}
                </button>
              </div>

              {erroIA && (
                <div style={{ marginTop: 10, color: '#991b1b', fontSize: 13 }}>{erroIA}</div>
              )}

              {analisando && (
                <div className="ia-loading">
                  <div className="ia-spinner" />
                  <span>Gemini está analisando o cronograma...</span>
                </div>
              )}

              {analise && !analisando && (
                <div className="ia-resultado">
                  {renderAnalise(analise)}
                </div>
              )}

              {!analise && !analisando && !erroIA && (
                <p className="ia-hint">
                  Clique em "Analisar cronograma" para o Gemini identificar riscos e sugerir ações com base nas tarefas importadas.
                </p>
              )}
            </div>

            {/* Ações */}
            <div className="upload-acoes">
              <p className="upload-acoes-title">O que fazer com estes dados?</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="btn-login"
                  style={{ width: 'auto', padding: '10px 22px', margin: 0 }}
                  onClick={() => setAcao('novo')}
                >
                  ➕ Criar como novo projeto
                </button>
                {projetos.length > 0 && (
                  <button
                    className="btn btn-ghost"
                    style={{ color: 'var(--brand)', border: '1px solid var(--brand)' }}
                    onClick={() => setAcao('atualizar')}
                  >
                    🔄 Atualizar projeto existente
                  </button>
                )}
              </div>

              {acao === 'atualizar' && (
                <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={projetoSel} onChange={e => setProjetoSel(e.target.value)} style={{ flex: 1, minWidth: 220 }}>
                    <option value="">Selecione o projeto...</option>
                    {projetos.map(p => <option key={p.id} value={p.id}>{p.os} — {p.nome}</option>)}
                  </select>
                  <button
                    className="btn-login"
                    style={{ width: 'auto', padding: '10px 20px', margin: 0 }}
                    disabled={!projetoSel || salvando}
                    onClick={handleAtualizar}
                  >
                    {salvando ? 'Salvando...' : 'Confirmar atualização'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" style={{ color: 'var(--ink)', border: '1px solid var(--line)' }} onClick={onBack}>
            ← Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

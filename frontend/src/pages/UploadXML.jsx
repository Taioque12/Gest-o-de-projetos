import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import ProjetoForm from '../components/ProjetoForm'

const GEMINI_KEY   = import.meta.env.VITE_GEMINI_API_KEY ?? ''
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL  ?? 'gemini-1.5-pro-latest'
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_URL   = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`

function buildDados(projeto, tarefas) {
  const hoje = new Date().toISOString().slice(0, 10)
  const diasRestantes = projeto.fim
    ? Math.round((new Date(projeto.fim) - new Date(hoje)) / 86400000)
    : null
  const diasTotais = projeto.inicio && projeto.fim
    ? Math.round((new Date(projeto.fim) - new Date(projeto.inicio)) / 86400000)
    : null
  const diasDecorridos = projeto.inicio
    ? Math.round((new Date(hoje) - new Date(projeto.inicio)) / 86400000)
    : null
  const avancoPrevistoProporcional = diasTotais && diasDecorridos
    ? Math.min(100, Math.round((diasDecorridos / diasTotais) * 100))
    : null
  const desvioTemporal = avancoPrevistoProporcional !== null
    ? (projeto.prev - avancoPrevistoProporcional).toFixed(1)
    : null
  const naoIniciadas  = tarefas.filter(t => t.previsto === 0)
  const emAndamento   = tarefas.filter(t => t.previsto > 0 && t.previsto < 100)
  const concluidas    = tarefas.filter(t => t.previsto === 100)
  const atrasadas     = tarefas.filter(t => t.fim && t.fim < hoje && t.previsto < 100)
  const linhasTarefas = tarefas.slice(0, 60).map(t => {
    const status = t.previsto === 100 ? '✓' : t.fim && t.fim < hoje && t.previsto < 100 ? '⚠ ATRASADA' : t.previsto > 0 ? '▶' : '○'
    return `  ${status} ${t.nome}: ${t.previsto}% | ${t.inicio} → ${t.fim}`
  }).join('\n')
  return { hoje, diasRestantes, diasTotais, diasDecorridos, avancoPrevistoProporcional, desvioTemporal, naoIniciadas, emAndamento, concluidas, atrasadas, linhasTarefas }
}

function buildPromptParte1(projeto, tarefas) {
  const { hoje, diasRestantes, diasTotais, diasDecorridos, avancoPrevistoProporcional, desvioTemporal, naoIniciadas, emAndamento, concluidas, atrasadas, linhasTarefas } = buildDados(projeto, tarefas)

  return `Você é um engenheiro sênior de planejamento e controle de projetos (PCP), especialista em engenharia elétrica industrial. Analise RAPIDAMENTE (conciso mas completo) o cronograma do projeto. Baseie-se APENAS nos dados fornecidos — não invente.

DADOS DO PROJETO
Nome: ${projeto.nome || '(não informado)'}
Data de término: ${projeto.fim || '(não informada)'}
Avanço atual: ${projeto.prev}% | Esperado: ${avancoPrevistoProporcional ?? 'N/D'}% | Desvio: ${desvioTemporal ?? 'N/D'} p.p.
Tarefas: ${concluidas.length} concluídas, ${emAndamento.length} em andamento, ${atrasadas.length} atrasadas

CRONOGRAMA
${linhasTarefas}
${tarefas.length > 60 ? `(+ ${tarefas.length - 60} tarefas não listadas)` : ''}

INSTRUÇÕES — PARTE 1 (DIAGNÓSTICO RÁPIDO)

### 🔴🟡🟢 Veredito Executivo
Uma frase: (CRÍTICO / ATENÇÃO / CONTROLADO) + desvio + risco ao prazo.

### 📐 EVM Essencial
- SPI (avanço real ÷ esperado): estime
- Dias de atraso estimados se ritmo mantido
- Data de término estimada

### ⚠️ Tarefas Críticas (máx 5)
Para cada uma: nome, status, impacto em dias, causa provável

### 🔧 Disciplinas em Risco
Quais disciplinas (elétrica, automação, etc) estão comprometendo o prazo?

### 📊 Painel de Indicadores
| Indicador | Valor | Status |
| Avanço atual | ${projeto.prev}% | - |
| SPI estimado | (calcule) | - |
| Tarefas atrasadas | ${atrasadas.length}/${tarefas.length} | - |
| Risco ao prazo | Baixo/Médio/Alto/Crítico | - |

Complete com 🟢 / 🟡 / 🔴

IMPORTANTE: Seja técnico, direto e baseado nos dados. Cite nomes reais de tarefas.`
}

function buildPromptParte2(projeto, tarefas) {
  const { hoje, diasRestantes, diasTotais, diasDecorridos, avancoPrevistoProporcional, desvioTemporal, naoIniciadas, emAndamento, concluidas, atrasadas, linhasTarefas } = buildDados(projeto, tarefas)

  return `Você é um engenheiro sênior PCP em engenharia elétrica industrial. PARTE 2 — PLANO DE AÇÃO DETALHADO baseado no cronograma a seguir.

DADOS RESUMIDOS
Nome: ${projeto.nome || '(não informado)'}
Avanço: ${projeto.prev}% (esperado: ${avancoPrevistoProporcional ?? 'N/D'}% | desvio: ${desvioTemporal ?? 'N/D'} p.p.)
Prazo: ${projeto.fim || '(não informado)'} (${diasRestantes} dias restantes)
Tarefas: ${concluidas.length}✓ / ${emAndamento.length}▶ / ${atrasadas.length}⚠

CRONOGRAMA
${linhasTarefas}

INSTRUÇÕES — PARTE 2 (PLANO DE AÇÃO)

### 🚀 Top 3 Ações Imediatas (Esta Semana)
As 3 ações de maior impacto para HOJE/ESTA SEMANA. Para cada uma:
- **Ação**: objetivo específico (1–2 linhas)
- **Quem**: Gestor / Eng. Campo / Equipe / Escritório
- **Como**: 3–5 passos concretos
- **Meta**: resultado mensurável (ex: ganho de 5% em avanço)

### 🎯 Plano de Ação Corretivo (6–10 ações)
Priorizadas por impacto. Estrutura:
1. **Prioridade**: 🔴 Alta / 🟡 Média / 🟢 Baixa
2. **Ação**: específica, cite tarefas reais do cronograma
3. **Responsável**: Gestor / Eng. / Equipe / Escritório
4. **Prazo**: Imediato / Curto (este mês) / Médio (próximo mês)
5. **Esforço**: Baixo / Médio / Alto
6. **Impacto**: % avanço ou dias recuperados
7. **Indicador de sucesso**: métrica para validar (ex: ✓ Tarefa X em 80%)

### 📅 Cronograma de Recuperação (Se Atrasado)
Próximas 4 semanas — foco e meta de avanço semanal para voltar ao trilho.

### 💡 Recomendações Estratégicas (Médio/Longo Prazo)
2–3 dicas para melhorar gestão de cronograma em projetos similares.

IMPORTANTE: Seja técnico, direto e acionável. Cada ação deve ter responsável, prazo e métrica de sucesso.`
}

export default function UploadXML({ onBack, onCriado, projetos = [], criarProjeto, editarProjeto, user }) {
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
        enviado_por:   user?.email ?? null,
      }).then(() => {}).catch(() => {})

      setResultado({ ok: true, tarefas, nome: file.name, projeto })
    } catch (err) {
      setResultado({ ok: false, erro: err.message })
    }
    setLoading(false)
  }

  async function chamarGemini(prompt, maxTokens = 6000) {
    const resp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
      }),
    })
    if (!resp.ok) {
      const err = await resp.json()
      throw new Error(err.error?.message ?? `Erro ${resp.status}`)
    }
    const data = await resp.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta.'
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
      // Parte 1: diagnóstico rápido (renderiza logo)
      const prompt1 = buildPromptParte1(resultado.projeto, resultado.tarefas)
      const texto1 = await chamarGemini(prompt1, 5000)
      setAnalise(texto1)

      // Parte 2: plano de ação detalhado (concatena depois)
      const prompt2 = buildPromptParte2(resultado.projeto, resultado.tarefas)
      const texto2 = await chamarGemini(prompt2, 7000)
      setAnalise(texto1 + '\n\n' + texto2)
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
      }, 'xml')
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

  function inline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    if (parts.length === 1) return text
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p
    )
  }

  function renderAnalise(texto) {
    return texto.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h4 key={i} className="ia-heading">{inline(line.slice(4))}</h4>
      if (line.startsWith('## '))  return <h3 key={i} className="ia-heading">{inline(line.slice(3))}</h3>
      if (line.startsWith('- '))   return <li key={i} className="ia-item">{inline(line.slice(2))}</li>
      if (line.match(/^\d+\. /))   return <li key={i} className="ia-item">{inline(line.replace(/^\d+\. /, ''))}</li>
      if (line.startsWith('|'))    return null
      if (line.trim() === '' || line.startsWith('---') || line.startsWith('===')) return <br key={i} />
      return <p key={i} className="ia-p">{inline(line)}</p>
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
                <span>🤖 Análise de IA — Gemini 2.5 Flash</span>
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

import { useRef, useState } from 'react'
import { renderMarkdownLite } from '../../utils/markdownLite'
import { baixarPdfDeElemento } from '../../utils/pdfMarkdown'
import { useAnaliseIAHistorico } from '../../hooks/useAnaliseIAHistorico'

function nomeArquivoAnalise(os, dataIso) {
  const data = dataIso ? new Date(dataIso).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  return `analise-ia-${os || 'projeto'}-${data}.pdf`
}

function ItemAnalise({ texto, os, dataIso, abertoInicial = false }) {
  const ref = useRef(null)
  const [aberto, setAberto] = useState(abertoInicial)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  async function baixar() {
    setGerando(true)
    setErro('')
    const estavaFechado = !aberto
    if (estavaFechado) setAberto(true)
    try {
      // Espera o layout expandir antes de capturar o elemento
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      await baixarPdfDeElemento(ref.current, nomeArquivoAnalise(os, dataIso))
    } catch (err) {
      setErro('Erro ao gerar PDF: ' + err.message)
    }
    if (estavaFechado) setAberto(false)
    setGerando(false)
  }

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
        <button
          onClick={() => setAberto(a => !a)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink)', padding: 0 }}
        >
          {aberto ? '▾' : '▸'} {dataIso ? new Date(dataIso).toLocaleString('pt-BR') : '—'}
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px', border: '1px solid var(--line)' }} onClick={baixar} disabled={gerando}>
          {gerando ? '⏳ Gerando...' : '⬇️ PDF'}
        </button>
      </div>
      {erro && <div style={{ color: 'var(--vermelho)', fontSize: 12, padding: '0 14px 8px' }}>{erro}</div>}
      <div
        ref={ref}
        className="ia-resultado"
        style={{ padding: aberto ? '0 14px 14px' : '0 14px', maxHeight: aberto ? 'none' : 0, overflow: 'hidden' }}
      >
        {renderMarkdownLite(texto)}
      </div>
    </div>
  )
}

export default function AbaAnaliseIA({ p }) {
  const { historico, loading } = useAnaliseIAHistorico(p.id)

  if (!p.ultimaAnaliseIA) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
        <p>Nenhuma análise de IA gerada ainda para este projeto.</p>
        <p style={{ fontSize: 12, marginTop: 6 }}>Importe um XML do MS Project e use "Analisar cronograma" para gerar — fica salva aqui automaticamente.</p>
      </div>
    )
  }

  // O histórico já inclui a análise mais recente (gravada junto com o cache
  // do projeto) — exclui pra não duplicar com o bloco principal abaixo.
  const anteriores = historico.slice(1)

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 14 }}>
        Gerada durante o último import de XML, em {p.analiseIAEm ? new Date(p.analiseIAEm).toLocaleString('pt-BR') : '—'}.
        Para reanalisar com o cronograma atualizado, importe o XML novamente.
      </div>

      <ItemAnalise texto={p.ultimaAnaliseIA} os={p.os} dataIso={p.analiseIAEm} abertoInicial />

      {anteriores.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Histórico de análises anteriores
          </div>
          {anteriores.map(h => (
            <ItemAnalise key={h.id} texto={h.texto} os={p.os} dataIso={h.criada_em} />
          ))}
        </div>
      )}
      {loading && historico.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Carregando histórico...</div>}
    </div>
  )
}

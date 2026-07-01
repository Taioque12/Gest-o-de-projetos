import { renderMarkdownLite } from '../../utils/markdownLite'

export default function AbaAnaliseIA({ p }) {
  if (!p.ultimaAnaliseIA) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
        <p>Nenhuma análise de IA gerada ainda para este projeto.</p>
        <p style={{ fontSize: 12, marginTop: 6 }}>Importe um XML do MS Project e use "Analisar cronograma" para gerar — fica salva aqui automaticamente.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 14 }}>
        Gerada durante o último import de XML, em {p.analiseIAEm ? new Date(p.analiseIAEm).toLocaleString('pt-BR') : '—'}.
        Para reanalisar com o cronograma atualizado, importe o XML novamente.
      </div>
      <div className="ia-resultado">
        {renderMarkdownLite(p.ultimaAnaliseIA)}
      </div>
    </div>
  )
}

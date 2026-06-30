// Renderer mínimo de markdown pra texto gerado pela IA (Gemini): negrito, headings,
// listas e parágrafos. Não é um parser completo — só o suficiente pro formato dos prompts.

export function inlineMd(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  if (parts.length === 1) return text
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p
  )
}

export function renderMarkdownLite(texto) {
  return texto.split('\n').map((line, i) => {
    if (line.startsWith('### ')) return <h4 key={i} className="ia-heading">{inlineMd(line.slice(4))}</h4>
    if (line.startsWith('## '))  return <h3 key={i} className="ia-heading">{inlineMd(line.slice(3))}</h3>
    if (line.startsWith('- '))   return <li key={i} className="ia-item">{inlineMd(line.slice(2))}</li>
    if (line.match(/^\d+\. /))   return <li key={i} className="ia-item">{inlineMd(line.replace(/^\d+\. /, ''))}</li>
    if (line.startsWith('|'))    return null
    if (line.trim() === '' || line.startsWith('---') || line.startsWith('===')) return <br key={i} />
    return <p key={i} className="ia-p">{inlineMd(line)}</p>
  })
}

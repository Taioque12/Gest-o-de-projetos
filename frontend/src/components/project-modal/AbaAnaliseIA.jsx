import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import { renderMarkdownLite } from '../../utils/markdownLite'

export default function AbaAnaliseIA({ p }) {
  const [messages, setMessages] = useState([
    { role: 'model', text: `Olá! Sou o assistente de IA da obra **${p.nome}** (OS ${p.os}). Como posso ajudar?` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const newMsgs = [...messages, { role: 'user', text: input }]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('chat-projeto', {
        body: { projeto_id: p.id, messages: newMsgs.filter(m => m.role === 'user' || m.role === 'model') }
      })

      if (error) throw error

      setMessages([...newMsgs, { role: 'model', text: data.reply }])
    } catch (err) {
      console.error(err)
      setMessages([...newMsgs, { role: 'model', text: '⚠️ Erro ao comunicar com a IA. Tente novamente.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      
      {/* Botão de Histórico Estático (Opcional) */}
      {p.ultimaAnaliseIA && (
        <div style={{ padding: '8px 16px', background: 'var(--brand-light)', borderBottom: '1px solid var(--line)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--brand-3)', fontWeight: 600 }}>Dica: A IA sabe que a obra está com {p.real}% de avanço (previsto {p.prev}%).</span>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--surface-solid)' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            background: msg.role === 'user' ? 'var(--brand)' : 'var(--surface-2)',
            color: msg.role === 'user' ? '#fff' : 'var(--ink)',
            padding: '12px 16px',
            borderRadius: 16,
            borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
            borderBottomLeftRadius: msg.role === 'model' ? 4 : 16,
            boxShadow: 'var(--elev-1)',
            fontSize: 14
          }}>
            <div className={msg.role === 'model' ? 'ia-resultado' : ''} style={{ margin: 0, padding: 0 }}>
               {msg.role === 'model' ? renderMarkdownLite(msg.text) : msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 16, borderBottomLeftRadius: 4, color: 'var(--ink-2)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="ia-spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Pensando...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', padding: 12, background: 'var(--surface-2)', borderTop: '1px solid var(--line)', gap: 8 }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Pergunte sobre o cronograma, atrasos, ou gere um e-mail..."
          style={{ flex: 1, padding: '12px 16px', borderRadius: 24, border: '1px solid var(--line)', background: 'var(--surface-solid)', color: 'var(--ink)' }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{ background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 24, padding: '0 20px', fontWeight: 600, cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1 }}>
          Enviar
        </button>
      </form>

    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function AbaSuprimentos({ projetoId, podeEditar }) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [novoItem, setNovoItem] = useState({ item: '', quantidade: 1, unidade: 'un', valor_estimado: 0, status: 'Solicitado', data_necessidade: '' })
  const [enviando, setEnviando] = useState(false)
  const [processandoOCR, setProcessandoOCR] = useState(false)

  useEffect(() => {
    fetchItens()
  }, [projetoId])

  async function fetchItens() {
    setLoading(true)
    const { data, error } = await supabase
      .from('suprimentos')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('criado_em', { ascending: false })
    
    if (!error && data) setItens(data)
    setLoading(false)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    if (!podeEditar) return
    setEnviando(true)
    const { data, error } = await supabase
      .from('suprimentos')
      .insert({ projeto_id: projetoId, ...novoItem })
      .select()
      .single()

    if (!error && data) {
      setItens([data, ...itens])
      setNovoItem({ item: '', quantidade: 1, unidade: 'un', valor_estimado: 0, status: 'Solicitado', data_necessidade: '' })
    }
    setEnviando(false)
  }

  async function handleOCR(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB.")
      return
    }

    setProcessandoOCR(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        const base64 = reader.result
        
        const { data, error } = await supabase.functions.invoke('ocr-ai', {
          body: { imageBase64: base64, mimeType: file.type }
        })

        if (error) throw error
        if (data && data.length > 0) {
          // Preenchemos o form com o primeiro item para facilitar, ou podemos 
          // salvar todos no banco em massa. Para manter simples a UI, vamos 
          // inserir todos diretamente no banco de dados.
          let inserted = []
          for (let item of data) {
            const { data: ret } = await supabase.from('suprimentos').insert({ 
              projeto_id: projetoId,
              item: item.item,
              quantidade: item.quantidade || 1,
              unidade: item.unidade || 'un',
              valor_estimado: item.valor_estimado || 0,
              status: 'Solicitado'
            }).select().single()
            if (ret) inserted.push(ret)
          }
          setItens(prev => [...inserted, ...prev])
          alert(`✅ ${inserted.length} itens extraídos e adicionados com sucesso!`)
        } else {
          alert("Nenhum item encontrado na nota.")
        }
        setProcessandoOCR(false)
      }
    } catch (err) {
      console.error(err)
      alert("Erro ao ler nota fiscal: " + err.message)
      setProcessandoOCR(false)
    }
  }

  async function updateStatus(id, novoStatus) {
    if (!podeEditar) return
    const { error } = await supabase.from('suprimentos').update({ status: novoStatus }).eq('id', id)
    if (!error) {
      setItens(itens.map(i => i.id === id ? { ...i, status: novoStatus } : i))
    }
  }

  async function excluirItem(id) {
    if (!window.confirm("Excluir este pedido?")) return
    const { error } = await supabase.from('suprimentos').delete().eq('id', id)
    if (!error) setItens(itens.filter(i => i.id !== id))
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Solicitado': return 'var(--ink-2)'
      case 'Aprovado': return 'var(--laranja)'
      case 'Comprado': return 'var(--brand)'
      case 'Entregue': return 'var(--verde)'
      default: return 'var(--ink)'
    }
  }

  const totalEstimado = itens.reduce((acc, i) => acc + Number(i.valor_estimado || 0), 0)

  if (loading) return <div style={{ padding: 20 }}>Carregando Suprimentos...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '16px', background: 'var(--surface-2)', borderRadius: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ink)' }}>Total RM (Requisição de Materiais)</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Impacto no custo financeiro da obra.</p>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)' }}>
          R$ {totalEstimado.toLocaleString('pt-BR')}
        </div>
      </div>

      {podeEditar && (
        <form onSubmit={handleSalvar} style={{ background: 'var(--surface-solid)', padding: 20, borderRadius: 12, marginBottom: 24, border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, margin: 0 }}>Nova Requisição</h4>
            
            <label style={{ 
              background: 'var(--brand)', color: '#fff', padding: '6px 12px', borderRadius: 8, 
              cursor: processandoOCR ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: processandoOCR ? 0.7 : 1 
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m20 17-1.89-1.89c-.51-.51-1.37-.51-1.89 0L14 17"/></svg>
              {processandoOCR ? 'Lendo Nota...' : 'Ler Nota Fiscal (IA)'}
              <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleOCR} disabled={processandoOCR} />
            </label>
          </div>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Material / Equipamento</label>
              <input type="text" required value={novoItem.item} onChange={e => setNovoItem({...novoItem, item: e.target.value})} placeholder="Cabo de cobre 95mm" />
            </div>
            <div className="field">
              <label>Quantidade</label>
              <input type="number" step="0.1" required value={novoItem.quantidade} onChange={e => setNovoItem({...novoItem, quantidade: e.target.value})} />
            </div>
            <div className="field">
              <label>Unidade</label>
              <select value={novoItem.unidade} onChange={e => setNovoItem({...novoItem, unidade: e.target.value})}>
                <option value="un">Unidade (un)</option>
                <option value="m">Metros (m)</option>
                <option value="kg">Quilos (kg)</option>
                <option value="cj">Conjunto (cj)</option>
              </select>
            </div>
            <div className="field">
              <label>Valor Estimado (R$)</label>
              <input type="number" step="0.01" required value={novoItem.valor_estimado} onChange={e => setNovoItem({...novoItem, valor_estimado: e.target.value})} />
            </div>
            <div className="field">
              <label>Para quando?</label>
              <input type="date" value={novoItem.data_necessidade} onChange={e => setNovoItem({...novoItem, data_necessidade: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={enviando}>+ Adicionar Pedido</button>
        </form>
      )}

      <div>
        <h4 style={{ fontSize: 14, marginBottom: 16, color: 'var(--ink-2)', textTransform: 'uppercase' }}>Fila de Pedidos</h4>
        {itens.length === 0 ? <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Nenhum material solicitado.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {itens.map(i => (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{i.item}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                    Qtd: {i.quantidade} {i.unidade} · R$ {Number(i.valor_estimado).toLocaleString('pt-BR')} · Precisa em: {i.data_necessidade ? new Date(i.data_necessidade).toLocaleDateString('pt-BR') : 'N/A'}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <select 
                    value={i.status} 
                    onChange={e => updateStatus(i.id, e.target.value)}
                    disabled={!podeEditar}
                    style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${getStatusColor(i.status)}`, color: getStatusColor(i.status), background: 'transparent', fontWeight: 600, fontSize: 12 }}
                  >
                    <option value="Solicitado">Solicitado</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Comprado">Comprado</option>
                    <option value="Entregue">Entregue</option>
                  </select>
                  {podeEditar && (
                    <button onClick={() => excluirItem(i.id)} className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--vermelho)' }}>Excluir</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

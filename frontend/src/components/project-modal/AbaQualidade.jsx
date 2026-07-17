import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function AbaQualidade({ projetoId, podeEditar }) {
  const [fvsList, setFvsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [novoFvs, setNovoFvs] = useState({ servico: '', status: 'Aprovado', observacoes: '', data_inspecao: new Date().toISOString().split('T')[0] })
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    fetchFvs()
  }, [projetoId])

  async function fetchFvs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('fvs')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('data_inspecao', { ascending: false })
    
    if (!error && data) setFvsList(data)
    setLoading(false)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    if (!podeEditar) return
    setEnviando(true)
    const { data, error } = await supabase
      .from('fvs')
      .insert({ projeto_id: projetoId, ...novoFvs })
      .select()
      .single()

    if (!error && data) {
      setFvsList([data, ...fvsList])
      setNovoFvs({ ...novoFvs, servico: '', observacoes: '' })
    }
    setEnviando(false)
  }

  async function excluirFvs(id) {
    if (!window.confirm("Excluir este registro de qualidade?")) return
    const { error } = await supabase.from('fvs').delete().eq('id', id)
    if (!error) setFvsList(fvsList.filter(i => i.id !== id))
  }

  if (loading) return <div style={{ padding: 20 }}>Carregando Checklists de Qualidade...</div>

  return (
    <div>
      {podeEditar && (
        <form onSubmit={handleSalvar} style={{ background: 'var(--surface-solid)', padding: 20, borderRadius: 12, marginBottom: 24, border: '1px solid var(--line)' }}>
          <h4 style={{ marginBottom: 16, fontSize: 14 }}>Nova Inspeção (FVS)</h4>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Serviço Inspecionado</label>
              <input type="text" required value={novoFvs.servico} onChange={e => setNovoFvs({...novoFvs, servico: e.target.value})} placeholder="Ex: Concretagem da base do trafo" />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={novoFvs.status} onChange={e => setNovoFvs({...novoFvs, status: e.target.value})}>
                <option value="Aprovado">✅ Aprovado</option>
                <option value="Aprovado c/ Ressalva">⚠️ Aprovado c/ Ressalva</option>
                <option value="Reprovado">❌ Reprovado</option>
              </select>
            </div>
            <div className="field">
              <label>Data Inspeção</label>
              <input type="date" required value={novoFvs.data_inspecao} onChange={e => setNovoFvs({...novoFvs, data_inspecao: e.target.value})} />
            </div>
          </div>
          <div className="field">
            <label>Observações</label>
            <textarea rows="2" value={novoFvs.observacoes} onChange={e => setNovoFvs({...novoFvs, observacoes: e.target.value})} placeholder="Detalhes do que foi reprovado ou ressalvas..."></textarea>
          </div>
          <button type="submit" className="btn btn-primary" disabled={enviando}>Registrar Inspeção</button>
        </form>
      )}

      <div>
        <h4 style={{ fontSize: 14, marginBottom: 16, color: 'var(--ink-2)', textTransform: 'uppercase' }}>Histórico de Inspeções</h4>
        {fvsList.length === 0 ? <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma inspeção registrada.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fvsList.map(fvs => (
              <div key={fvs.id} style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{fvs.servico}</strong>
                    <span className={`pill ${fvs.status === 'Reprovado' ? 'vermelho' : (fvs.status === 'Aprovado c/ Ressalva' ? 'amarelo' : 'verde')}`} style={{ marginLeft: 12 }}>
                      {fvs.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{new Date(fvs.data_inspecao).toLocaleDateString('pt-BR')}</span>
                    {podeEditar && (
                      <button onClick={() => excluirFvs(fvs.id)} className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--vermelho)' }}>Excluir</button>
                    )}
                  </div>
                </div>
                {fvs.observacoes && (
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', background: 'var(--surface-2)', padding: 10, borderRadius: 8 }}>
                    <strong>Obs:</strong> {fvs.observacoes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

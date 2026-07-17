import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function AbaRDO({ projetoId, podeEditar }) {
  const [rdos, setRdos] = useState([])
  const [loading, setLoading] = useState(true)
  const [novoRdo, setNovoRdo] = useState({
    data_rdo: new Date().toISOString().split('T')[0],
    clima: 'Bom',
    efetivo_presente: 0,
    ocorrencias: ''
  })
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    fetchRdos()
  }, [projetoId])

  async function fetchRdos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rdo')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('data_rdo', { ascending: false })
    
    if (!error && data) {
      setRdos(data)
    }
    setLoading(false)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    if (!podeEditar) return
    setEnviando(true)
    const { data, error } = await supabase
      .from('rdo')
      .insert({
        projeto_id: projetoId,
        ...novoRdo
      })
      .select()
      .single()

    if (!error && data) {
      setRdos([data, ...rdos])
      setNovoRdo({ ...novoRdo, ocorrencias: '', efetivo_presente: 0 })
    } else {
      console.error(error)
      alert("Erro ao salvar RDO")
    }
    setEnviando(false)
  }

  async function excluirRdo(id) {
    if (!window.confirm("Excluir este Diário de Obra?")) return
    const { error } = await supabase.from('rdo').delete().eq('id', id)
    if (!error) {
      setRdos(rdos.filter(r => r.id !== id))
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Carregando RDOs...</div>

  return (
    <div>
      {podeEditar && (
        <form onSubmit={handleSalvar} style={{ background: 'var(--surface-2)', padding: 20, borderRadius: 12, marginBottom: 24, border: '1px solid var(--line)' }}>
          <h3 style={{ marginBottom: 16, fontSize: 16, color: 'var(--ink)' }}>Registrar RDO</h3>
          
          <div className="form-grid">
            <div className="field">
              <label>Data</label>
              <input type="date" required value={novoRdo.data_rdo} onChange={e => setNovoRdo({...novoRdo, data_rdo: e.target.value})} />
            </div>
            <div className="field">
              <label>Clima</label>
              <select value={novoRdo.clima} onChange={e => setNovoRdo({...novoRdo, clima: e.target.value})}>
                <option value="Bom">Bom (Praticável)</option>
                <option value="Chuva">Chuva (Praticável)</option>
                <option value="Impraticável">Impraticável (Paralisado)</option>
              </select>
            </div>
            <div className="field">
              <label>Efetivo Presente (Qtd)</label>
              <input type="number" min="0" required value={novoRdo.efetivo_presente} onChange={e => setNovoRdo({...novoRdo, efetivo_presente: e.target.value})} />
            </div>
          </div>
          <div className="field">
            <label>Ocorrências / Observações</label>
            <textarea rows="3" placeholder="Faltas, acidentes, chegada de materiais..." value={novoRdo.ocorrencias} onChange={e => setNovoRdo({...novoRdo, ocorrencias: e.target.value})}></textarea>
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Salvando...' : 'Salvar Diário de Obra'}
          </button>
        </form>
      )}

      <div>
        <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--ink-2)', textTransform: 'uppercase' }}>Histórico de RDOs</h3>
        {rdos.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Nenhum diário registrado.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rdos.map(rdo => (
              <div key={rdo.id} style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{new Date(rdo.data_rdo).toLocaleDateString('pt-BR')}</strong>
                    <span className={`pill ${rdo.clima === 'Impraticável' ? 'vermelho' : (rdo.clima === 'Chuva' ? 'amarelo' : 'verde')}`} style={{ marginLeft: 12 }}>
                      {rdo.clima}
                    </span>
                  </div>
                  {podeEditar && (
                    <button onClick={() => excluirRdo(rdo.id)} className="btn btn-ghost" style={{ padding: '4px 8px' }}>Excluir</button>
                  )}
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                  <strong>Efetivo:</strong> {rdo.efetivo_presente} pessoas
                </div>
                {rdo.ocorrencias && (
                  <div style={{ fontSize: 14, marginTop: 8, background: 'var(--surface-page)', padding: 10, borderRadius: 8 }}>
                    <strong>Ocorrências:</strong> <br/>
                    {rdo.ocorrencias}
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

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
  const [gravando, setGravando] = useState(false)
  const [processandoVoz, setProcessandoVoz] = useState(false)

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

  function iniciarGravacaoIA() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta gravação de voz. Tente usar o Google Chrome.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setGravando(true)
    }

    recognition.onresult = async (event) => {
      setGravando(false)
      const transcript = event.results[0][0].transcript
      
      setProcessandoVoz(true)
      try {
        const { data, error } = await supabase.functions.invoke('rdo-ai', {
          body: { textoTranscrevido: transcript }
        })

        if (!error && data) {
          setNovoRdo(prev => ({
            ...prev,
            clima: data.clima || prev.clima,
            efetivo_presente: data.efetivo !== undefined ? data.efetivo : prev.efetivo_presente,
            ocorrencias: (prev.ocorrencias ? prev.ocorrencias + '\n' : '') + (data.ocorrencias || transcript)
          }))
        }
      } catch (err) {
        console.error("Erro IA Voz", err)
      }
      setProcessandoVoz(false)
    }

    recognition.onerror = (e) => {
      console.error(e)
      setGravando(false)
      setProcessandoVoz(false)
    }

    recognition.start()
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, color: 'var(--ink)', margin: 0 }}>Registrar RDO</h3>
            <button 
              type="button" 
              onClick={iniciarGravacaoIA}
              disabled={gravando || processandoVoz}
              style={{ 
                background: gravando ? 'var(--vermelho)' : 'var(--brand)', 
                color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, 
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}>
              {gravando ? 'Ouvindo...' : processandoVoz ? 'Pensando...' : 'Preencher com Voz (IA)'}
            </button>
          </div>
          
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

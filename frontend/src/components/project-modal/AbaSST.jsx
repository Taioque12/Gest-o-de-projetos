import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function AbaSST({ projetoId, podeEditar }) {
  const [ddss, setDdss] = useState([])
  const [loading, setLoading] = useState(true)
  const [novoDDS, setNovoDDS] = useState({
    data_dds: new Date().toISOString().split('T')[0],
    tema: '',
    tecnico_responsavel: '',
    participantes: 0,
    observacoes: ''
  })
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    fetchDDS()
  }, [projetoId])

  async function fetchDDS() {
    const { data, error } = await supabase
      .from('sst_dds')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('data_dds', { ascending: false })

    if (!error && data) {
      setDdss(data)
    }
    setLoading(false)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    if (!podeEditar) return
    setEnviando(true)

    const { data, error } = await supabase.from('sst_dds').insert({
      projeto_id: projetoId,
      ...novoDDS
    }).select().single()

    if (!error && data) {
      setDdss([data, ...ddss])
      setNovoDDS({
        ...novoDDS,
        tema: '',
        participantes: 0,
        observacoes: ''
      })
    }
    setEnviando(false)
  }

  async function excluirDDS(id) {
    if (!podeEditar) return
    if (!window.confirm("Deseja realmente excluir este DDS?")) return

    const { error } = await supabase.from('sst_dds').delete().eq('id', id)
    if (!error) {
      setDdss(ddss.filter(d => d.id !== id))
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Carregando dados de Segurança...</div>

  return (
    <div>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: 24 }}>🛡️</span>
        <div>
          <h4 style={{ margin: 0, color: '#991b1b', fontSize: 14 }}>Atenção à Segurança do Trabalho</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d' }}>A equipe não deve iniciar nenhuma atividade sem o preenchimento do Diálogo Diário de Segurança (DDS).</p>
        </div>
      </div>

      {podeEditar && (
        <form onSubmit={handleSalvar} style={{ background: 'var(--surface-solid)', padding: 20, borderRadius: 12, marginBottom: 24, border: '1px solid var(--line)' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 14 }}>Novo Registro de DDS</h4>
          <div className="form-grid">
            <div className="field">
              <label>Data</label>
              <input type="date" value={novoDDS.data_dds} onChange={e => setNovoDDS({ ...novoDDS, data_dds: e.target.value })} required />
            </div>
            <div className="field">
              <label>Técnico Responsável</label>
              <input type="text" value={novoDDS.tecnico_responsavel} onChange={e => setNovoDDS({ ...novoDDS, tecnico_responsavel: e.target.value })} required placeholder="Ex: TST João" />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Tema do Diálogo (DDS)</label>
              <input type="text" value={novoDDS.tema} onChange={e => setNovoDDS({ ...novoDDS, tema: e.target.value })} required placeholder="Ex: Riscos de trabalho em altura e NR-35" />
            </div>
            <div className="field">
              <label>Qtd. Participantes</label>
              <input type="number" min="0" value={novoDDS.participantes} onChange={e => setNovoDDS({ ...novoDDS, participantes: parseInt(e.target.value) || 0 })} required />
            </div>
            <div className="field" style={{ gridColumn: 'span 3' }}>
              <label>Observações / Ocorrências Inseguras</label>
              <textarea rows="3" value={novoDDS.observacoes} onChange={e => setNovoDDS({ ...novoDDS, observacoes: e.target.value })} placeholder="Algum trabalhador sem EPI? Ferramenta defeituosa?"></textarea>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? 'Registrando...' : 'Gravar DDS'}
            </button>
          </div>
        </form>
      )}

      <h4 style={{ fontSize: 14, marginBottom: 16 }}>Histórico de Diálogos (DDS)</h4>
      {ddss.length === 0 ? (
        <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Nenhum DDS registrado neste projeto.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ddss.map(d => (
            <div key={d.id} style={{ background: 'var(--surface-solid)', padding: 16, borderRadius: 10, border: '1px solid var(--line)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{d.data_dds.split('-').reverse().join('/')} — {d.tema}</strong>
                {podeEditar && (
                  <button onClick={() => excluirDDS(d.id)} className="btn btn-ghost" style={{ padding: '2px 6px', color: 'var(--vermelho)' }}>Excluir</button>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>
                <strong>Resp:</strong> {d.tecnico_responsavel} | <strong>Equipe:</strong> {d.participantes} assinaturas
              </div>
              {d.observacoes && (
                <div style={{ fontSize: 13, background: 'var(--surface-2)', padding: 10, borderRadius: 8 }}>
                  {d.observacoes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

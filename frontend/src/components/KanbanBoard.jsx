import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function KanbanBoard({ projetoId }) {
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)
  const [novaTarefa, setNovaTarefa] = useState('')

  useEffect(() => {
    fetchTarefas()
  }, [projetoId])

  async function fetchTarefas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('criado_em', { ascending: true })
    if (!error && data) {
      setTarefas(data)
    }
    setLoading(false)
  }

  async function handleAddTarefa(e) {
    e.preventDefault()
    if (!novaTarefa.trim()) return
    const { data, error } = await supabase
      .from('tarefas')
      .insert({ projeto_id: projetoId, titulo: novaTarefa.trim(), status: 'A Fazer' })
      .select()
      .single()
    
    if (!error && data) {
      setTarefas([...tarefas, data])
      setNovaTarefa('')
    }
  }

  async function moverTarefa(tarefaId, novoStatus) {
    const { error } = await supabase
      .from('tarefas')
      .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
      .eq('id', tarefaId)
    
    if (!error) {
      setTarefas(tarefas.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t))
    }
  }

  async function excluirTarefa(tarefaId) {
    if (!window.confirm('Excluir tarefa?')) return
    const { error } = await supabase.from('tarefas').delete().eq('id', tarefaId)
    if (!error) {
      setTarefas(tarefas.filter(t => t.id !== tarefaId))
    }
  }

  const colunas = ['A Fazer', 'Fazendo', 'Feito']

  if (loading) return <div style={{ padding: 20 }}>Carregando Kanban...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 0' }}>
      <form onSubmit={handleAddTarefa} style={{ display: 'flex', gap: 8 }}>
        <input 
          type="text" 
          value={novaTarefa} 
          onChange={e => setNovaTarefa(e.target.value)} 
          placeholder="Nova tarefa..." 
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)' }}
        />
        <button type="submit" style={{ padding: '0 20px', background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
          Adicionar
        </button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {colunas.map(col => (
          <div key={col} style={{ background: 'var(--surface-solid)', padding: 16, borderRadius: 12, border: '1px solid var(--line)', minHeight: 400 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              {col}
              <span style={{ background: 'var(--line)', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                {tarefas.filter(t => t.status === col).length}
              </span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tarefas.filter(t => t.status === col).map(t => (
                <div key={t.id} style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid var(--line)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{t.titulo}</div>
                  
                  <div style={{ display: 'flex', gap: 4, marginTop: 12, justifyContent: 'flex-end' }}>
                    {col !== 'A Fazer' && (
                      <button onClick={() => moverTarefa(t.id, col === 'Feito' ? 'Fazendo' : 'A Fazer')} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--line)', background: '#fff', cursor: 'pointer' }}>
                        ← Voltar
                      </button>
                    )}
                    {col !== 'Feito' && (
                      <button onClick={() => moverTarefa(t.id, col === 'A Fazer' ? 'Fazendo' : 'Feito')} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer' }}>
                        Avançar →
                      </button>
                    )}
                    <button onClick={() => excluirTarefa(t.id)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', marginLeft: 'auto' }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

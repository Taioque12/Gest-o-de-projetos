import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function KanbanGlobal() {
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTarefas()
  }, [])

  async function fetchTarefas() {
    setLoading(true)
    // Usar inner join implícito para puxar o nome do projeto
    const { data, error } = await supabase
      .from('tarefas')
      .select('*, projetos(nome, os)')
      .order('criado_em', { ascending: false })
    
    if (!error && data) {
      setTarefas(data)
    }
    setLoading(false)
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

  const colunas = ['A Fazer', 'Fazendo', 'Feito']

  if (loading) return <div style={{ padding: 40, color: 'var(--ink)' }}>Carregando Kanban Global...</div>

  return (
    <div className="main-content" style={{ padding: 'clamp(16px,3vw,40px)' }}>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Kanban Global</h1>
          <span>Visão unificada de todas as tarefas da empresa</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 24 }}>
        {colunas.map(col => {
          const tasksCol = tarefas.filter(t => t.status === col)
          return (
            <div key={col} style={{ background: 'var(--surface)', backdropFilter: 'var(--glass-blur)', border: 'var(--glass-border)', padding: 20, borderRadius: 16, minHeight: '60vh', boxShadow: 'var(--elev-1), var(--glass-inset)' }}>
              <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                {col}
                <span style={{ background: 'var(--brand-light)', color: 'var(--brand)', padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>
                  {tasksCol.length}
                </span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tasksCol.map(t => (
                  <div key={t.id} style={{ background: 'var(--surface-solid)', padding: 16, borderRadius: 12, border: '1px solid var(--line)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{t.titulo}</div>
                    
                    {t.projetos && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ background: 'var(--line)', padding: '2px 6px', borderRadius: 4 }}>OS {t.projetos.os}</span>
                        <span className="text-truncate">{t.projetos.nome}</span>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                      {col !== 'A Fazer' && (
                        <button onClick={() => moverTarefa(t.id, col === 'Feito' ? 'Fazendo' : 'A Fazer')} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }}>
                          ← Voltar
                        </button>
                      )}
                      {col !== 'Feito' && (
                        <button onClick={() => moverTarefa(t.id, col === 'A Fazer' ? 'Fazendo' : 'Feito')} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 11 }}>
                          Avançar →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {tasksCol.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-3)', fontSize: 13 }}>
                    Nenhuma tarefa
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

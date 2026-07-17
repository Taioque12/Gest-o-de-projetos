import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import AbaRDO from '../components/project-modal/AbaRDO'
import AbaQualidade from '../components/project-modal/AbaQualidade'

export default function EmpreiteiroView({ user, onSignOut }) {
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [projetoAberto, setProjetoAberto] = useState(null)
  const [aba, setAba] = useState('Diário')

  useEffect(() => {
    async function load() {
      // O empreiteiro só vê projetos genéricos ou associados a ele, 
      // mas como simplificação, ele vê os projetos ativos.
      // Numa implementação real haveria uma tabela "projeto_empreiteiros"
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, status')
        .neq('status', 'concluido')
        
      if (!error && data) setProjetos(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Portal do Terceirizado</h2>
          <p style={{ color: 'var(--ink-2)', margin: 0 }}>Bem vindo, {user?.email}</p>
        </div>
        <button className="btn btn-ghost" onClick={onSignOut}>Sair</button>
      </div>

      {!projetoAberto ? (
        <div>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>Selecione a Obra</h3>
          {loading ? <p>Carregando...</p> : (
            <div style={{ display: 'grid', gap: 16 }}>
              {projetos.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setProjetoAberto(p)}
                  style={{ padding: 20, background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <strong style={{ fontSize: 16 }}>{p.nome}</strong>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Acessar &rarr;</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => setProjetoAberto(null)} className="btn btn-ghost" style={{ padding: '4px 8px' }}>&larr; Voltar</button>
            <h3 style={{ fontSize: 18, margin: 0 }}>{projetoAberto.nome}</h3>
          </div>

          <div className="tabs" style={{ marginBottom: 24 }}>
            {['Diário', 'Qualidade'].map(t => (
              <div 
                key={t} 
                className={`tab ${aba === t ? 'active' : ''}`}
                onClick={() => setAba(t)}
              >
                {t}
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
            {aba === 'Diário' && <AbaRDO projetoId={projetoAberto.id} podeEditar={true} />}
            {aba === 'Qualidade' && <AbaQualidade projetoId={projetoAberto.id} podeEditar={true} />}
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'

export default function ModalSugestaoIA({ projetos, loading, sugestoes, onAnalisar, onFechar }) {
  const [projetoId, setProjetoId] = useState('')

  const handleSugerir = () => {
    if (projetoId) onAnalisar(projetoId)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--surface)',
        width: 500, maxWidth: '90%', borderRadius: 16,
        border: '1px solid var(--line)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', background: 'var(--brand)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✨</span> Matchmaking por Inteligência Artificial
          </h2>
          <button onClick={onFechar} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold'
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Selecione o Projeto para Análise</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select 
                value={projetoId} 
                onChange={e => setProjetoId(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)' }}
              >
                <option value="">Selecione um projeto...</option>
                {projetos.map(p => (
                  <option key={p.id} value={p.id}>OS {p.os} - {p.nome}</option>
                ))}
              </select>
              <button 
                onClick={handleSugerir} 
                disabled={!projetoId || loading}
                style={{
                  padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--brand)', 
                  color: '#fff', fontWeight: 600, cursor: (!projetoId || loading) ? 'not-allowed' : 'pointer',
                  opacity: (!projetoId || loading) ? 0.6 : 1
                }}
              >
                {loading ? 'Analisando...' : 'Analisar'}
              </button>
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>A IA cruzará o escopo do projeto com o mapa de competências da sua equipe.</span>
          </div>

          {/* Resultado da Análise */}
          {sugestoes && !loading && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, background: 'rgba(37,99,235,0.08)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.2)' }}>
                <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700, marginBottom: 4 }}>Diagnóstico da IA</div>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                  Competência chave identificada: <strong>{sugestoes.habilidadePrincipalSugerida}</strong>
                </div>
              </div>

              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginTop: 8 }}>Top 5 Candidatos Sugeridos</div>
              
              {sugestoes.candidatos.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: 20 }}>Nenhum candidato com match alto (&gt;= 60%).</div>
              ) : (
                sugestoes.candidatos.map((cand, idx) => (
                  <div key={cand.funcionario.id} style={{ 
                    display: 'flex', gap: 12, padding: 12, borderRadius: 8, 
                    border: '1px solid var(--line)', background: 'var(--surface-2)',
                    alignItems: 'center'
                  }}>
                    <div style={{ 
                      width: 32, height: 32, borderRadius: '50%', background: 'var(--brand)', color: '#fff', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 
                    }}>
                      #{idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{cand.funcionario.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{cand.justificativa}</div>
                    </div>
                    <div style={{ 
                      display: 'flex', flexDirection: 'column', alignItems: 'center', 
                      background: cand.matchScore >= 80 ? 'rgba(15,122,61,0.1)' : 'rgba(202,138,4,0.1)',
                      padding: '4px 8px', borderRadius: 6, minWidth: 50
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: cand.matchScore >= 80 ? '#0f7a3d' : '#ca8a04' }}>{cand.matchScore}%</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: cand.matchScore >= 80 ? '#0f7a3d' : '#ca8a04', textTransform: 'uppercase' }}>Match</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

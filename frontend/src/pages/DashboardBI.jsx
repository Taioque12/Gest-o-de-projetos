import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import TopBar from '../components/TopBar'

export default function DashboardBI({ handleNovoProjeto, handleSignOut }) {
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase.from('projetos').select('*')
      if (!error && data) setProjetos(data)
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return <div style={{ padding: 40 }}>Carregando dados globais...</div>

  const totalOrcado = projetos.reduce((acc, p) => acc + Number(p.orcamento || 0), 0)
  const totalCustoRealizado = projetos.reduce((acc, p) => acc + Number(p.custo_realizado || 0), 0)
  const margem = totalOrcado - totalCustoRealizado

  const mediaAvancoFisico = projetos.length ? projetos.reduce((acc, p) => acc + Number(p.real || 0), 0) / projetos.length : 0
  const mediaAvancoPrev = projetos.length ? projetos.reduce((acc, p) => acc + Number(p.prev || 0), 0) / projetos.length : 0
  
  const cpiGlobal = totalCustoRealizado > 0 ? ((mediaAvancoFisico/100)*totalOrcado) / totalCustoRealizado : 0

  return (
    <div className="dashboard-content">
      <TopBar onNovoProjeto={handleNovoProjeto} onSignOut={handleSignOut} />
      
      <div style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 8, marginTop: 32 }}>Painel Executivo (Holding)</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 32 }}>Visão consolidada de todas as obras da construtora.</p>

        {/* KPIs Globais */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 40 }}>
          <div style={{ background: 'var(--surface-solid)', padding: 24, borderRadius: 16, border: '1px solid var(--line)', boxShadow: 'var(--elev-1)' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>VGV Total / Orçado</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--ink)' }}>R$ {(totalOrcado / 1000000).toFixed(1)}M</div>
          </div>
          
          <div style={{ background: 'var(--surface-solid)', padding: 24, borderRadius: 16, border: '1px solid var(--line)', boxShadow: 'var(--elev-1)' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Custo Realizado Total</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--laranja)' }}>R$ {(totalCustoRealizado / 1000000).toFixed(1)}M</div>
          </div>

          <div style={{ background: 'var(--surface-solid)', padding: 24, borderRadius: 16, border: '1px solid var(--line)', boxShadow: 'var(--elev-1)' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Margem Bruta (Pós Custo)</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: margem > 0 ? 'var(--verde)' : 'var(--vermelho)' }}>
              R$ {(margem / 1000000).toFixed(1)}M
            </div>
          </div>
        </div>

        {/* Desempenho Global */}
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Desempenho Corporativo</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          
          <div style={{ background: 'var(--surface-solid)', padding: 24, borderRadius: 16, border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Índice de Custo (CPI) Global</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: cpiGlobal >= 1 ? 'var(--verde)' : 'var(--vermelho)' }}>
                {cpiGlobal.toFixed(2)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                {cpiGlobal >= 1 
                  ? 'A carteira da construtora está gerando valor acima do custo orçado.' 
                  : 'Atenção: A carteira está gastando mais do que o avanço físico entrega.'}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface-solid)', padding: 24, borderRadius: 16, border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Avanço Físico Global (Média)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: mediaAvancoFisico >= mediaAvancoPrev ? 'var(--verde)' : 'var(--laranja)' }}>
                {mediaAvancoFisico.toFixed(1)}%
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                Contra {mediaAvancoPrev.toFixed(1)}% previsto no agregado.
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import Header from '../components/Header'
import Toast from '../components/Toast'
import { supabase } from '../supabase'

const PLANO_COR = { free: '#64748b', pro: '#2563eb', enterprise: '#7c3aed' }
const STATUS_PAGAMENTO_COR = { approved: '#16a34a', pending: '#d97706', rejected: '#dc2626', refunded: '#64748b' }

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function fmtMoeda(v) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Operador({ perfil, superAdmin, onSignOut, onChangeView }) {
  const [empresas, setEmpresas] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [resumo, setResumo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [toast, setToast] = useState('')
  const [salvandoId, setSalvandoId] = useState(null)
  const [filtro, setFiltro] = useState('todas')

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const { data, error } = await supabase.functions.invoke('operador-painel', { body: { action: 'listar' } })
      if (error) throw new Error(error.message ?? 'Erro ao carregar painel')
      if (data?.error) throw new Error(data.error)
      setEmpresas(data.empresas ?? [])
      setPagamentos(data.pagamentos ?? [])
      setResumo(data.resumo ?? null)
    } catch (err) {
      setErro(err.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function atualizarEmpresa(empresaId, dados) {
    setSalvandoId(empresaId)
    try {
      const { data, error } = await supabase.functions.invoke('operador-painel', {
        body: { action: 'atualizar_empresa', empresa_id: empresaId, dados },
      })
      if (error) throw new Error(error.message ?? 'Erro ao salvar')
      if (data?.error) throw new Error(data.error)
      setToast('Atualizado!')
      await carregar()
    } catch (err) {
      setErro('Erro ao atualizar: ' + err.message)
    }
    setSalvandoId(null)
  }

  const empresasFiltradas = empresas.filter(e => {
    if (filtro === 'ativas') return e.ativo
    if (filtro === 'inativas') return !e.ativo
    return true
  })

  if (loading) return <div className="loading-screen">Carregando painel do operador...</div>

  return (
    <>
      <Header perfil={perfil} superAdmin={superAdmin} onSignOut={onSignOut} onChangeView={onChangeView} view="operador" />

      <main className="wrap" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div style={{ marginBottom: 8 }}>
          <button className="btn btn-ghost" onClick={() => onChangeView('dashboard')}>← Voltar</button>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Painel do Operador</h2>
        <p style={{ color: 'var(--ink-2)', marginBottom: 20 }}>Visão geral de todas as empresas do SaaS — só você vê isso.</p>

        {erro && (
          <div style={{ background: 'var(--vermelho-bg)', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {erro}
          </div>
        )}

        {resumo && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Empresas ativas</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand)' }}>{resumo.empresas_ativas}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>de {resumo.total_empresas} cadastradas</div>
            </div>
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Free</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: PLANO_COR.free }}>{resumo.por_plano.free}</div>
            </div>
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Pro</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: PLANO_COR.pro }}>{resumo.por_plano.pro}</div>
            </div>
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Enterprise</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: PLANO_COR.enterprise }}>{resumo.por_plano.enterprise}</div>
            </div>
          </div>
        )}

        {/* Empresas */}
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-head">
            <h2><span className="ico">🏢</span> Empresas</h2>
            <div className="filters">
              {['todas', 'ativas', 'inativas'].map(f => (
                <button key={f} className={`chip${filtro === f ? ' active' : ''}`} onClick={() => setFiltro(f)}>
                  {f === 'todas' ? 'Todas' : f === 'ativas' ? 'Ativas' : 'Inativas'}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-body" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Empresa</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>CNPJ</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Plano</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Uso</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Cadastro</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '8px 10px' }}></th>
                </tr>
              </thead>
              <tbody>
                {empresasFiltradas.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600 }}>{e.nome_empresa}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.email_responsavel}</div>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--ink-2)' }}>{e.cnpj}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <select
                        value={e.plano}
                        disabled={salvandoId === e.id}
                        onChange={ev => atualizarEmpresa(e.id, { plano: ev.target.value })}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)', color: PLANO_COR[e.plano], fontWeight: 700, background: 'var(--surface)' }}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: 12, color: 'var(--ink-2)' }}>
                      {e.num_projetos}/{e.limite_projetos ?? '∞'} proj · {e.num_funcionarios}/{e.limite_funcionarios ?? '∞'} func · {e.num_usuarios} usr
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: 'var(--ink-2)' }}>{fmtData(e.data_criacao)}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: e.ativo ? 'var(--verde-bg)' : 'var(--vermelho-bg)',
                        color: e.ativo ? '#166534' : '#991b1b',
                      }}>
                        {e.ativo ? 'Ativa' : 'Suspensa'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '4px 10px', color: e.ativo ? '#dc2626' : '#16a34a', border: `1px solid ${e.ativo ? '#dc2626' : '#16a34a'}` }}
                        disabled={salvandoId === e.id}
                        onClick={() => atualizarEmpresa(e.id, { ativo: !e.ativo })}
                      >
                        {salvandoId === e.id ? '...' : e.ativo ? 'Suspender' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {empresasFiltradas.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)' }}>Nenhuma empresa encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagamentos recentes */}
        <div className="panel">
          <div className="panel-head">
            <h2><span className="ico">💳</span> Pagamentos Recentes</h2>
            <span className="hint">últimos {pagamentos.length}</span>
          </div>
          <div className="panel-body" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Empresa</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Plano</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Método</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Valor</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map(p => {
                  const empresa = empresas.find(e => e.id === p.empresa_id)
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{empresa?.nome_empresa ?? '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'center', textTransform: 'capitalize' }}>{p.plano ?? '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'center', textTransform: 'uppercase', fontSize: 11 }}>{p.metodo ?? '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{fmtMoeda(p.valor)}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_PAGAMENTO_COR[p.status] ?? 'var(--ink-2)' }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: 'var(--ink-2)' }}>{fmtData(p.pago_em ?? p.criado_em)}</td>
                    </tr>
                  )
                })}
                {pagamentos.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)' }}>Nenhum pagamento registrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {toast && <Toast mensagem={toast} onClose={() => setToast('')} />}
    </>
  )
}

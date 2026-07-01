import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Toast from '../components/Toast'
import { supabase } from '../supabase'

const PLANOS = [
  {
    id: 'free',
    nome: 'Free',
    preco: 0,
    destaque: false,
    limites: { projetos: 2, funcionarios: 5, habilidades: 5 },
    recursos: ['2 projetos', '5 funcionários', '5 habilidades', 'Suporte por e-mail'],
  },
  {
    id: 'pro',
    nome: 'Pro',
    preco: 497,
    destaque: true,
    limites: { projetos: 15, funcionarios: 30, habilidades: 20 },
    recursos: ['15 projetos', '30 funcionários', '20 habilidades', 'Curva S e baselines', 'Upload de XML', 'Suporte prioritário'],
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    preco: 1497,
    destaque: false,
    limites: { projetos: '∞', funcionarios: '∞', habilidades: '∞' },
    recursos: ['Projetos ilimitados', 'Funcionários ilimitados', 'Habilidades ilimitadas', 'Tudo do Pro', 'Suporte dedicado'],
  },
]

export default function Planos({ user, perfil, empresaId, empresa, onSignOut }) {
  const navigate = useNavigate()
  const planoAtual = empresa?.plano ?? 'free'
  const [carregando, setCarregando] = useState(null) // `${planoId}-${metodo}`
  const [toast, setToast] = useState('')
  const [erro, setErro] = useState('')

  async function assinar(planoId, metodo) {
    setErro('')
    setCarregando(`${planoId}-${metodo}`)
    try {
      const { data, error } = await supabase.functions.invoke('mp-criar-assinatura', {
        body: { plano: planoId, metodo },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.url) throw new Error('Não foi possível gerar o checkout')
      // Redireciona pro checkout do Mercado Pago
      window.location.href = data.url
    } catch (err) {
      setErro(`Erro ao iniciar pagamento: ${err.message}`)
      setCarregando(null)
    }
  }

  return (
    <>
      <Header perfil={perfil} onSignOut={onSignOut} />
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      <main className="container" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 8 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Voltar</button>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Planos e Assinatura</h2>
        <p style={{ color: 'var(--ink-2)', marginBottom: 8 }}>
          Plano atual: <b style={{ textTransform: 'capitalize', color: 'var(--brand, #2563eb)' }}>{planoAtual}</b>
        </p>

        {erro && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {erro}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 16 }}>
          {PLANOS.map(p => {
            const ehAtual = p.id === planoAtual
            return (
              <div key={p.id} style={{
                border: p.destaque ? '2px solid var(--brand, #2563eb)' : '1px solid var(--line)',
                borderRadius: 14,
                padding: 24,
                background: 'var(--surface)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {p.destaque && (
                  <span style={{ position: 'absolute', top: -11, left: 24, background: 'var(--brand, #2563eb)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                    MAIS POPULAR
                  </span>
                )}

                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{p.nome}</h3>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--ink)' }}>
                    {p.preco === 0 ? 'Grátis' : `R$ ${p.preco}`}
                  </span>
                  {p.preco > 0 && <span style={{ color: 'var(--ink-2)', fontSize: 14 }}>/mês</span>}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', flex: 1 }}>
                  {p.recursos.map(r => (
                    <li key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {r}
                    </li>
                  ))}
                </ul>

                {ehAtual ? (
                  <div style={{ textAlign: 'center', padding: '10px', borderRadius: 8, background: 'var(--surface-2, #f1f5f9)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600 }}>
                    ✓ Seu plano atual
                  </div>
                ) : p.id === 'free' ? (
                  <div style={{ textAlign: 'center', padding: '10px', fontSize: 13, color: 'var(--ink-2)' }}>
                    Plano gratuito
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      className="btn btn-primary"
                      disabled={!!carregando}
                      onClick={() => assinar(p.id, 'cartao')}
                      style={{ justifyContent: 'center', padding: '10px', fontWeight: 600 }}
                    >
                      {carregando === `${p.id}-cartao` ? 'Abrindo...' : '💳 Assinar com Cartão'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      disabled={!!carregando}
                      onClick={() => assinar(p.id, 'pix')}
                      style={{ justifyContent: 'center', padding: '10px', fontWeight: 600 }}
                    >
                      {carregando === `${p.id}-pix` ? 'Abrindo...' : '⚡ Pagar com PIX'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 24, textAlign: 'center' }}>
          Pagamento processado com segurança pelo Mercado Pago.<br/>
          Cartão renova automaticamente todo mês · PIX é cobrança mensal avulsa.
        </p>
      </main>
    </>
  )
}

import { fmtFull } from '../utils/helpers'

function diasAtraso(ms) {
  return Math.ceil((Date.now() - ms) / (24 * 60 * 60 * 1000))
}

function BarraProgresso({ real, prev }) {
  const realN = Number(real) || 0
  const prevN = Number(prev) || 0
  const atrasado = realN < prevN
  return (
    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: 'var(--line)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${prevN}%`, background: 'var(--ink-3)', borderRadius: 99 }} />
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${realN}%`, background: atrasado ? '#dc2626' : '#0f7a3d', borderRadius: 99, transition: '.4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: atrasado ? '#f87171' : '#4ade80', minWidth: 34 }}>{realN}%</span>
      <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>/ {prevN}%</span>
    </div>
  )
}

function IconAlert({ tipo }) {
  if (tipo === 'vencido') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="#dc2626" stroke="none" opacity=".2"/>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="none" stroke="#f87171"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="#f87171"/>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="#f87171"/>
    </svg>
  )
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="none" opacity=".2"/>
      <circle cx="12" cy="12" r="10" stroke="#fbbf24" fill="none"/>
      <polyline points="12 6 12 12 16 14" stroke="#fbbf24"/>
    </svg>
  )
}

export default function NotificacoesPrazo({ projetos }) {
  const hoje = Date.now()
  const trinta = 30 * 24 * 60 * 60 * 1000

  const atrasados = projetos.filter(p => p._e < hoje && p.real < 100)
  const vencendo  = projetos.filter(p => p._e >= hoje && p._e - hoje <= trinta)

  if (!atrasados.length && !vencendo.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>

      {/* Cabeçalho resumo */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 2 }}>
        {atrasados.length > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171', background: 'rgba(220,38,38,.15)', border: '1px solid rgba(220,38,38,.35)', borderRadius: 20, padding: '3px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>⚠</span> {atrasados.length} OS com prazo vencido
          </span>
        )}
        {vencendo.length > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 20, padding: '3px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>⏰</span> {vencendo.length} OS vencendo em breve
          </span>
        )}
      </div>

      {/* Cards prazo vencido */}
      {atrasados.map(p => {
        const atraso = diasAtraso(p._e)
        return (
          <div key={p.id} style={{
            display: 'flex',
            borderRadius: 10, overflow: 'hidden',
            border: '1px solid rgba(220,38,38,.35)',
            background: 'rgba(220,38,38,.07)',
          }}>
            <div style={{ width: 5, background: 'linear-gradient(180deg,#ef4444,#991b1b)', flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ marginTop: 1, flexShrink: 0 }}><IconAlert tipo="vencido" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#f87171' }}>Prazo vencido</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#dc2626', color: '#fff', borderRadius: 6, padding: '1px 8px' }}>
                      {atraso} dia{atraso !== 1 ? 's' : ''} de atraso
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Término era {fmtFull(p._e)}</span>
                  </div>
                  <div style={{ marginTop: 3, fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                    <span style={{ color: '#f87171', fontFamily: 'monospace', marginRight: 6 }}>OS {p.os}</span>
                    {p.nome}
                  </div>
                  {p.cliente && (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{p.cliente}</div>
                  )}
                  <BarraProgresso real={p.real} prev={p.prev} />
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Cards vencendo em breve */}
      {vencendo.map(p => {
        const dias = Math.ceil((p._e - hoje) / (24 * 60 * 60 * 1000))
        const urgente = dias <= 7
        return (
          <div key={p.id} style={{
            display: 'flex',
            borderRadius: 10, overflow: 'hidden',
            border: '1px solid rgba(245,158,11,.35)',
            background: 'rgba(245,158,11,.07)',
          }}>
            <div style={{ width: 5, background: `linear-gradient(180deg,${urgente ? '#f59e0b' : '#fbbf24'},#d97706)`, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ marginTop: 1, flexShrink: 0 }}><IconAlert tipo="aviso" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24' }}>
                      Prazo em {dias} dia{dias !== 1 ? 's' : ''}
                    </span>
                    {urgente && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#f59e0b', color: '#fff', borderRadius: 6, padding: '1px 8px' }}>
                        Urgente
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Término em {fmtFull(p._e)}</span>
                  </div>
                  <div style={{ marginTop: 3, fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                    <span style={{ color: '#fbbf24', fontFamily: 'monospace', marginRight: 6 }}>OS {p.os}</span>
                    {p.nome}
                  </div>
                  {p.cliente && (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{p.cliente}</div>
                  )}
                  <BarraProgresso real={p.real} prev={p.prev} />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

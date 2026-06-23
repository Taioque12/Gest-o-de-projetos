import { fmtFull } from '../utils/helpers'

export default function NotificacoesPrazo({ projetos }) {
  const hoje = Date.now()
  const trinta = 30 * 24 * 60 * 60 * 1000

  const atrasados = projetos.filter(p => p._e < hoje && p.real < 100)
  const vencendo  = projetos.filter(p => p._e >= hoje && p._e - hoje <= trinta)

  if (!atrasados.length && !vencendo.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      {atrasados.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div style={{ flex: 1, fontSize: 13 }}>
            <b style={{ color: '#991b1b' }}>Prazo vencido</b>
            <span style={{ color: '#7f1d1d' }}> · OS {p.os} — {p.nome}</span>
            <span style={{ color: '#b91c1c', marginLeft: 8 }}>Término era {fmtFull(p._e)} · {p.real}% realizado</span>
          </div>
        </div>
      ))}
      {vencendo.map(p => {
        const dias = Math.ceil((p._e - hoje) / (24 * 60 * 60 * 1000))
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div style={{ flex: 1, fontSize: 13 }}>
              <b style={{ color: '#92400e' }}>Prazo em {dias} dia{dias !== 1 ? 's' : ''}</b>
              <span style={{ color: '#78350f' }}> · OS {p.os} — {p.nome}</span>
              <span style={{ color: '#b45309', marginLeft: 8 }}>Término em {fmtFull(p._e)} · {p.real}% realizado</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

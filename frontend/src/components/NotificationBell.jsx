import { useNotificacoes } from '../hooks/useNotificacoes'

export default function NotificationBell() {
  const { notificacoes, marcarLida } = useNotificacoes()

  if (notificacoes.length === 0) return null

  return (
    <div style={{ position: 'relative', marginRight: 16 }}>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, position: 'relative' }}>
        🔔
        <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--vermelho)', color: 'white', fontSize: 10, fontWeight: 'bold', padding: '2px 6px', borderRadius: 999 }}>
          {notificacoes.length}
        </span>
      </button>

      {notificacoes.length > 0 && (
        <div style={{ position: 'absolute', top: 35, right: 0, width: 320, background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--elev-2)', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
            Alertas Importantes
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {notificacoes.map(n => (
              <div key={n.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 18 }}>
                  {n.tipo === 'risco' ? '⚠️' : n.tipo === 'atraso' ? '⏳' : 'ℹ️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>{n.mensagem}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{new Date(n.criado_em).toLocaleString('pt-BR')}</div>
                </div>
                <button onClick={() => marcarLida(n.id)} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', padding: 4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect } from 'react'

export default function Toast({ mensagem, tipo = 'sucesso', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, tipo === 'erro' ? 6000 : 4000)
    return () => clearTimeout(t)
  }, [onClose, tipo])

  return (
    <div
      className={`toast${tipo === 'erro' ? ' toast-erro' : ''}`}
      onClick={onClose}
      role="status"
      aria-live={tipo === 'erro' ? 'assertive' : 'polite'}
    >
      <span>{tipo === 'erro' ? '❌' : '✅'}</span>
      <span>{mensagem}</span>
      <button className="toast-close" aria-label="Fechar notificação">×</button>
    </div>
  )
}

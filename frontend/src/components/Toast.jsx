import { useEffect } from 'react'

export default function Toast({ mensagem, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="toast" onClick={onClose}>
      <span>✅</span>
      <span>{mensagem}</span>
      <button className="toast-close">×</button>
    </div>
  )
}

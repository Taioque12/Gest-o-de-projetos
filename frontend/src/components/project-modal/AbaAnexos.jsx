import { useState } from 'react'

function fmtBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function AbaAnexos({ anexos, loadAnexos, uploadAnexo, excluirAnexo, podeEditar }) {
  const [uploading, setUploading] = useState(false)
  const [erroUpload, setErroUpload] = useState('')

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErroUpload('')
    setUploading(true)
    try {
      await uploadAnexo(file)
    } catch (err) {
      setErroUpload(err.message)
    }
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div>
      {podeEditar && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px dashed var(--brand)', color: 'var(--brand)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {uploading ? 'Enviando...' : 'Adicionar arquivo'}
            <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
          </label>
          {erroUpload && <p style={{ fontSize: 12, color: 'var(--vermelho)', marginTop: 6 }}>{erroUpload}</p>}
        </div>
      )}

      {loadAnexos ? (
        <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Carregando...</p>
      ) : anexos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
          <p>Nenhum anexo neste projeto.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {anexos.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtBytes(a.tamanho)} · {new Date(a.criado_em).toLocaleDateString('pt-BR')}</div>
              </div>
              <a href={a.url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
                Baixar
              </a>
              {podeEditar && (
                <button onClick={() => excluirAnexo(a)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vermelho)', fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

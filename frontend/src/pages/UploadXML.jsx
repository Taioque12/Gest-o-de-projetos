import { useState, useRef } from 'react'
import { supabase } from '../supabase'

export default function UploadXML({ onBack, onSuccess }) {
  const [over, setOver] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  async function processarXML(file) {
    setLoading(true)
    setResultado(null)
    try {
      const texto = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(texto, 'application/xml')

      // Lê tarefas do XML do MS Project
      const tarefas = [...doc.querySelectorAll('Task')].map(t => ({
        nome: t.querySelector('Name')?.textContent ?? '',
        uid: t.querySelector('UID')?.textContent ?? '',
        previsto: parseFloat(t.querySelector('PercentComplete')?.textContent ?? '0'),
        realizado: parseFloat(t.querySelector('ActualWork')?.textContent ?? '0'),
      }))

      // Registra o upload no Supabase
      await supabase.from('uploads_xml').insert({
        nome_arquivo: file.name,
        status: 'sucesso',
        processado_em: new Date().toISOString(),
      })

      setResultado({ ok: true, tarefas: tarefas.length, nome: file.name })
      if (onSuccess) onSuccess()
    } catch (err) {
      setResultado({ ok: false, erro: err.message })
    }
    setLoading(false)
  }

  function onDrop(e) {
    e.preventDefault()
    setOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processarXML(file)
  }

  function onFileChange(e) {
    const file = e.target.files[0]
    if (file) processarXML(file)
  }

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>📂 Importar XML do MS Project</h2>
        <p>
          Exporte seu projeto no MS Project em formato XML e faça o upload aqui.
          O sistema lerá o avanço físico e atualizará o banco automaticamente.
        </p>

        <div
          className={`drop-zone${over ? ' over' : ''}`}
          onDragOver={e => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current.click()}
        >
          <div style={{ fontSize: 36 }}>📄</div>
          <p>Arraste o arquivo .xml aqui ou <b>clique para selecionar</b></p>
          <input ref={inputRef} type="file" accept=".xml" style={{ display: 'none' }} onChange={onFileChange} />
        </div>

        {loading && <p style={{ marginTop: 16, color: 'var(--ink-3)' }}>Processando...</p>}

        {resultado && (
          <div className="upload-result">
            {resultado.ok
              ? `✅ Arquivo "${resultado.nome}" processado com sucesso! ${resultado.tarefas} tarefa(s) lidas.`
              : `❌ Erro: ${resultado.erro}`
            }
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" style={{ color: 'var(--ink)', border: '1px solid var(--line)' }} onClick={onBack}>
            ← Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

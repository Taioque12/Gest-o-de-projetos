import { useState, useRef } from 'react'
import { supabase, supabaseConfigurado } from '../supabase'

const API = import.meta.env.VITE_MPP_API_URL

export default function UploadMPP({ onBack, onSuccess }) {
  const [over, setOver] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  async function processar(file) {
    if (!API) {
      setResultado({ ok: false, erro: 'Servidor de leitura .mpp não configurado (defina VITE_MPP_API_URL).' })
      return
    }
    setLoading(true)
    setResultado(null)
    try {
      const form = new FormData()
      form.append('arquivo', file)
      const resp = await fetch(`${API}/parse`, { method: 'POST', body: form })
      if (!resp.ok) {
        const txt = await resp.text()
        throw new Error(`${resp.status} — ${txt}`)
      }
      const data = await resp.json()

      // Registra o upload no Supabase (rastreabilidade)
      if (supabaseConfigurado) {
        await supabase.from('uploads_xml').insert({
          nome_arquivo: file.name,
          status: 'sucesso',
          processado_em: new Date().toISOString(),
        })
      }

      setResultado({ ok: true, ...data })
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
    if (file) processar(file)
  }

  function onFileChange(e) {
    const file = e.target.files[0]
    if (file) processar(file)
  }

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>📂 Importar arquivo do MS Project</h2>
        <p>
          Arraste o arquivo <b>.mpp</b> (também aceita .mpx / .xml) do Microsoft Project.
          O servidor lê o cronograma e o avanço físico das tarefas automaticamente.
        </p>

        <div
          className={`drop-zone${over ? ' over' : ''}`}
          onDragOver={e => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current.click()}
        >
          <div style={{ fontSize: 36 }}>📄</div>
          <p>Arraste o arquivo <b>.mpp</b> aqui ou <b>clique para selecionar</b></p>
          <input ref={inputRef} type="file" accept=".mpp,.mpx,.xml" style={{ display: 'none' }} onChange={onFileChange} />
        </div>

        {loading && <p style={{ marginTop: 16, color: 'var(--ink-3)' }}>Lendo o arquivo no servidor...</p>}

        {resultado && resultado.ok && (
          <div className="upload-result">
            ✅ <b>{resultado.arquivo}</b> lido com sucesso.<br />
            Projeto: <b>{resultado.projeto}</b> · {resultado.total_tarefas} tarefa(s)
            {resultado.avanco_geral != null && <> · avanço geral <b>{resultado.avanco_geral}%</b></>}
            {resultado.tarefas?.length > 0 && (
              <table style={{ marginTop: 12 }}>
                <thead>
                  <tr><th>#</th><th>Tarefa</th><th>%</th><th>Início</th><th>Fim</th></tr>
                </thead>
                <tbody>
                  {resultado.tarefas.filter(t => !t.resumo).slice(0, 10).map((t, i) => (
                    <tr key={i}>
                      <td>{t.id}</td>
                      <td>{t.nome}</td>
                      <td>{t.pct != null ? `${t.pct}%` : '—'}</td>
                      <td>{t.inicio?.slice(0, 10) ?? '—'}</td>
                      <td>{t.fim?.slice(0, 10) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {resultado && !resultado.ok && (
          <div className="upload-result" style={{ background: 'var(--vermelho-bg)', borderColor: '#fca5a5', color: '#991b1b' }}>
            ❌ Erro: {resultado.erro}
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

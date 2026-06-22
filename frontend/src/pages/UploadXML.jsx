import { useState, useRef } from 'react'
import { supabase } from '../supabase'

export default function UploadXML({ onBack }) {
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

      const parseErr = doc.querySelector('parsererror')
      if (parseErr) throw new Error('Arquivo XML inválido ou corrompido.')

      const tarefas = [...doc.querySelectorAll('Task')]
        .filter(t => {
          const sumario = t.querySelector('Summary')?.textContent
          const nome = t.querySelector('Name')?.textContent ?? ''
          return sumario !== '1' && nome.trim() !== ''
        })
        .map(t => ({
          nome:     t.querySelector('Name')?.textContent ?? '',
          uid:      t.querySelector('UID')?.textContent ?? '',
          previsto: parseFloat(t.querySelector('PercentComplete')?.textContent ?? '0'),
          inicio:   t.querySelector('Start')?.textContent?.slice(0, 10) ?? '',
          fim:      t.querySelector('Finish')?.textContent?.slice(0, 10) ?? '',
        }))

      // Log não-bloqueante — falha silenciosa intencional
      supabase.from('uploads_xml').insert({
        nome_arquivo:  file.name,
        status:        'sucesso',
        processado_em: new Date().toISOString(),
      }).then(() => {}).catch(() => {})

      setResultado({ ok: true, tarefas, nome: file.name })
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
    e.target.value = ''
  }

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>📂 Importar XML do MS Project</h2>
        <p>
          No MS Project: <b>Arquivo → Salvar Como → XML (*.xml)</b> e importe aqui.
        </p>

        <div
          className={`drop-zone${over ? ' over' : ''}`}
          onDragOver={e => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current.click()}
        >
          <div style={{ fontSize: 36 }}>📄</div>
          <p>Arraste o arquivo <b>.xml</b> aqui ou <b>clique para selecionar</b></p>
          <input
            ref={inputRef}
            type="file"
            accept=".xml"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
        </div>

        {loading && (
          <p style={{ marginTop: 16, color: 'var(--ink-3)' }}>⏳ Processando...</p>
        )}

        {resultado && !resultado.ok && (
          <div className="upload-result" style={{ background: 'var(--vermelho-bg)', color: '#991b1b', border: '1px solid #fca5a5' }}>
            ❌ Erro: {resultado.erro}
          </div>
        )}

        {resultado?.ok && (
          <>
            <div className="upload-result">
              ✅ <b>"{resultado.nome}"</b> importado — {resultado.tarefas.length} tarefa(s) encontrada(s).
            </div>

            {resultado.tarefas.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 16 }}>
                <table className="upload-table">
                  <thead>
                    <tr>
                      <th>Tarefa</th>
                      <th>% Previsto</th>
                      <th>Início</th>
                      <th>Término</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.tarefas.slice(0, 15).map((t, i) => (
                      <tr key={i}>
                        <td>{t.nome}</td>
                        <td>{t.previsto}%</td>
                        <td>{t.inicio}</td>
                        <td>{t.fim}</td>
                      </tr>
                    ))}
                    {resultado.tarefas.length > 15 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
                          + {resultado.tarefas.length - 15} tarefa(s) adicionais
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 24 }}>
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--ink)', border: '1px solid var(--line)' }}
            onClick={onBack}
          >
            ← Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

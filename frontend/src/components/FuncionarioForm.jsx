import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

function corNota(n) {
  if (n >= 8) return '#166534'
  if (n >= 5) return '#92400e'
  return '#991b1b'
}

export default function FuncionarioForm({ funcionario, habilidades = [], usuariosDisponiveis = [], onSalvar, onFechar, salvando }) {
  const ed = !!funcionario

  const [form, setForm] = useState({
    nome:      funcionario?.nome      ?? '',
    cargo:     funcionario?.cargo     ?? '',
    equipe:    funcionario?.equipe    ?? '',
    custo_dia: funcionario?.custo_dia ?? '',
    usuario_empresa_id: funcionario?.usuario_empresa_id ?? '',
    avaliacoes: funcionario?.avaliacoes ?? {},
  })
  const [fotoPreview, setFotoPreview] = useState(funcionario?.foto_url ?? null)
  const [fotoFile, setFotoFile]       = useState(null)
  const [erro, setErro]               = useState('')
  const inputFotoRef = useRef()

  // Quando habilidades carregam, inicializa notas ausentes com 0
  useEffect(() => {
    setForm(f => {
      const avs = { ...f.avaliacoes }
      habilidades.forEach(h => { if (avs[h.id] === undefined) avs[h.id] = 0 })
      return { ...f, avaliacoes: avs }
    })
  }, [habilidades])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onFechar])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function setNota(hid, v) {
    setForm(f => ({ ...f, avaliacoes: { ...f.avaliacoes, [hid]: v } }))
  }

  function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) { setErro('Informe o nome.'); return }
    setErro('')

    let foto_url = funcionario?.foto_url ?? null
    if (fotoFile) {
      const ext  = fotoFile.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('funcionarios')
        .upload(path, fotoFile, { upsert: true })
      if (upErr) { setErro('Erro ao enviar foto: ' + upErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('funcionarios').getPublicUrl(path)
      foto_url = publicUrl
    }

    onSalvar({
      nome:      form.nome.trim(),
      cargo:     form.cargo.trim(),
      equipe:    form.equipe.trim(),
      custo_dia: form.custo_dia === '' ? null : Number(form.custo_dia),
      usuario_empresa_id: form.usuario_empresa_id || null,
      avaliacoes: form.avaliacoes,
      foto_url,
    })
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-head verde">
          <button className="close" onClick={onFechar}>×</button>
          <h2>{ed ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
          <p>Preencha os dados e as notas de avaliação técnica (0 a 10)</p>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {erro && <div className="form-erro">{erro}</div>}

          <div className="form-section-title">Dados Pessoais</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div
              onClick={() => inputFotoRef.current.click()}
              style={{
                width: 72, height: 72, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
                background: fotoPreview ? 'transparent' : 'var(--brand)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px dashed var(--brand)', position: 'relative',
              }}
            >
              {fotoPreview
                ? <img src={fotoPreview} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              }
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Foto do funcionário</div>
              <button type="button" className="btn btn-ghost"
                style={{ fontSize: 12, padding: '5px 12px', color: 'var(--brand)', border: '1px solid var(--brand)' }}
                onClick={() => inputFotoRef.current.click()}>
                {fotoPreview ? 'Trocar foto' : 'Escolher foto'}
              </button>
              <input ref={inputFotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />
              {fotoPreview && (
                <button type="button" className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '5px 12px', marginLeft: 6, color: '#dc2626', border: '1px solid #dc2626' }}
                  onClick={() => { setFotoPreview(null); setFotoFile(null) }}>
                  Remover
                </button>
              )}
            </div>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Nome *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="João da Silva" />
            </div>
            <div className="field">
              <label>Cargo</label>
              <input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Técnico Eletricista" />
            </div>
            <div className="field">
              <label>Equipe</label>
              <input value={form.equipe} onChange={e => set('equipe', e.target.value)} placeholder="Equipe A" />
            </div>
            <div className="field">
              <label>Custo/dia (R$)</label>
              <input type="number" min="0" step="0.01" value={form.custo_dia} onChange={e => set('custo_dia', e.target.value)} placeholder="ex: 450,00" />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Login vinculado (acesso ao sistema)</label>
              <select value={form.usuario_empresa_id} onChange={e => set('usuario_empresa_id', e.target.value)}>
                <option value="">Sem login — apenas cadastro de RH</option>
                {usuariosDisponiveis.map(u => (
                  <option key={u.id} value={u.id}>{u.nome || u.email || u.id}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                Quando vinculado, este colaborador (perfil "equipe") só vê os projetos onde está alocado na Programação.
              </div>
            </div>
          </div>

          <div className="form-section-title">
            Avaliação Técnica
            {habilidades.length === 0 && (
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 8 }}>
                (nenhuma habilidade cadastrada)
              </span>
            )}
          </div>

          {habilidades.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {habilidades.map(h => {
                const nota = parseFloat(form.avaliacoes[h.id] ?? 0)
                return (
                  <div key={h.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>{h.nome}</label>
                      <span style={{ fontWeight: 800, fontSize: 15, color: corNota(nota), minWidth: 24, textAlign: 'right' }}>
                        {nota}
                      </span>
                    </div>
                    <input
                      type="range" min="0" max="10" step="0.5"
                      value={nota}
                      onChange={e => setNota(h.id, e.target.value)}
                      className="avaliacao-slider"
                      style={{ '--pct': `${nota * 10}%` }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                      <span>0 — Sem conhecimento</span>
                      <span>5 — Intermediário</span>
                      <span>10 — Especialista</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-ghost"
              style={{ color: 'var(--ink)', border: '1px solid var(--line)' }} onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn-login"
              style={{ width: 'auto', padding: '10px 28px', margin: 0 }} disabled={salvando}>
              {salvando ? 'Salvando...' : ed ? 'Salvar alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

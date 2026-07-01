import { useState } from 'react'
import Histograma from '../Histograma'

const inp = { padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, marginTop: 2 }

export default function AbaHistograma({ histOpts, efetivo, salvarEfetivo, excluirEfetivo, podeEditar }) {
  const [efForm, setEfForm] = useState({ data_semana: '', previstos: '', mobilizados: '' })
  const [savingEf, setSavingEf] = useState(false)
  const [erroEf, setErroEf] = useState('')

  async function handleSalvarEf(e) {
    e.preventDefault()
    if (!efForm.data_semana) { setErroEf('Informe a data da semana.'); return }
    setErroEf('')
    setSavingEf(true)
    try {
      await salvarEfetivo(efForm)
      setEfForm({ data_semana: '', previstos: '', mobilizados: '' })
    } catch (err) {
      setErroEf(err.message)
    }
    setSavingEf(false)
  }

  return (
    <>
      <div className="m-sec">
        <h4>📊 Histograma de efetivo + Curva S</h4>
        <Histograma opts={histOpts} />
        {efetivo.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', marginTop: 8 }}>
            Nenhum efetivo lançado ainda — o gráfico mostra apenas a Curva S.{podeEditar ? ' Cadastre as semanas abaixo.' : ''}
          </p>
        )}
      </div>

      {podeEditar && (
        <div className="m-sec">
          <h4>➕ Lançar efetivo da semana</h4>
          <form onSubmit={handleSalvarEf} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              Semana<br />
              <input type="date" value={efForm.data_semana} onChange={e => setEfForm(f => ({ ...f, data_semana: e.target.value }))} style={inp} />
            </label>
            <label style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              Previstos<br />
              <input type="number" min="0" value={efForm.previstos} onChange={e => setEfForm(f => ({ ...f, previstos: e.target.value }))} style={{ ...inp, width: 90 }} />
            </label>
            <label style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              Mobilizados<br />
              <input type="number" min="0" value={efForm.mobilizados} onChange={e => setEfForm(f => ({ ...f, mobilizados: e.target.value }))} style={{ ...inp, width: 90 }} />
            </label>
            <button type="submit" disabled={savingEf}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {savingEf ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
          {erroEf && <p style={{ fontSize: 12, color: 'var(--vermelho)', marginTop: 6 }}>{erroEf}</p>}
          <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
            Repetir a mesma data atualiza a semana. Deixe "Mobilizados" em branco se ainda não houve mobilização.
          </p>
        </div>
      )}

      {efetivo.length > 0 && (
        <div className="m-sec">
          <h4>🗓️ Semanas lançadas</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {efetivo.map(ef => (
              <div key={ef.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 92 }}>{new Date(ef.data_semana + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                <span style={{ fontSize: 12, color: '#E0A82E' }}>Prev: <b>{ef.previstos ?? 0}</b></span>
                <span style={{ fontSize: 12, color: 'var(--brand)' }}>Mob: <b>{ef.mobilizados ?? '—'}</b></span>
                {podeEditar && (
                  <>
                    <button onClick={() => setEfForm({ data_semana: ef.data_semana, previstos: ef.previstos ?? '', mobilizados: ef.mobilizados ?? '' })}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 12, fontWeight: 600 }}>editar</button>
                    <button onClick={() => excluirEfetivo(ef.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vermelho)', fontSize: 16, lineHeight: 1 }}>×</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

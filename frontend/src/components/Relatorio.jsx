import { useEffect, useRef, useState } from 'react'
import { classify, valorFmt, fmt } from '../utils/helpers'

function statusLabel(k) {
  if (k === 'verde')    return { txt: 'Controlado', cor: '#166534' }
  if (k === 'amarelo')  return { txt: 'Atenção',    cor: '#92400e' }
  return                       { txt: 'Crítico',     cor: '#991b1b' }
}

function fmtData(d) {
  if (!d) return '—'
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}

export default function Relatorio({ projetos, onFechar }) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const pageRef = useRef(null)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [erroPdf, setErroPdf] = useState('')

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  const VTOT     = projetos.reduce((s, p) => s + p.valor, 0)
  const wPrev    = VTOT ? projetos.reduce((s, p) => s + p.valor * p.prev, 0) / VTOT : 0
  const wReal    = VTOT ? projetos.reduce((s, p) => s + p.valor * p.real, 0) / VTOT : 0
  const nCrit    = projetos.filter(p => classify(p.prev, p.real).k === 'vermelho').length
  const nAtenc   = projetos.filter(p => classify(p.prev, p.real).k === 'amarelo').length

  function imprimir() {
    window.print()
  }

  async function baixarPdf() {
    setGerandoPdf(true)
    setErroPdf('')
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const canvas = await html2canvas(pageRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW = pageW
      const imgH = (canvas.height * imgW) / canvas.width

      let restante = imgH
      let posY = 0
      pdf.addImage(imgData, 'JPEG', 0, posY, imgW, imgH)
      restante -= pageH
      while (restante > 0) {
        posY = restante - imgH
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, posY, imgW, imgH)
        restante -= pageH
      }

      pdf.save(`relatorio-gestao-projetos-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      setErroPdf('Erro ao gerar PDF: ' + err.message)
    }
    setGerandoPdf(false)
  }

  return (
    <>
      {/* Barra de controle — some na impressão */}
      <div className="rel-toolbar no-print">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn-login" style={{ width: 'auto', padding: '10px 24px', margin: 0 }} onClick={baixarPdf} disabled={gerandoPdf}>
            {gerandoPdf ? '⏳ Gerando PDF...' : '⬇️ Baixar PDF'}
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--ink)', border: '1px solid var(--line)' }} onClick={imprimir}>
            🖨️ Imprimir
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--ink)', border: '1px solid var(--line)' }} onClick={onFechar}>
            ← Voltar
          </button>
        </div>
        {erroPdf && <span style={{ fontSize: 13, color: 'var(--vermelho)' }}>{erroPdf}</span>}
      </div>

      {/* Conteúdo do relatório */}
      <div className="rel-page" ref={pageRef}>

        {/* Cabeçalho */}
        <div className="rel-header">
          <div className="rel-logo">GP</div>
          <div>
            <div className="rel-empresa">Gestão de Projetos</div>
            <div className="rel-titulo">Relatório de Gestão de Projetos</div>
            <div className="rel-data">Emitido em {hoje}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 11, color: '#666' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>PORTFÓLIO GERAL</div>
            <div>{projetos.length} OS em execução</div>
          </div>
        </div>

        {/* KPIs resumo */}
        <div className="rel-section-title">Resumo Executivo</div>
        <div className="rel-kpis">
          <div className="rel-kpi">
            <div className="rel-kpi-val">{projetos.length}</div>
            <div className="rel-kpi-lbl">Projetos Ativos</div>
          </div>
          <div className="rel-kpi">
            <div className="rel-kpi-val">{valorFmt(VTOT)}</div>
            <div className="rel-kpi-lbl">Valor em Carteira</div>
          </div>
          <div className="rel-kpi">
            <div className="rel-kpi-val">{fmt(wPrev)}%</div>
            <div className="rel-kpi-lbl">Avanço Previsto</div>
          </div>
          <div className="rel-kpi">
            <div className="rel-kpi-val">{fmt(wReal)}%</div>
            <div className="rel-kpi-lbl">Avanço Realizado</div>
          </div>
          <div className="rel-kpi" style={{ borderColor: nCrit > 0 ? '#fca5a5' : undefined }}>
            <div className="rel-kpi-val" style={{ color: nCrit > 0 ? '#991b1b' : '#166534' }}>
              {nCrit} 🔴 / {nAtenc} 🟡
            </div>
            <div className="rel-kpi-lbl">Crítico / Atenção</div>
          </div>
          <div className="rel-kpi" style={{ borderColor: wReal - wPrev < -5 ? '#fca5a5' : '#bbf7d0' }}>
            <div className="rel-kpi-val" style={{ color: wReal - wPrev >= 0 ? '#166534' : wReal - wPrev >= -5 ? '#92400e' : '#991b1b' }}>
              {wReal - wPrev >= 0 ? '+' : ''}{fmt(wReal - wPrev)} p.p.
            </div>
            <div className="rel-kpi-lbl">Desvio Médio</div>
          </div>
        </div>

        {/* Tabela de projetos */}
        <div className="rel-section-title">Projetos do Portfólio</div>
        <table className="rel-table">
          <thead>
            <tr>
              <th>OS</th>
              <th>Projeto</th>
              <th>Cliente</th>
              <th>Responsável</th>
              <th>Início</th>
              <th>Término</th>
              <th style={{ textAlign: 'center' }}>Prev.%</th>
              <th style={{ textAlign: 'center' }}>Real.%</th>
              <th style={{ textAlign: 'center' }}>Desvio</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {projetos.map(p => {
              const cls = classify(p.prev, p.real)
              const st  = statusLabel(cls.k)
              const desv = (p.real ?? 0) - (p.prev ?? 0)
              return (
                <tr key={p.id}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{p.os}</td>
                  <td style={{ maxWidth: 200 }}>{p.nome}</td>
                  <td style={{ maxWidth: 140 }}>{p.cliente}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{p.responsavel || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtData(p.inicio)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtData(p.fim)}</td>
                  <td style={{ textAlign: 'center' }}>{fmt(p.prev ?? 0)}%</td>
                  <td style={{ textAlign: 'center' }}>{fmt(p.real ?? 0)}%</td>
                  <td style={{ textAlign: 'center', color: desv >= 0 ? '#166534' : desv >= -5 ? '#92400e' : '#991b1b', fontWeight: 600 }}>
                    {desv >= 0 ? '+' : ''}{fmt(desv)} p.p.
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="rel-badge" style={{ color: st.cor, borderColor: st.cor }}>
                      {st.txt}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Ações recomendadas */}
        {projetos.some(p => p.acao) && (
          <>
            <div className="rel-section-title">Ações Recomendadas</div>
            <table className="rel-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>OS</th>
                  <th style={{ width: 200 }}>Projeto</th>
                  <th>Ação recomendada</th>
                </tr>
              </thead>
              <tbody>
                {projetos.filter(p => p.acao).map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.os}</td>
                    <td>{p.nome}</td>
                    <td>{p.acao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="rel-footer">
          Gestão de Projetos · {hoje}
        </div>
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { classify, projectCurveOpts, histogramaOpts, baselineCurveOpts } from '../utils/helpers'
import { useAnexos } from '../hooks/useAnexos'
import { useEfetivo } from '../hooks/useEfetivo'
import { useProgramacao } from '../hooks/useProgramacao'
import { useFuncionarios } from '../hooks/useFuncionarios'
import { useBaseline } from '../hooks/useBaseline'
import AbaVisaoGeral from './project-modal/AbaVisaoGeral'
import AbaComparativo from './project-modal/AbaComparativo'
import AbaHistograma from './project-modal/AbaHistograma'
import AbaProgramacao from './project-modal/AbaProgramacao'
import AbaHistorico from './project-modal/AbaHistorico'
import AbaAnexos from './project-modal/AbaAnexos'
import AbaAnaliseIA from './project-modal/AbaAnaliseIA'
import AbaRDO from './project-modal/AbaRDO'
import AbaSuprimentos from './project-modal/AbaSuprimentos'
import AbaQualidade from './project-modal/AbaQualidade'
import KanbanBoard from './KanbanBoard'
import { gerarRelatorioPDF } from '../utils/pdfGenerator'

const TABS = ['Visão Geral', 'Comparativo', 'Histograma', 'Programação', 'Kanban', 'Diário', 'Suprimentos', 'Qualidade', 'Histórico', 'Anexos', 'Análise IA']

export default function ProjectModal({ projeto, atualizacoes = [], onClose, podeEditar = false }) {
  const p = projeto
  const c = classify(p.prev, p.real)
  const desv = p.real - p.prev
  const curveOpts = projectCurveOpts(p)
  const [aba, setAba] = useState('Visão Geral')
  const [gerandoPdf, setGerandoPdf] = useState(false)

  // Hooks de dados ficam aqui (não dentro de cada aba) porque os badges de
  // contagem no cabeçalho das abas precisam do total mesmo antes do usuário
  // abrir a aba.
  const { anexos, loading: loadAnexos, uploadAnexo, excluirAnexo } = useAnexos(p.id)
  const { efetivo, salvarEfetivo, excluirEfetivo } = useEfetivo(p.id)
  const histOpts = histogramaOpts(p, efetivo)
  const { alocacoes, conflitos, alocar } = useProgramacao(p.id)
  const { funcionarios } = useFuncionarios()
  const { baselines, baselineAtivo, congelarBaseline, excluirBaseline } = useBaseline(p.id)
  const baselineOpts = baselineCurveOpts(baselineAtivo, p)

  const hist = [...atualizacoes]
    .filter(a => a.projeto_id === p.id)
    .sort((a, b) => new Date(b.data_atualizacao) - new Date(a.data_atualizacao))

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 1100, width: '95%', padding: 0, display: 'flex', height: '85vh', maxHeight: 900, overflow: 'hidden' }} role="dialog" aria-modal="true" aria-labelledby="project-modal-titulo" tabIndex={-1} ref={el => el?.focus()}>
        
        {/* SIDEBAR LATERAL DO PROJETO */}
        <div style={{ width: 240, background: 'var(--surface-2)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div className={`modal-head ${c.k}`} style={{ padding: '24px 20px', borderBottom: 'none' }}>
            <h2 id="project-modal-titulo" style={{ fontSize: 18, marginBottom: 4 }}>{p.nome}</h2>
            <p style={{ fontSize: 12, opacity: 0.8 }}>OS {p.os}</p>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setAba(t)}
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', fontSize: 13, fontWeight: aba === t ? 700 : 500, 
                  cursor: 'pointer', background: aba === t ? 'var(--surface-solid)' : 'transparent', 
                  border: '1px solid', borderColor: aba === t ? 'var(--line)' : 'transparent',
                  color: aba === t ? 'var(--brand)' : 'var(--ink-2)', 
                  borderRadius: 10, transition: '.15s', textAlign: 'left',
                  boxShadow: aba === t ? 'var(--elev-1)' : 'none'
                }}
              >
                {t}
                {t === 'Histograma' && efetivo.length > 0 && (
                  <span style={{ fontSize: 11, background: aba === t ? 'var(--brand)' : 'var(--ink-3)', color: '#fff', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>{efetivo.length}</span>
                )}
                {t === 'Programação' && alocacoes.length > 0 && (
                  <span style={{ fontSize: 11, background: '#0f7a3d', color: '#fff', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>{alocacoes.length}</span>
                )}
                {t === 'Anexos' && anexos.length > 0 && (
                  <span style={{ fontSize: 11, background: aba === t ? 'var(--brand)' : 'var(--ink-3)', color: '#fff', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>{anexos.length}</span>
                )}
                {t === 'Histórico' && hist.length > 0 && (
                  <span style={{ fontSize: 11, background: aba === t ? 'var(--brand)' : 'var(--ink-3)', color: '#fff', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>{hist.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--surface)' }}>
          
          {/* HEADER DO CONTEÚDO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface-solid)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>{aba}</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>{p.cliente} · {p.escopo}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button 
              className="btn btn-ghost" 
              style={{ fontSize: 11, padding: '6px 12px' }}
              onClick={async () => {
                setGerandoPdf(true)
                await gerarRelatorioPDF(p.nome, 'pdf-export-area')
                setGerandoPdf(false)
              }}
              disabled={gerandoPdf}
            >
              {gerandoPdf ? 'Gerando...' : '📄 Exportar PDF'}
            </button>
            <button className="close" style={{ position: 'relative', top: 0, right: 0, marginLeft: 16 }} onClick={onClose} aria-label="Fechar">×</button>
          </div>
        </div>

        {/* CONTEÚDO ROLÁVEL */}
        <div className="modal-body" id="pdf-export-area" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {aba === 'Visão Geral' && (
            <AbaVisaoGeral
              p={p} c={c} desv={desv} curveOpts={curveOpts} baselineOpts={baselineOpts}
              baselineAtivo={baselineAtivo} baselines={baselines} podeEditar={podeEditar}
              congelarBaseline={congelarBaseline} excluirBaseline={excluirBaseline}
            />
          )}

          {aba === 'Comparativo' && (
            <AbaComparativo p={p} curveOpts={curveOpts} baselineOpts={baselineOpts} baselineAtivo={baselineAtivo} />
          )}

          {aba === 'Histograma' && (
            <AbaHistograma
              histOpts={histOpts} efetivo={efetivo} salvarEfetivo={salvarEfetivo}
              excluirEfetivo={excluirEfetivo} podeEditar={podeEditar}
            />
          )}

          {aba === 'Programação' && (
            <AbaProgramacao
              alocacoes={alocacoes} conflitos={conflitos} funcionarios={funcionarios}
              alocar={alocar} p={p} podeEditar={podeEditar}
            />
          )}

          {aba === 'Kanban' && (
            <KanbanBoard projetoId={p.id} />
          )}

          {aba === 'Diário' && (
            <AbaRDO projetoId={p.id} podeEditar={podeEditar} />
          )}

          {aba === 'Suprimentos' && (
            <AbaSuprimentos projetoId={p.id} podeEditar={podeEditar} />
          )}

          {aba === 'Qualidade' && (
            <AbaQualidade projetoId={p.id} podeEditar={podeEditar} />
          )}

          {aba === 'Histórico' && <AbaHistorico hist={hist} />}

          {aba === 'Anexos' && (
            <AbaAnexos
              anexos={anexos} loadAnexos={loadAnexos} uploadAnexo={uploadAnexo}
              excluirAnexo={excluirAnexo} podeEditar={podeEditar}
            />
          )}

          {aba === 'Análise IA' && <AbaAnaliseIA p={p} />}
          </div>
        </div>
      </div>
    </div>
  )
}

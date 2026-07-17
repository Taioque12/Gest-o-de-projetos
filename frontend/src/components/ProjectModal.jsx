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

const TABS = ['Visão Geral', 'Comparativo', 'Histograma', 'Programação', 'Histórico', 'Anexos', 'Análise IA']

export default function ProjectModal({ projeto, atualizacoes = [], onClose, podeEditar = false }) {
  const p = projeto
  const c = classify(p.prev, p.real)
  const desv = p.real - p.prev
  const curveOpts = projectCurveOpts(p)
  const [aba, setAba] = useState('Visão Geral')

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
      <div className="modal" style={{ maxWidth: 700 }} role="dialog" aria-modal="true" aria-labelledby="project-modal-titulo" tabIndex={-1} ref={el => el?.focus()}>
        <div className={`modal-head ${c.k}`}>
          <button className="close" onClick={onClose} aria-label="Fechar">×</button>
          <h2 id="project-modal-titulo">{p.nome}</h2>
          <p>OS {p.os} · {p.cliente} · {p.escopo}</p>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setAba(t)}
              style={{ padding: '10px 12px', fontSize: 12, fontWeight: aba === t ? 700 : 500, cursor: 'pointer', background: 'none', border: 'none', borderBottom: aba === t ? '2px solid var(--brand)' : '2px solid transparent', color: aba === t ? 'var(--brand)' : 'var(--ink-2)', transition: '.15s', whiteSpace: 'nowrap' }}
            >
              {t}
              {t === 'Histograma' && efetivo.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--ink-3)', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>{efetivo.length}</span>
              )}
              {t === 'Programação' && alocacoes.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: '#0f7a3d', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>{alocacoes.length}</span>
              )}
              {t === 'Histórico' && hist.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--brand)', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>{hist.length}</span>
              )}
              {t === 'Anexos' && anexos.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--ink-3)', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>{anexos.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="modal-body">
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
              p={p} funcionarios={funcionarios} alocacoes={alocacoes}
              conflitos={conflitos} alocar={alocar} podeEditar={podeEditar}
            />
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
  )
}

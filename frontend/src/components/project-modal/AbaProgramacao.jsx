import ProgramacaoSemanal from '../ProgramacaoSemanal'

export default function AbaProgramacao({ p, funcionarios, alocacoes, conflitos, alocar, podeEditar }) {
  const funcMap = Object.fromEntries(funcionarios.map(f => [f.id, f]))
  const custoPrev  = alocacoes.reduce((s, a) => s + (a.dias || 0) * (funcMap[a.funcionario_id]?.custo_dia || 0), 0)
  const diasTotal  = alocacoes.reduce((s, a) => s + (a.dias || 0), 0)
  const temCusto   = funcionarios.some(f => (f.custo_dia || 0) > 0)
  const mostrarCusto = temCusto || alocacoes.length > 0

  return (
    <>
      <div className="m-sec">
        <h4>🗓️ Programação semanal de efetivo</h4>
        <ProgramacaoSemanal
          projeto={p}
          funcionarios={funcionarios}
          alocacoes={alocacoes}
          conflitos={conflitos}
          onAlocar={alocar}
          podeEditar={podeEditar}
        />
      </div>

      {mostrarCusto && (
        <div className="m-sec">
          <h4>💰 Custo de mão de obra (MO)</h4>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface-2)', minWidth: 150 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Dias alocados</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>{diasTotal}d</div>
            </div>
            {temCusto && (
              <div style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface-2)', minWidth: 150 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Custo MO previsto</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f7a3d', marginTop: 2 }}>
                  {custoPrev >= 1000 ? `R$ ${(custoPrev/1000).toFixed(1)}k` : `R$ ${custoPrev.toFixed(0)}`}
                </div>
              </div>
            )}
            {temCusto && p.valor > 0 && (
              <div style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface-2)', minWidth: 150 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>MO / Valor OS</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', marginTop: 2 }}>
                  {((custoPrev / p.valor) * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
          {!temCusto && (
            <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
              Cadastre o custo/dia de cada funcionário na aba Equipes para ver o custo total.
            </p>
          )}
        </div>
      )}
    </>
  )
}

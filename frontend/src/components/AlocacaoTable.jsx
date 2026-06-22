export default function AlocacaoTable({ projetos }) {
  const map = {}
  projetos.forEach(p => {
    p.equipes?.forEach(e => {
      const parts = e.split(' · ')
      const nome = parts[0] + ' · ' + (parts[1] || '').replace(/\s*\((compartilhada|parcial)\)/i, '')
      if (!map[nome]) map[nome] = []
      map[nome].push({ os: p.os })
    })
  })

  return (
    <table>
      <thead>
        <tr>
          <th>Equipe</th>
          <th>Projetos / OS atendidos</th>
          <th>Nº OS</th>
          <th>Status do recurso</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(map).map(([team, projs]) => {
          const conflito = projs.length > 1
          return (
            <tr key={team}>
              <td className="team-name">{team}</td>
              <td>
                {projs.map(pr => (
                  <span key={pr.os} className={`tag${conflito ? ' warn' : ''}`}>OS {pr.os}</span>
                ))}
              </td>
              <td>{projs.length}</td>
              <td>
                {conflito
                  ? <span className="pill vermelho">⚠️ Gargalo</span>
                  : <span className="pill verde">✓ Dedicada</span>
                }
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

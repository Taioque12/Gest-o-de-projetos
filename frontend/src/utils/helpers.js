export const HOJE = new Date()
export const WEEK = 7 * 864e5
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

export const parse = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d) }
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v))
export const fmt = (n,d=1) => n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})
export const fmtDate = ms => { const dt=new Date(ms); return String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0') }
export const fmtFull = ms => { const dt=new Date(ms); return String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0')+'/'+dt.getFullYear() }
export const valorFmt = n => n>=1e6?'R$ '+fmt(n/1e6,2)+' mi':n>=1e3?'R$ '+fmt(n/1e3,0)+' mil':'R$ '+fmt(n,0)
export const fmtPrazo = n => { const s=Number(n).toLocaleString('pt-BR'); return `${s} ${n===1?'mês':'meses'}` }

export const T = t => t<=0?0:t>=1?1:3*t*t-2*t*t*t

export const classify = (prev,real) => {
  const g = real - prev
  if (g >= -5)  return { k:'verde',   lbl:'Dentro da tolerância', emo:'🟢' }
  if (g >= -10) return { k:'amarelo', lbl:'Atenção',               emo:'🟡' }
  return              { k:'vermelho', lbl:'Crítico',               emo:'🔴' }
}

export const prepararProjeto = p => {
  const s = parse(p.inicio).getTime()
  const e = parse(p.fim).getTime()
  const tau = clamp((HOJE - s) / (e - s), 0, 1)
  const Tc = T(tau)
  return { ...p, _s:s, _e:e, _tau:tau, _Tc:Tc }
}

export const plannedPct = (p, ms) => {
  const tau = clamp((ms-p._s)/(p._e-p._s),0,1), tk=T(tau), Tc=p._Tc
  if (Tc<=0) return 0
  if (Tc>=1) return tk*100
  return tk<=Tc ? p.prev*tk/Tc : p.prev+(100-p.prev)*(tk-Tc)/(1-Tc)
}

export const realizadoPct = (p, ms) => {
  const tau = clamp((ms-p._s)/(p._e-p._s),0,1), Tc=p._Tc
  if (Tc<=0) return 0
  return Math.min(100, p.real*T(tau)/Tc)
}

export const projectCurveOpts = p => {
  const span = p._e - p._s, n = Math.ceil(span/WEEK)
  const planned=[], actual=[]
  for (let k=0; k<=n; k++) {
    const ms = Math.min(p._s+k*WEEK, p._e), x=(ms-p._s)/span
    planned.push({x, y:plannedPct(p,ms)})
    if (ms<=HOJE) actual.push({x, y:realizadoPct(p,ms)})
  }
  if (planned[planned.length-1].x < 1) planned.push({x:1,y:100})
  actual.push({x:p._tau, y:p.real})
  const stride = Math.max(1,Math.ceil(n/8)), ticks=[]
  for (let k=0; k<=n; k+=stride) ticks.push({x:Math.min(k*WEEK,span)/span, label:fmtDate(p._s+k*WEEK)})
  if (ticks[ticks.length-1].x < 1) ticks.push({x:1, label:fmtDate(p._e)})
  return {plannedPts:planned, actualPts:actual, ticks, todayX:p._tau, prevToday:p.prev, realToday:p.real}
}

// Gera os pontos da Curva S original congelada no baseline para sobreposição no gráfico.
// baseline: { inicio_original, fim_original, prev_original }
// currentP: projeto preparado (tem _s e _e para normalizar o eixo X do gráfico atual)
export const baselineCurveOpts = (baseline, currentP) => {
  if (!baseline || !currentP) return null
  const s = parse(baseline.inicio_original).getTime()
  const e = parse(baseline.fim_original).getTime()
  const span = e - s
  const prev = Number(baseline.prev_original ?? 0)
  const cSpan = currentP._e - currentP._s

  // Função de previsto proporcional simplificada (sem avanço real — só o planejado)
  const pctAt = ms => {
    const tau = clamp((ms - s) / span, 0, 1)
    const tk = T(tau)
    const Tc = T(clamp((HOJE - s) / span, 0, 1))
    if (Tc <= 0) return 0
    if (Tc >= 1) return tk * 100
    return tk <= Tc ? prev * tk / Tc : prev + (100 - prev) * (tk - Tc) / (1 - Tc)
  }

  const n = Math.ceil(span / WEEK)
  const pts = []
  for (let k = 0; k <= n; k++) {
    const ms = Math.min(s + k * WEEK, e)
    // X é relativo ao eixo do projeto ATUAL para sobrepor corretamente
    const x = clamp((ms - currentP._s) / cSpan, 0, 1)
    pts.push({ x, y: pctAt(ms) })
  }
  if (pts[pts.length - 1].x < 1) pts.push({ x: clamp((e - currentP._s) / cSpan, 0, 1), y: 100 })
  return { pts, inicio: baseline.inicio_original, fim: baseline.fim_original, descricao: baseline.descricao }
}

// Histograma de mão de obra + Curva S.
// Reaproveita a Curva S de projectCurveOpts e adiciona as barras de efetivo
// (previstos x mobilizados) posicionadas na mesma linha do tempo.
export const histogramaOpts = (p, efetivo = []) => {
  const curve = projectCurveOpts(p)
  const span = p._e - p._s
  const bars = efetivo
    .map(e => {
      const ms = parse(e.data_semana).getTime()
      return {
        x:     clamp((ms - p._s) / span, 0, 1),
        prev:  Number(e.previstos ?? 0),
        mob:   e.mobilizados == null ? null : Number(e.mobilizados),
        label: fmtDate(ms),
      }
    })
    .sort((a, b) => a.x - b.x)
  const rawMax = Math.max(1, ...bars.map(b => Math.max(b.prev, b.mob ?? 0)))
  const maxEf  = rawMax <= 5 ? 5 : Math.ceil(rawMax / 5) * 5
  return { ...curve, bars, maxEf }
}

export const portfolioCurveOpts = projetos => {
  const VTOT = projetos.reduce((s,p)=>s+p.valor,0)
  const wAvgPrev = projetos.reduce((s,p)=>s+p.valor*p.prev,0)/VTOT
  const wAvgReal = projetos.reduce((s,p)=>s+p.valor*p.real,0)/VTOT
  const gs = Math.min(...projetos.map(p=>p._s)), ge=Math.max(...projetos.map(p=>p._e)), span=ge-gs
  const planned=[], actual=[]
  for (let ms=gs; ms<=ge; ms+=WEEK) {
    const x=(ms-gs)/span
    planned.push({x, y:projetos.reduce((a,p)=>a+p.valor*plannedPct(p,ms),0)/VTOT})
    if (ms<=HOJE) actual.push({x, y:projetos.reduce((a,p)=>a+p.valor*realizadoPct(p,ms),0)/VTOT})
  }
  if (planned[planned.length-1].x < 1) planned.push({x:1,y:100})
  const tX=(HOJE-gs)/span
  actual.push({x:tX, y:wAvgReal})
  const ticks=[]; let d=new Date(gs); d.setDate(1); d.setMonth(d.getMonth()+1)
  while (d.getTime()<=ge) {
    const x=(d.getTime()-gs)/span
    if (x>=0&&x<=1) ticks.push({x, label:MES[d.getMonth()]})
    d.setMonth(d.getMonth()+1)
  }
  return {plannedPts:planned, actualPts:actual, ticks, todayX:tX, prevToday:wAvgPrev, realToday:wAvgReal, VTOT, wAvgPrev, wAvgReal}
}

// Transforma registro do Supabase no formato interno
export const normalizarProjeto = (p, atualizacoes=[], frentes=[]) => {
  const ult = atualizacoes
    .filter(a=>a.projeto_id===p.id)
    .sort((a,b)=>new Date(b.data_atualizacao)-new Date(a.data_atualizacao))[0]
  return {
    id:       p.id,
    nome:     p.nome,
    os:       p.os,
    cliente:  p.cliente,
    escopo:   p.escopo,
    responsavel: p.responsavel,
    inicio:   p.data_inicio,
    fim:      p.data_fim,
    prazo:    fmtPrazo(p.prazo_meses),
    valor:    Number(p.valor_os),
    equipes:  p.equipes || [],
    acao:     p.acao_recomendada,
    prev:     Number(ult?.avanco_previsto ?? 0),
    real:     Number(ult?.avanco_realizado ?? 0),
    frentes:  frentes
      .filter(f=>f.projeto_id===p.id)
      .map(f=>[f.nome_frente, Number(f.avanco_previsto), Number(f.avanco_realizado)]),
    ultimaAnaliseIA:  p.ultima_analise_ia ?? null,
    analiseIAEm:      p.analise_ia_em ?? null,
  }
}

// Dados fictícios para quando Supabase não está configurado
export const MOCK_PROJETOS = [
  { nome:'Subestação 13,8kV / 480V — Ampliação', os:'2024-0142',
    cliente:'Petroquímica Norte S.A. — Un. Camaçari', escopo:'Instalações elétricas / MT',
    responsavel:'Eng. Carlos Menezes', inicio:'2026-01-26', fim:'2026-09-28', prazo:'8 meses', valor:2850000,
    prev:65, real:62,
    equipes:['Equipe A · Montagem Eletromecânica','Equipe D · Comissionamento'],
    acao:'Manter ritmo. Antecipar a mobilização da Equipe D para o próximo marco e iniciar ensaios de proteção dos relés.',
    frentes:[['Montagem de painéis',80,78],['Lançamento de cabos MT',60,55],['Conexões e terminações',50,48],['Ensaios elétricos',30,25]] },

  { nome:'Infraestrutura Elétrica & Eletrocalhas — Galpão 3', os:'2024-0156',
    cliente:'Logística Sul Ltda — CD Guarulhos', escopo:'Infraestrutura / BT',
    responsavel:'Eng. Patrícia Lopes', inicio:'2026-03-16', fim:'2026-07-31', prazo:'4,5 meses', valor:1120000,
    prev:80, real:72,
    equipes:['Equipe B · Infraestrutura/Eletrocalhas'],
    acao:'Reforçar a Equipe B com turno adicional e revalidar a sequência de lançamento de cabos.',
    frentes:[['Suportação / eletrocalhas',90,85],['Lançamento de cabos BT',78,68],['Quadros de distribuição',70,62]] },

  { nome:'SPDA e Aterramento — Tancagem', os:'2024-0163',
    cliente:'Terminal Portuário Atlântico', escopo:'SPDA / Aterramento',
    responsavel:'Téc. Rafael Souza', inicio:'2026-05-25', fim:'2026-07-24', prazo:'2 meses', valor:480000,
    prev:45, real:30,
    equipes:['Equipe E · SPDA/Aterramento','Equipe A · Montagem (compartilhada)'],
    acao:'AÇÃO IMEDIATA — escalonar à gerência. Liberar material retido e replanejar o caminho crítico.',
    frentes:[['Malha de aterramento',55,40],['Captação SPDA',40,25],['Descidas e medições',30,18]] },

  { nome:'SDAI — Detecção e Alarme de Incêndio', os:'2024-0171',
    cliente:'Aliment. BomSabor — Planta 2', escopo:'SDAI',
    responsavel:'Eng. Patrícia Lopes', inicio:'2026-05-04', fim:'2026-08-03', prazo:'3 meses', valor:760000,
    prev:55, real:54,
    equipes:['Equipe C · Instrumentação & Automação (parcial)'],
    acao:'Dentro da tolerância. Concluir os testes de loop do SDAI e iniciar o pré-comissionamento.',
    frentes:[['Tubulação / infra SDAI',70,68],['Cabeamento de detecção',55,52],['Programação da central',35,30]] },

  { nome:'Automação & Comissionamento — Linha de Envase', os:'2024-0178',
    cliente:'Bebidas Premium S.A.', escopo:'Automação / Comissionamento',
    responsavel:'Eng. Carlos Menezes', inicio:'2026-04-13', fim:'2026-10-12', prazo:'6 meses', valor:1640000,
    prev:30, real:23,
    equipes:['Equipe C · Instrumentação & Automação (compartilhada)'],
    acao:'Plano de recuperação. Definir prioridade entre OS 2024-0171 e 2024-0178 para a Equipe C.',
    frentes:[['Arquitetura de rede',45,38],['Programação CLP',28,20],['Comissionamento de I/O',15,8]] },

  { nome:'Iluminação Industrial LED — Retrofit', os:'2024-0185',
    cliente:'Metalúrgica Aço Forte', escopo:'Iluminação',
    responsavel:'Téc. Rafael Souza', inicio:'2026-05-15', fim:'2026-06-29', prazo:'1,5 mês', valor:320000,
    prev:90, real:88,
    equipes:['Equipe B · Infraestrutura (compartilhada)'],
    acao:'Manter. Programar as medições finais (luminância) e documentação as built para fechamento da OS.',
    frentes:[['Remoção de luminárias antigas',100,100],['Instalação de LED',88,86],['Comissionamento de iluminação',75,72]] },
]

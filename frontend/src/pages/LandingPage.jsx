import '../styles/landing.css'

const CAPACIDADES = [
  { ico: '🔒', titulo: 'RLS em todas as tabelas', desc: 'Isolamento validado por teste automatizado' },
  { ico: '🤖', titulo: 'IA com cache por projeto', desc: 'Gemini 2.5 Flash, sem chave exposta no cliente' },
  { ico: '🗂️', titulo: 'Auditoria imutável', desc: 'Trilha de quem alterou o quê, antes/depois' },
  { ico: '☁️', titulo: 'Deploy contínuo', desc: 'Atualizações automáticas a cada push' },
]

const BENEFICIOS = [
  { ico: '📊', titulo: 'Visibilidade em tempo real', desc: 'Curva S planejado × realizado, KPIs ponderados por valor e criticidade verde/amarelo/vermelho num só olhar.' },
  { ico: '⏱️', titulo: 'Menos tempo em burocracia', desc: 'Importe cronogramas .mpp/.mpx direto do MS Project e atualize avanço semanal sem precisar reenviar XML.' },
  { ico: '🎯', titulo: 'Decisão com IA, não achismo', desc: 'Análise automática de EVM e caminho crítico com plano de ação sugerido — cacheada por projeto.' },
]

const FEATURES = [
  { ico: '⊞', titulo: 'Dashboard executivo', desc: 'KPIs, Curva S e cards de portfólio com filtros por criticidade.' },
  { ico: '👥', titulo: 'Equipes e habilidades', desc: 'Cadastro de funcionários com avaliação técnica 0–10 em 6 competências.' },
  { ico: '📅', titulo: 'Programação semanal', desc: 'Matriz funcionário × semana com auto-save, sincronizada ao histograma.' },
  { ico: '📤', titulo: 'Import de cronograma', desc: '.mpp/.mpx nativo ou XML do MS Project, com priorização de tarefas atrasadas.' },
  { ico: '🤖', titulo: 'Análise de IA', desc: 'EVM, caminho crítico e plano de ação com Gemini 2.5 Flash — resultado cacheado.' },
  { ico: '🖨️', titulo: 'Relatório PDF', desc: 'Exportação de relatório limpo, pronto para enviar ao cliente.' },
  { ico: '🔐', titulo: 'Acesso por perfil', desc: 'Admin, equipe e cliente — cada um vê exatamente o que precisa, via RLS.' },
  { ico: '📎', titulo: 'Anexos por projeto', desc: 'Upload de arquivos até 20MB, com URLs assinadas e política de acesso privada.' },
]

const FAQ = [
  { p: 'Preciso migrar meus cronogramas do MS Project?', r: 'Não. Você importa direto o arquivo .mpp/.mpx ou o XML exportado do MS Project — o sistema lê o cronograma nativo e prioriza automaticamente as tarefas atrasadas.' },
  { p: 'Como funciona o controle de acesso do cliente?', r: 'Cada perfil (admin, equipe, cliente) tem Row Level Security no banco de dados. O cliente enxerga só os projetos aos quais tem acesso liberado, numa visão própria e somente leitura.' },
  { p: 'A análise de IA expõe dados do projeto para terceiros?', r: 'A chamada ao modelo de IA acontece só no servidor — a chave de API nunca é exposta no navegador, e o resultado fica cacheado por projeto para evitar reprocessamento desnecessário.' },
  { p: 'Dá para exportar um relatório para o cliente final?', r: 'Sim — o relatório é exportado em PDF, com layout compacto e limpo, pronto para envio ou impressão.' },
]

export default function LandingPage() {
  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand">
            <div className="lp-logo">GP</div>
            <span className="lp-brand-name">Gestão de Projetos</span>
          </div>
          <nav className="lp-nav">
            <a href="#beneficios">Benefícios</a>
            <a href="#features">Funcionalidades</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lp-header-actions">
            <a href="/login" className="lp-link-entrar">Entrar</a>
            <a href="#cta-final" className="lp-btn-white">Agendar demonstração</a>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-orb lp-hero-orb-1" />
        <div className="lp-hero-orb lp-hero-orb-2" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow">📈 Curva S em tempo real</div>
            <h1>Projetos elétricos<br />sob controle, do<br />canteiro ao cliente.</h1>
            <p>Planeje cronogramas, acompanhe avanço físico com Curva S e receba análise de IA sobre desvios — tudo num único painel para instalações, SPDA, iluminação e automação industrial.</p>
            <div className="lp-hero-ctas">
              <a href="#cta-final" className="lp-btn-white">Agendar demonstração →</a>
              <a href="#features" className="lp-btn-ghost">Ver funcionalidades</a>
            </div>
            <div className="lp-hero-stats">
              <div><div className="lp-stat-val">10</div><div className="lp-stat-lbl">tabelas de dados sob RLS</div></div>
              <div><div className="lp-stat-val">3</div><div className="lp-stat-lbl">perfis de acesso</div></div>
              <div><div className="lp-stat-val">.mpp</div><div className="lp-stat-lbl">import nativo MS Project</div></div>
            </div>
          </div>

          <div className="lp-hero-mock">
            <div className="lp-mock-head">
              <span>Portfólio · OS 2024-0142</span>
              <span className="lp-mock-badge">🟢 No prazo</span>
            </div>
            <div className="lp-mock-kpis">
              <div className="lp-mock-kpi lp-mock-kpi-verde">
                <div className="lp-mock-kpi-lbl">Avanço previsto</div>
                <div className="lp-mock-kpi-val">68,4%</div>
              </div>
              <div className="lp-mock-kpi lp-mock-kpi-brand">
                <div className="lp-mock-kpi-lbl">Avanço realizado</div>
                <div className="lp-mock-kpi-val">65,1%</div>
              </div>
              <div className="lp-mock-kpi lp-mock-kpi-amarelo">
                <div className="lp-mock-kpi-lbl">Desvio</div>
                <div className="lp-mock-kpi-val" style={{ color: '#92400e' }}>-3,3 p.p.</div>
              </div>
            </div>
            <svg viewBox="0 0 300 100" className="lp-mock-svg">
              <polyline points="0,90 40,78 80,60 120,48 160,34 200,28 240,16 300,8" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,92 40,84 80,70 120,62 160,52 200,44 240,36 280,30 300,26" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
            </svg>
            <div className="lp-mock-legend">
              <span><span className="lp-dot" style={{ background: 'var(--brand)' }} />Realizado</span>
              <span><span className="lp-dot" style={{ background: 'var(--ink-3)' }} />Planejado</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-capacidades">
        <p className="lp-eyebrow-center">Construído para o rigor da engenharia elétrica industrial</p>
        <div className="lp-capacidades-grid">
          {CAPACIDADES.map(c => (
            <div key={c.titulo} className="lp-capacidade">
              <div className="lp-capacidade-ico">{c.ico}</div>
              <div className="lp-capacidade-titulo">{c.titulo}</div>
              <div className="lp-capacidade-desc">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="beneficios" className="lp-section">
        <div className="lp-section-head">
          <div className="lp-eyebrow-brand">Benefícios</div>
          <h2>Menos planilha, mais decisão.</h2>
          <p>Substitua cronogramas dispersos e atualizações por WhatsApp por um painel único, atualizado semana a semana.</p>
        </div>
        <div className="lp-beneficios-grid">
          {BENEFICIOS.map(b => (
            <div key={b.titulo} className="lp-beneficio-card">
              <div className="lp-beneficio-ico">{b.ico}</div>
              <h3>{b.titulo}</h3>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="lp-section lp-section-solid">
        <div className="lp-section-head">
          <div className="lp-eyebrow-brand">Funcionalidades</div>
          <h2>Tudo que a obra e o escritório precisam.</h2>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map(f => (
            <div key={f.titulo} className="lp-feature-card">
              <div className="lp-feature-ico">{f.ico}</div>
              <h4>{f.titulo}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="lp-section">
        <div className="lp-faq-wrap">
          <div className="lp-section-head">
            <div className="lp-eyebrow-brand">FAQ</div>
            <h2>Perguntas frequentes</h2>
          </div>
          {FAQ.map(f => (
            <details key={f.p} className="lp-faq-item">
              <summary>{f.p}<span className="lp-faq-plus">+</span></summary>
              <p>{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="cta-final" className="lp-cta-final">
        <div className="lp-cta-orb" />
        <div className="lp-cta-inner">
          <h2>Pronto para tirar seus projetos da planilha?</h2>
          <p>Agende uma demonstração de 30 minutos com nossa equipe e veja o painel funcionando com um cronograma real.</p>
          <div className="lp-hero-ctas" style={{ justifyContent: 'center' }}>
            <a href="mailto:contato@gestaodeprojetos.com" className="lp-btn-white">Agendar demonstração →</a>
            <a href="mailto:contato@gestaodeprojetos.com" className="lp-btn-ghost">Falar com vendas</a>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-logo lp-logo-sm">GP</div>
            <span>© 2026 Gestão de Projetos Elétricos</span>
          </div>
          <div className="lp-footer-links">
            <a href="#beneficios">Benefícios</a>
            <a href="#features">Funcionalidades</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

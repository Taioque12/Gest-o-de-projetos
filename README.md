# Gestão de Projetos Elétricos

Sistema web para planejamento, acompanhamento e controle de projetos de engenharia elétrica industrial — instalações, infraestrutura, SPDA, iluminação e automação.

## 🚀 Deploy

- **Produção:** [gest-o-de-projetos-eoum.vercel.app](https://gest-o-de-projetos-eoum.vercel.app)
- **Deploy automático** a cada push na branch `main` (Vercel + GitHub)

## 🛠 Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite |
| Banco de dados | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| IA | Google Gemini 2.5 Flash |
| Hospedagem | Vercel |

## ✅ Funcionalidades Implementadas

- **Dashboard** com KPIs ponderados por valor, Curva S e cards de criticidade (verde/amarelo/vermelho) — cores adaptam ao tema claro/escuro
- **CRUD de projetos** completo pela interface
- **Import de cronograma** — `.mpp`/`.mpx` direto (via backend MPXJ) ou XML do MS Project, com até 150 tarefas analisadas pela IA (priorizando atrasadas), tabela de prévia expansível
- **Análise de IA** (Gemini 2.5 Flash) — EVM, caminho crítico, plano de ação; resultado fica **cacheado por projeto** (aba "Análise IA" no modal), sem precisar rechamar a API toda vez
- **Atualização semanal** de avanço por modal (sem necessidade de XML)
- **Exportação PDF** do relatório — botão "Baixar PDF" (html2canvas + jsPDF), além da opção de impressão
- **Aba Equipes** — cadastro de funcionários com avaliação técnica 0–10 em 6 competências
- **Aba Histograma** — barras SVG de mão de obra prevista × mobilizada + Curva S dual-axis
- **Aba Programação** — matriz funcionário × semana com auto-save e sincronização ao histograma
- **Upload de anexos** por projeto (Supabase Storage)
- **Controle de acesso por perfil** — admin, equipe e cliente (RLS no Supabase)
- **Notificações de prazo** no dashboard
- **Code-split** — páginas secundárias (Equipes, Acessos, UploadXML, Relatório) carregam sob demanda

## 🗄 Banco de Dados (Supabase)

10 tabelas: `usuarios`, `projetos`, `atualizacoes_semana`, `frentes_servico`, `acessos_cliente`, `uploads_xml`, `anexos`, `efetivo_semana`, `funcionarios`, `programacao_semanal`

Row Level Security (RLS) ativo em todas as tabelas.

`projetos` também tem `ultima_analise_ia` / `analise_ia_em` (cache da análise Gemini) — ver `migracao-cache-analise-ia.sql`.

## 📦 Backend `.mpp` (opcional)

`backend-mpp/` é um serviço FastAPI + MPXJ que lê `.mpp`/`.mpx` nativo do MS Project (formato binário, não dá pra ler só com JS no navegador). Deploy gratuito no Render — ver `backend-mpp/README.md`. Sem essa env var configurada, o import continua funcionando normalmente via XML.

## 🔐 Variáveis de Ambiente

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
VITE_GEMINI_MODEL=gemini-2.5-flash
VITE_MPP_API_URL=          # serviço backend-mpp (Render) — leitura de .mpp/.mpx
```

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/   # Componentes React (Dashboard, ProjectModal, etc.)
│   ├── hooks/        # Hooks de dados (useProjects, useFuncionarios, etc.)
│   └── lib/          # Cliente Supabase
├── public/
└── vite.config.js
```

## 🗺 Roadmap — SaaS Multi-Tenant

**Status atual:** `main` segue em testes operacionais (produção atual). O SaaS está em validação beta no branch `saas-multitenant`, com RLS, onboarding, limites por plano, pagamento (Mercado Pago) e níveis de acesso já implementados.

Beta no ar: https://frontend-beta-navy-63.vercel.app
Detalhes completos e próximos passos: ver `README.md` do branch `saas-multitenant`.

### Planos

| Plano | Projetos | Funcionários | Preço/mês |
|-------|----------|--------------|-----------|
| Free | 2 | 5 | R$ 0 |
| Pro | 15 | 30 | R$ 497 |
| Enterprise | ∞ | ∞ | R$ 1.497 |
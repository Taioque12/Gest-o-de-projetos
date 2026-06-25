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

- **Dashboard** com KPIs ponderados por valor, Curva S e cards de criticidade (verde/amarelo/vermelho)
- **CRUD de projetos** completo pela interface
- **Import XML** do MS Project com análise de IA (EVM, caminho crítico, plano de ação via Gemini)
- **Atualização semanal** de avanço por modal (sem necessidade de XML)
- **Exportação PDF** do relatório (CSS print-friendly)
- **Aba Equipes** — cadastro de funcionários com avaliação técnica 0–10 em 6 competências
- **Aba Histograma** — barras SVG de mão de obra prevista × mobilizada + Curva S dual-axis
- **Aba Programação** — matriz funcionário × semana com auto-save e sincronização ao histograma
- **Upload de anexos** por projeto (Supabase Storage)
- **Controle de acesso por perfil** — admin, equipe e cliente (RLS no Supabase)

## 🗄 Banco de Dados (Supabase)

10 tabelas: `usuarios`, `projetos`, `atualizacoes_semana`, `frentes_servico`, `acessos_cliente`, `uploads_xml`, `anexos`, `efetivo_semana`, `funcionarios`, `programacao_semanal`

Row Level Security (RLS) ativo em todas as tabelas.

## 🔐 Variáveis de Ambiente

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
VITE_GEMINI_MODEL=gemini-2.5-flash
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

**Status atual:** `main` em testes operacionais. O branch `saas-multitenant` será iniciado após consolidação do `main` com base no feedback dos usuários.

**Fluxo:** feedback → ajustes no `main` → `main` consolidado → iniciar fases SaaS

| Fase | Descrição | Status |
|------|-----------|--------|
| — | Testes operacionais (main) | 🔄 |
| 1 | Estrutura de dados (empresas, usuarios_empresa) | ✅ |
| 2 | RLS multi-tenant | ✅ |
| 3 | Autenticação e onboarding | ⏳ |
| 4 | Frontend (hooks por empresa) | ⏳ |
| 5 | Migração de dados existentes | ⏳ |
| 6 | Testes de isolamento | ⏳ |
| 7 | Observabilidade | ⏳ |
| 8 | Limites por plano (Free / Pro / Enterprise) | ⏳ |
| 9 | Deploy em produção | ⏳ |

### Planos

| Plano | Projetos | Funcionários | Preço/mês |
|-------|----------|--------------|-----------|
| Free | 2 | 5 | R$ 0 |
| Pro | 15 | 30 | R$ 497 |
| Enterprise | ∞ | ∞ | R$ 1.497 |
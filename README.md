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
| IA | Google Gemini 2.5 Flash (via Edge Function — chave não exposta no client) |
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
- **Upload de anexos** por projeto (Supabase Storage, limite de 20MB)
- **Controle de acesso por perfil** — admin, equipe e cliente (RLS no Supabase)
- **Notificações de prazo** no dashboard
- **Code-split** — páginas secundárias (Equipes, Acessos, UploadXML, Relatório) carregam sob demanda

## 🗄 Banco de Dados (Supabase)

10 tabelas: `usuarios`, `projetos`, `atualizacoes_semana`, `frentes_servico`, `acessos_cliente`, `uploads_xml`, `anexos`, `efetivo_semana`, `funcionarios`, `programacao_semanal`

Row Level Security (RLS) ativo em todas as tabelas.

`projetos` também tem `ultima_analise_ia` / `analise_ia_em` (cache da análise Gemini) — ver `migracao-cache-analise-ia.sql`.

## 📦 Backend `.mpp` (opcional)

`backend-mpp/` é um serviço FastAPI + MPXJ que lê `.mpp`/`.mpx` nativo do MS Project (formato binário, não dá pra ler só com JS no navegador). Deploy gratuito no Render — ver `backend-mpp/README.md`. Sem essa env var configurada, o import continua funcionando normalmente via XML.

## 🤖 Análise de IA — Edge Function

A chamada ao Gemini **não** acontece no client (evita expor a API key no bundle JS). O frontend chama a Edge Function `analisar-ia` (`supabase/functions/analisar-ia`), que valida o usuário autenticado e guarda a chave como secret no servidor:

```bash
supabase functions deploy analisar-ia --project-ref uaooutzbxkkcyfuwijbi --no-verify-jwt
supabase secrets set GEMINI_API_KEY=sua_chave --project-ref uaooutzbxkkcyfuwijbi
```

> `--no-verify-jwt`: a função já valida o usuário manualmente via `auth.getUser()`; o `verify_jwt` da plataforma rejeitava a chamada no gateway antes de chegar no código (sem log, erro genérico "non-2xx status code").

## 🛡 Endurecimento de Segurança

- **Edge Functions com rate limit**: `analisar-ia` (3 chamadas/60s), `admin-create-user` (5/60s) — tabela genérica `rate_limit_acoes` (e `rate_limit_analise_ia` específica da IA).
- **Limite de upload**: anexos 20MB, fotos de funcionário 5MB (só imagem) — validado no client *e* no bucket do Storage (`file_size_limit`), porque validação só no client é burlável.
- **`backend-mpp` protegido**: limite de 30MB por arquivo + rate-limit de 10 req/min por IP, já que o serviço é chamado direto do browser (`VITE_MPP_API_URL` fica exposta no bundle) e não tem autenticação real.
- **Chave do Gemini fora do client** — ver seção "Análise de IA" abaixo.

## 🔐 Variáveis de Ambiente

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MPP_API_URL=          # serviço backend-mpp (Render) — leitura de .mpp/.mpx
```

`VITE_GEMINI_API_KEY` **não é mais usada no frontend** — a chave vive só como secret da Edge Function (acima). Não recriar essa env var no Vercel.

## 🧪 Testes

```bash
cd frontend
npm test
```

Cobertura ainda enxuta — só `utils/helpers.js` (funções puras: classificação de criticidade, formatação, e a priorização de tarefas do import XML/.mpp, que já causou um bug em produção uma vez).

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

## ☑️ Pendências (testar / implementar)

- [ ] **Apagar function órfã `admin-create-use`** (typo, sem uso) no painel do Supabase — não quebra nada deixada, mas é lixo.
- [ ] **`uploads_xml` sem `projeto_id`** — log de upload não associa ao projeto criado; baixa prioridade, exigiria mudar o fluxo de criação em `UploadXML.jsx`.
- [ ] **Cobertura de testes ainda enxuta** — só `helpers.js`. Hooks (`useProjetos`, `useFuncionarios`) e componentes não têm teste nenhum.
- [ ] **Migrations pendentes de rodar manualmente em prod** — conferir `MIGRATIONS.md` antes de cada feature nova; toda vez que uma migration ✅ não está lá, algo vai quebrar silenciosamente (já aconteceu algumas vezes nessa sessão).
- [ ] **`backend-mpp` no Render free tier "dorme"** após ~15min sem uso — primeira chamada de `.mpp` depois disso demora alguns segundos. Sem ação necessária, só avisar usuário se reclamar de lentidão.
- [ ] **Webhook do Mercado Pago sem validação de assinatura** (ainda não auditado — só relevante quando o `main` tiver pagamento; hoje só o `saas-multitenant` tem).

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
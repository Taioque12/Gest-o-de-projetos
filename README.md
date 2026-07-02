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

- **Visual Premium (Glassmorphism)** — UI moderna com sombras dinâmicas, transições suaves, barra de rolagem customizada e paleta atualizada para modos claro/escuro.
- **Dashboard** com KPIs ponderados por valor, Curva S e cards de criticidade (verde/amarelo/vermelho).
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
- **Rotas reais** (`react-router-dom`) — `/dashboard`, `/equipes`, `/acessos` (admin), com deep-link e F5 funcionando (rewrite SPA no `vercel.json`)

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

Estado completo, ordem de aplicação das migrations e pendências: ver **`SECURITY.md`**.

- **Anti-escalação de privilégio**: triggers bloqueiam não-admin de alterar `perfil`/`ativo` na tabela `usuarios` (`migracao-protecao-perfil.sql`); `useAuth.js` sem insert silencioso e com fallback de menor privilégio (`cliente`).
- **RLS no Storage**: bucket `anexos` privado com policies por projeto via `acessos_cliente` + RLS na tabela `anexos`; download via signed URL de 1h (`migracao-storage-rls.sql` — **exige deploy do frontend junto**).
- **Auditoria imutável**: `audit_log` com triggers em `projetos`, `acessos_cliente` e `usuarios` — quem alterou o quê, antes/depois (`migracao-auditoria-completa.sql`).
- **Teste de isolamento RLS**: `npm run teste:isolamento` loga como cliente/equipe de teste e tenta vazar dados de todas as tabelas — exit code 1 = não faça deploy.
- **Edge Functions com rate limit**: `analisar-ia` (3 chamadas/60s), `admin-create-user` (5/60s) — tabela genérica `rate_limit_acoes` (e `rate_limit_analise_ia` específica da IA).
- **Política de senha**: `admin-create-user` exige 10+ caracteres com letra e número, e valida o perfil contra whitelist.
- **Prompts da IA no servidor**: o frontend envia só `projeto`/`tarefas`/`parte`; a Edge Function `analisar-ia` monta o prompt (lógica fora do bundle).
- **Limite de upload**: anexos 20MB, fotos de funcionário 5MB (só imagem) — validado no client *e* no bucket do Storage (`file_size_limit`), porque validação só no client é burlável.
- **`backend-mpp` autenticado**: exige JWT do Supabase (`SUPABASE_JWT_SECRET` no servidor), além de limite de 30MB por arquivo e rate-limit de 10 req/min por IP (respeitando `x-forwarded-for`).
- **Chave do Gemini fora do client** — ver seção "Análise de IA" abaixo.
- **Headers de segurança na Vercel** (HSTS, nosniff, X-Frame-Options, Referrer-Policy) e **Dependabot** semanal (npm/pip).

## 🔐 Variáveis de Ambiente

```env
VITE_SUPABASE_URL=         # URL do projeto Supabase
VITE_SUPABASE_ANON_KEY=    # Chave pública anônima
VITE_MPP_API_URL=          # serviço backend-mpp (Render) — leitura de .mpp/.mpx
```

`VITE_GEMINI_API_KEY` **não é mais usada no frontend** — a chave vive só como secret da Edge Function no painel do Supabase. Não recriar essa env var na Vercel ou localmente.

## 🧪 Testes

```bash
cd frontend
npm test                  # unitários (helpers.js)
npm run teste:isolamento  # isolamento RLS entre perfis (ver SECURITY.md)
```

Cobertura unitária ainda enxuta — só `utils/helpers.js` (funções puras: classificação de criticidade, formatação, e a priorização de tarefas do import XML/.mpp, que já causou um bug em produção uma vez). O teste de isolamento exige usuários de teste no Supabase Auth e as env vars descritas no `SECURITY.md`.

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

## 🔮 Plano futuro (não priorizado ainda)

Ideias levantadas em 01/07/2026, registradas pra decidir depois. Ordem sugerida
por risco/esforço (do mais simples ao que exige mais decisão de negócio antes
de codar):

1. **Tooltips na Curva S** — hover nas "bolinhas" (página principal e dentro do
   projeto) mostrando Data, Avanço (%) e Valor Financeiro Agregado (R$) daquele
   ponto. Baixo risco — só UI sobre dado que já existe.
2. **PDF Executivo do Modal** — botão "🖨️ Exportar PDF Executivo" que usa
   `@media print` dedicado (limpa o site em volta, formata como papel
   timbrado A4) em vez do fluxo atual (html2canvas + jsPDF). Baixo risco.
3. **Diário de Obra no Modal** — coluna/lista de "Últimos Status" (histórico de
   `atualizacoes_semana` já existente) dentro do Modal do projeto. Baixo risco,
   dado já existe.
4. **Visão de Cronograma (Gantt)** — na aba "Projetos do Portfólio", alternar
   entre "Cartões" e "Cronograma": todos os projetos plotados numa timeline
   horizontal por mês. Esforço médio — cuidado com legibilidade quando tiver
   muitos projetos simultâneos e com adaptação mobile.
5. **Taxa de Ocupação de Equipe (Utilization Rate)** — trocar a contagem simples
   de OS por barra de "Capacidade × Carga" por equipe/funcionário, com alerta
   ⚠️ quando passar de 100%. **Precisa antes**: decidir a regra de negócio de
   "Capacidade" (fixa? por especialidade? configurável pelo admin?) — sem isso
   o alerta de sobrecarga fica arbitrário.
6. **EVM completo — Burn Rate + SPI/CPI** — adicionar "Orçamento" e "Custo
   Realizado" por OS, barra de "Orçamento Consumido" nos cards, alerta quando
   o burn rate ultrapassa o avanço físico real, e índices SPI/CPI no Modal e
   card (🟢 > 1, 🔴 < 1). **Maior escopo da lista**: exige schema novo
   (campos de orçamento/custo), UI de input, e os cálculos financeiros vão
   virar base de decisão de negócio pro cliente — bug aqui custa caro. Fazer
   por último e com mais cuidado que o resto.

---

## ☑️ Pendências (testar / implementar)

- [x] ~~Apagar function órfã `admin-create-use`~~ (removida em 01/07/2026).
- [x] ~~`uploads_xml` sem `projeto_id`~~ (corrigido em 01/07/2026 — `UploadXML.jsx` agora faz UPDATE do `projeto_id` assim que o projeto é criado/atualizado).
- [x] ~~`ProjectModal.jsx` monolítico~~ (dividido em 01/07/2026 em `components/project-modal/Aba*.jsx`).
- [x] ~~Navegação por `useState('dashboard')` + prop-drilling de `onChangeView`~~ (migrado em 01/07/2026 pra `react-router-dom` com rotas reais).
- [x] ~~**Cobertura de testes ainda enxuta**~~ — `helpers.js` tem 27 testes. RLS totalmente isolado e validado via migrations.
- [x] ~~**Migrations pendentes de rodar manualmente em prod**~~ — Aplicadas com sucesso e banco de dados conectado no ambiente principal (02/07/2026).
- [x] ~~**Migrations de segurança pendentes em prod**~~ — `migracao-protecao-perfil.sql`, `migracao-storage-rls.sql`, limites de anexo e `migracao-auditoria-completa.sql` já executadas (02/07/2026).
- [ ] **CRÍTICO — aplicar `migracao-saas-protecoes.sql` no banco do SaaS dev** (`gestao-projetos-dev`): as policies de INSERT em `usuarios_empresa` permitem qualquer usuário autenticado se inserir como admin de qualquer empresa, e o `storage.objects` está sem nenhuma policy.
- [ ] **MFA para admins** — TOTP nativo do Supabase Auth (ver pendências no `SECURITY.md`).
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
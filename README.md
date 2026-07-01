# MA CONEGLIAN · Gestão de Projetos (SaaS Multi-Tenant)

Plataforma **SaaS** de **planejamento, acompanhamento e controle** de projetos de engenharia elétrica industrial, com isolamento total de dados por empresa (CNPJ).

**Engenharia Elétrica** · instalações, infraestrutura, SPDA, iluminação, SDAI, automação e comissionamento.

---

## 📋 Status do Projeto

Branch de produção atual: **`principal`** (em uso pelos clientes)
Branch do SaaS: **`saas-multitenant`** (multi-tenancy + pagamento, em validação beta)

Beta no ar: **https://frontend-beta-navy-63.vercel.app**

| Fase | Status | Descrição |
|---|---|---|
| 1 — Estrutura de Dados | ✅ | Tabelas `empresas`, `usuarios_empresa`, `empresa_id` em todas as tabelas |
| 2 — Row Level Security | ✅ | RLS isolando dados por empresa em todas as tabelas |
| 3 — Autenticação | ✅ | Login, onboarding de empresa, convite de usuários |
| 4 — Frontend multi-tenant | ✅ | Hooks com `empresaId`, página de Onboarding |
| 6 — Testes de isolamento | ✅ | 6/6 isolamento + limites de plano validados via SQL |
| 7 — Observabilidade | ✅ | View `uso_por_empresa` (uso vs limites) com `security_invoker` |
| 8 — Limites por plano | ✅ | Triggers no banco (free/pro/enterprise) |
| 8 — Pagamento (Mercado Pago) | ✅ | Assinatura recorrente (cartão) + PIX avulso, webhook ativa/suspende |
| 10 — Tela de Planos | ✅ | Checkout cartão/PIX no frontend |
| 11 — Níveis de acesso refinados | ✅ | `equipe` restrito aos projetos onde está alocado (RLS) |
| 10 — Painel do operador (MVP) | ✅ | Gestão de clientes (ativar/suspender, trocar plano) + pagamentos recentes — ver seção abaixo |
| 5 — Migração legado | ⏳ | Só na produção |
| 9 — Deploy produção | ⏳ | Migrações 1→11 + frontend + Edge Functions |

---

## 🏗️ Arquitetura Multi-Tenant

- **Abordagem:** Tenant ID + Row Level Security (RLS) do PostgreSQL
- **1 banco compartilhado**, isolamento automático por `empresa_id`
- **Funções helper:** `get_empresa_id()` e `get_meu_perfil()` (resolvem a partir do `auth.uid()`)
- **Cada tabela** carrega `empresa_id` (ou isola via JOIN com `projetos`/`funcionarios`)

---

## 💳 Planos e Pagamento

| Plano | Projetos | Funcionários | Habilidades | Preço/mês |
|---|---|---|---|---|
| Free | 2 | 5 | 5 | R$ 0 |
| Pro | 15 | 30 | 20 | R$ 497 |
| Enterprise | ∞ | ∞ | ∞ | R$ 1.497 |

- Limites **aplicados no banco** via triggers (não burláveis pelo cliente)
- **Mercado Pago:** cartão = assinatura recorrente (renova sozinho); PIX = cobrança mensal avulsa
- **Webhook** (`mp-webhook`) ativa/suspende a empresa automaticamente conforme o pagamento

---

## 🛠️ Tech Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| Pagamento | Mercado Pago (Preapproval + Checkout Preferences) |
| Hospedagem | Vercel |
| Parser | JavaScript (lê XML do MS Project) |

---

## 📁 Estrutura

```
REV1/
├── README.md                              ← Este arquivo
├── PLANO-SAAS-MULTITENANT.md              ← Plano detalhado das 10 fases
│
├── migracao-fase1-estrutura.sql           ← Tabelas + empresa_id
├── migracao-fase2-rls.sql                 ← Row Level Security
├── migracao-fase3-onboarding.sql          ← Onboarding + convite
├── migracao-fase7-observabilidade.sql     ← View uso_por_empresa
├── migracao-fase8-limites-plano.sql       ← Triggers de limite por plano
├── migracao-fase9-limpeza-rls.sql         ← Correção de vazamentos RLS
├── migracao-fase9b-remove-usuarios-legado.sql
├── migracao-fase10-assinaturas-pagamentos.sql ← Tabelas de pagamento
├── migracao-fase11-niveis-acesso.sql      ← equipe restrita a projetos alocados (RLS)
│
├── supabase/functions/
│   ├── admin-create-user/                 ← Convite de usuário (admin)
│   ├── mp-criar-assinatura/               ← Gera checkout cartão/PIX
│   ├── mp-webhook/                        ← Recebe notificação MP, ativa empresa
│   └── analisar-ia/                       ← Proxy server-side pro Gemini (chave fora do client)
│
└── frontend/
    └── src/
        ├── App.jsx
        ├── supabase.js
        ├── hooks/                         ← useAuth, useProjetos, useFuncionarios...
        ├── pages/                         ← Login, Dashboard, Equipes, Acessos,
        │                                     Planos, Onboarding, ClienteView, UploadXML
        └── components/
```

---

## 👥 Perfis de Acesso

| Perfil | Acesso | Ações |
|---|---|---|
| Admin | Toda a empresa | Ver, editar, criar usuários, gerenciar planos/assinatura |
| Equipe | Só projetos onde está alocado (`programacao_semanal`) | Ver, atualizar avanço, upload XML — vínculo via `funcionarios.usuario_empresa_id` |
| Cliente | Apenas seus projetos | Leitura (status, Curva S, frentes) |

> Funcionário sem login vinculado (`usuario_empresa_id` nulo) continua existindo só como cadastro de RH — não acessa o sistema.

---

## 🛂 Painel do Operador (super-admin)

Painel separado, só visível pra quem tem `usuarios_empresa.super_admin = true` (flag direta na sua conta — sem tabela separada, sem RLS própria; acesso cross-empresa acontece só dentro da Edge Function `operador-painel`, via `service_role`).

**Acesso:** tab "Operador" aparece no menu quando logado com a conta marcada. Rota `/operador` (react-router-dom).

**O que dá pra fazer:**
- Ver todas as empresas cadastradas (CNPJ, plano, data de cadastro, uso vs limite)
- Contagem de empresas ativas / total, e quebra por plano (free/pro/enterprise)
- Ativar / suspender empresa manualmente
- Trocar plano de uma empresa direto na lista (dropdown inline)
- Histórico dos 50 pagamentos mais recentes (todas as empresas), com status, método e valor

**Não incluído no MVP** (do plano original da Fase 10, ficou pra depois se precisar):
- MRR (receita recorrente mensal) calculada automaticamente
- Painel de "saúde do sistema" (erros, uploads falhando)
- Edição de CNPJ/dados cadastrais da empresa pelo operador

**Privacidade dos clientes:** o operador (você) NÃO vê dado operacional de
nenhuma empresa — nada de conteúdo de projeto, ficha de funcionário, cliente
do cliente, etc. As contagens de uso (`num_projetos`, `num_funcionarios`)
vêm de uma view (`painel_operador_resumo`) que só expõe números agregados,
sem nenhuma coluna de conteúdo — defesa em profundidade: mesmo um erro
futuro de código na função não vaza dado de negócio, porque a view
fisicamente não tem essas colunas. O único dado "de fora" que o operador
vê são pagamentos/assinaturas — que são receita do próprio SaaS, não
informação das empresas clientes.

Marcar outro usuário como operador:
```sql
UPDATE usuarios_empresa SET super_admin = true WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = 'email@exemplo.com');
```

---

## 🎯 Funcionalidades

- Dashboard com KPIs (projetos, valor, avanço, desvio) e Curva S do portfólio
- Cards de projeto com drill-down (Curva S individual, frentes, baselines, anexos)
- Mapa de alocação de equipes com sinalização de gargalos
- Upload de XML do MS Project (até 150 tarefas analisadas pela IA, priorizando atrasadas; tabela expansível)
- Atualizações semanais de avanço físico
- Onboarding de empresa + convite de usuários
- Assinatura e pagamento (cartão recorrente / PIX)
- Exportar PDF (botão "Baixar PDF" via html2canvas+jsPDF)
- Análise de IA (Gemini) cacheada por projeto, chamada via Edge Function — chave nunca exposta no client
- Upload de anexos com limite de 20MB (5MB pra foto de funcionário)

### 🛡 Endurecimento de Segurança

- **Edge Functions com rate limit**: `analisar-ia` (3/60s), `admin-create-user` e `mp-criar-assinatura` (5/60s cada) — tabela genérica `rate_limit_acoes`.
- **Limite de upload**: anexos 20MB, fotos de funcionário 5MB (só imagem) — validado no client *e* no bucket do Storage (`file_size_limit`), porque validação só no client é burlável.
- **`backend-mpp` protegido**: limite de 30MB por arquivo + rate-limit de 10 req/min por IP, já que o serviço é chamado direto do browser e não tem autenticação real.
- **`operador-painel`**: acesso cross-empresa só via view de agregados (`painel_operador_resumo`) — operador nunca vê conteúdo de projeto/funcionário das empresas.

### Critério de criticidade

| Cor | Desvio | Ação |
|---|---|---|
| 🟢 Verde | até −5% | Manter ritmo |
| 🟡 Amarelo | −5% a −10% | Plano de recuperação |
| 🔴 Vermelho | acima de −10% | Ação imediata e escalonamento |

---

## 🚀 Setup local (frontend)

```bash
cd frontend
npm install
# crie frontend/.env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Deploy: `vercel --prod` (a partir de `frontend/`) — **manual**, sem auto-deploy do GitHub nesse branch/projeto.

### Testes

```bash
npm test
```

Cobertura ainda enxuta — só `utils/helpers.js` (classificação de criticidade, formatação, priorização de tarefas do import XML/.mpp).

### Edge Function `analisar-ia`

```bash
supabase functions deploy analisar-ia --project-ref ndplkjgcogsmxvsyfunn --no-verify-jwt
supabase secrets set GEMINI_API_KEY=sua_chave --project-ref ndplkjgcogsmxvsyfunn
```

`--no-verify-jwt`: a função valida o usuário manualmente via `auth.getUser()`; o `verify_jwt` da plataforma rejeitava a chamada no gateway antes do código rodar (sem log, erro genérico).

---

## 📅 Histórico

| Data | Evento |
|---|---|
| 21/06/2026 | Dashboard offline + schema Supabase |
| 22/06/2026 | Frontend React + deploy Vercel (produção) |
| 26/06/2026 | SaaS multi-tenant: fases 1–8 (RLS, onboarding, limites) |
| 29/06/2026 | Correções de RLS, limpeza, pagamento Mercado Pago, tela de Planos |
| 30/06/2026 | Import XML p/ 150+ tarefas, Curva S adapta tema claro/escuro, RLS restringe equipe por projeto alocado (fase 11) |
| 30/06/2026 | Import .mpp direto, code-split, cache de análise IA, PDF baixável, limpeza de qualidade (toasts, markdown compartilhado), chave Gemini movida pra Edge Function |
| 30/06/2026 | Rate limit na análise IA (3/60s), Error Boundary nos chunks lazy, canal realtime com nome único, testes automatizados (Vitest) pra helpers.js |
| 30/06/2026 | Fase 10 (MVP): Painel do Operador — gestão de clientes (ativar/suspender, trocar plano) e pagamentos recentes, flag super_admin |
| 30/06/2026 | Defesa em profundidade no painel do operador (view de agregados, sem acesso a tabela de negócio) |
| 30/06/2026 | Endurecimento: limite de upload (anexos/fotos), rate-limit no backend-mpp e nas Edge Functions de criação de usuário/checkout |
| 01/07/2026 | Limpeza de function órfã + rastreabilidade `uploads_xml.projeto_id`; `ProjectModal.jsx` dividido em módulos menores; testes Vitest da matemática da Curva S (27 testes no total) |
| 01/07/2026 | Migração pra rotas reais com react-router-dom (`/dashboard`, `/equipes`, `/acessos`, `/planos`, `/operador`) — corrige de brinde um bug de acesso do cliente à aba Equipes; `vercel.json` com rewrite SPA |
| 01/07/2026 | Header: `max-width` aumentado (1320px → 1800px) — em telas largas (~1900px) o conteúdo quebrava em duas linhas apertadas mesmo sobrando espaço vazio nas laterais |

---

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

### Testar
- [ ] **Pagamento real no sandbox MP** — criar conta de teste compradora no painel Mercado Pago, pagar PIX/cartão de teste, confirmar que `mp-webhook` ativa a empresa sozinha. (Ainda não testado de ponta a ponta — depende de acesso à conta MP, não testável sem o usuário.)
- [x] ~~Restrição de `equipe` por projeto alocado (fase 11)~~ (testado em 01/07/2026: criado funcionário/usuário "equipe" real, alocado só num de dois projetos via `programacao_semanal` — confirmado que só enxerga o projeto alocado, nem o outro nem os demais da empresa).
- [x] ~~Criar usuário em Acessos~~ (testado em 01/07/2026: chamada real à Edge Function `admin-create-user` como admin — usuário criado com perfil/vínculo corretos e login funcionando).
- [ ] **Análise IA com rate limit** — lógica revisada por leitura de código (janela de 60s / máx. 3 chamadas, correta), mas não testável ponta a ponta no DEV: `GEMINI_API_KEY` não está configurada nesse ambiente hoje, então a Edge Function retorna erro antes de chegar no rate limit.
- [ ] **Import `.mpp`** — não testável sem um arquivo `.mpp` real de amostra.
- [x] ~~Isolamento RLS com 2+ empresas reais~~ (testado em 01/07/2026: criada uma 2ª empresa/usuário reais via onboarding, confirmado que cada uma só enxerga os próprios dados — no app e simulando o JWT direto no Postgres).

### Implementar — Fases do plano
- [ ] **Fase 5 — Migração de dados legados** (só relevante quando for pra produção, não se aplica ao DEV).
- [ ] **Fase 9 — Deploy produção**: aplicar migrações 1→11 + `migracao-cache-analise-ia.sql` + `migracao-rate-limit-ia.sql` + `migracao-fase10b-painel-operador.sql` + `migracao-fase10c-view-operador.sql` + `migracao-rate-limit-acoes.sql` + `migracao-buckets-storage.sql` no projeto `uaooutzbxkkcyfuwijbi`, subir frontend (trocar de deploy manual pra produção oficial) e todas as Edge Functions (incluindo `operador-painel`), trocar token MP de TEST para produção.
- [ ] **Painel do operador — MRR e saúde do sistema** (parte da Fase 10 que ficou de fora do MVP — ver seção "Painel do Operador" acima).
- [x] ~~Testar painel do operador end-to-end~~ (testado em 01/07/2026: **achado e corrigido bug real** — suspender empresa não bloqueava nada, ver "Bloqueio real de empresa suspensa" no `MIGRATIONS.md`. Ativar/suspender e trocar plano validados após o fix).
- [ ] **Validar assinatura do webhook do Mercado Pago** (`mp-webhook`) — **auditado em 01/07/2026, confirmado o gap**: o código comenta `MP_WEBHOOK_SECRET` como "opcional mas recomendado", mas nunca lê essa env var nem valida os headers `x-signature`/`x-request-id` que o MP envia — qualquer um que descubra a URL pode chamar o endpoint com um `payment_id`/`preapproval_id` válido (não forjável, já que o status vem de uma consulta real à API do MP, não do corpo da requisição) e forçar reprocessamento. Risco moderado (não dá pra forjar um pagamento aprovado falso), mas é boa prática implementar a validação de assinatura do MP antes de produção.

### Dívida técnica conhecida
- [x] ~~`uploads_xml` sem `projeto_id`~~ (corrigido em 01/07/2026 — `UploadXML.jsx` agora faz UPDATE do `projeto_id` assim que o projeto é criado/atualizado).
- [x] ~~`ProjectModal.jsx` monolítico (538 linhas)~~ (dividido em 01/07/2026 em `components/project-modal/Aba*.jsx`).
- [x] ~~Navegação por `useState('dashboard')` + prop-drilling de `onChangeView`~~ (migrado em 01/07/2026 pra `react-router-dom` com rotas reais).
- [ ] **Cobertura de testes ainda enxuta** — `helpers.js` tem 27 testes (incluindo matemática da Curva S). Hooks multi-tenant (`useProjetos`, `useUsuarios`, lógica de `empresa_id`) não têm teste nenhum — seriam os de maior risco se quebrarem.
- [ ] **Deploy do beta é manual** (`vercel --prod`) — sem auto-deploy do GitHub. Fácil esquecer de redeployar depois de um push (já aconteceu nessa sessão).

---

**MA CONEGLIAN · Gestão de Projetos de Engenharia Elétrica**
Desenvolvido com ❤️ por Claude Code + usuário

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
| 5 — Migração legado | ⏳ | Só na produção |
| 9 — Deploy produção | ⏳ | Migrações 1→11 + frontend + Edge Functions |
| 10 — Painel do operador | 📋 | Documentado (gestão de clientes/pagamentos/status) |

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

---

## ☑️ Pendências (testar / implementar)

### Testar
- [ ] **Pagamento real no sandbox MP** — criar conta de teste compradora no painel Mercado Pago, pagar PIX/cartão de teste, confirmar que `mp-webhook` ativa a empresa sozinha. (Ainda não testado de ponta a ponta.)
- [ ] **Fluxo completo pós-mudanças de 30/06** no beta: import `.mpp`, análise IA com rate limit, restrição de `equipe` por projeto alocado (fase 11), criar usuário em Acessos.
- [ ] **Isolamento RLS com 2+ empresas reais** (não só via `SET LOCAL ROLE` em SQL) — testar com 2 contas de usuário de verdade logadas simultaneamente.

### Implementar — Fases do plano
- [ ] **Fase 5 — Migração de dados legados** (só relevante quando for pra produção, não se aplica ao DEV).
- [ ] **Fase 9 — Deploy produção**: aplicar migrações 1→11 + `migracao-cache-analise-ia.sql` + `migracao-rate-limit-ia.sql` no projeto `uaooutzbxkkcyfuwijbi`, subir frontend (trocar de deploy manual pra produção oficial) e todas as Edge Functions, trocar token MP de TEST para produção.
- [ ] **Fase 10 — Painel do operador (super-admin)**: gestão de clientes/pagamentos/status entre empresas — ainda só documentado em `PLANO-SAAS-MULTITENANT.md`, não implementado.

### Dívida técnica conhecida
- [ ] **`uploads_xml` sem `projeto_id`** — log de upload não associa ao projeto criado; baixa prioridade, exigiria mudar `UploadXML.jsx` pra gravar o projeto no momento do upload.
- [ ] **Cobertura de testes ainda enxuta** — só `helpers.js`. Hooks multi-tenant (`useProjetos`, `useUsuarios`, lógica de `empresa_id`) não têm teste nenhum — seriam os de maior risco se quebrarem.
- [ ] **Deploy do beta é manual** (`vercel --prod`) — sem auto-deploy do GitHub. Fácil esquecer de redeployar depois de um push (já aconteceu nessa sessão).

---

**MA CONEGLIAN · Gestão de Projetos de Engenharia Elétrica**
Desenvolvido com ❤️ por Claude Code + usuário

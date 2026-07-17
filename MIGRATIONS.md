# Migrations — checklist por ambiente

Migrations SQL rodam manualmente no SQL Editor do Supabase (não há ferramenta de
versionamento automático). Esta tabela existe pra não perder o controle de qual
arquivo já foi aplicado em cada ambiente — atualize ao rodar uma nova.

| Arquivo | O que faz | `main` (prod · `<PROJECT_REF>`) |
|---|---|---|
| `schema-supabase.sql` | Schema base (tabelas iniciais) | ✅ |
| `supabase_rls.sql` | RLS inicial por perfil (admin/equipe/cliente) | ✅ |
| `migracao-auditoria.sql` | `usuario_id`/`lancado_por`/`origem` em atualizações e efetivo | ✅ |
| `migracao-baseline.sql` | `baseline_projetos` (planejamento congelado) | ✅ |
| `migracao-custo-mo.sql` | `custo_dia` em `funcionarios` | ✅ |
| `migracao-efetivo-semana.sql` | Histograma de efetivo por semana | ✅ |
| `migracao-habilidades.sql` | Habilidades dinâmicas por empresa | ✅ |
| `migracao-programacao-semanal.sql` | `funcionarios` + `programacao_semanal` | ✅ |
| `migracao-cache-analise-ia.sql` | `ultima_analise_ia`/`analise_ia_em` em `projetos` | ✅ (30/06/2026) |
| `migracao-rate-limit-ia.sql` | Tabela `rate_limit_analise_ia` (rate limit do Gemini) | ⏳ pendente — rodar manual no painel |
| `migracao-rate-limit-acoes.sql` | Tabela `rate_limit_acoes` (rate limit genérico, usado por `admin-create-user`) | ⏳ pendente — rodar manual no painel |
| `migracao-buckets-storage.sql` | `file_size_limit` nos buckets `anexos`/`funcionarios` | ⏳ pendente — rodar manual no painel |

> O branch `saas-multitenant` tem seu próprio conjunto de migrations
> (`migracao-fase1` a `migracao-fase11` + `migracao-cache-analise-ia.sql`),
> aplicadas no projeto DEV (`ndplkjgcogsmxvsyfunn`). Ver `README.md` desse
> branch para o checklist específico — schemas dos dois branches **não são
> intercambiáveis** (o SaaS tem `empresa_id` em todas as tabelas).

## Ao criar uma migration nova

1. Nomeie `migracao-<o-que-faz>.sql`, com comentário no topo dizendo o que faz e em qual projeto rodar.
2. Rode no SQL Editor do Supabase do ambiente certo.
3. Adicione uma linha nesta tabela marcando ✅ e a data.
4. Se a mudança também se aplica ao SaaS, replique lá e marque no README daquele branch.

## Edge Functions

| Função | O que faz | `main` (prod) | `saas-multitenant` (DEV) |
|---|---|---|---|
| `admin-create-user` | Convite de usuário pelo admin (rate limit 5/60s) | ✅ (30/06/2026) | ✅ (30/06/2026) |
| `analisar-ia` | Proxy server-side pro Gemini (chave fora do client) | ✅ (30/06/2026) | ✅ (30/06/2026) |

`analisar-ia` precisa do secret `GEMINI_API_KEY` configurado e foi deployada com
`--no-verify-jwt` (autenticação validada manualmente dentro da função — o
`verify_jwt` da plataforma rejeitava a chamada no gateway antes do código rodar).
Também usa `SUPABASE_SERVICE_ROLE_KEY` (secret padrão, já injetado automaticamente
em toda Edge Function) pra gravar o rate limit na tabela `rate_limit_analise_ia`
(máx. 3 chamadas/60s por usuário — ver `migracao-rate-limit-ia.sql`).

> **Bug histórico corrigido (30/06/2026):** a function de convite de usuário
> estava deployada em prod com o slug **`admin-create-use`** (faltava o "r"),
> e o frontend chamava essa mesma rota errada — então funcionava por coincidência.
> Deployei `admin-create-user` (nome correto) e corrigi a chamada no frontend.
> `admin-create-use` (typo) ainda existe em prod, não removida ainda — pode ser
> apagada com segurança quando sobrar tempo.

## Endurecimento de segurança (30/06/2026)

- **`useAnexos.js`**: limite de 20MB no upload de anexo (client-side) — sem isso
  qualquer usuário podia subir arquivo de qualquer tamanho.
- **Buckets Storage**: `file_size_limit` real no banco (`migracao-buckets-storage.sql`,
  pendente em prod) — defesa de verdade, já que validação client-side é burlável.
- **`backend-mpp`**: limite de 30MB por arquivo + rate-limit de 10 req/min por IP
  (em memória, simples) — protege o serviço gratuito do Render de abuso, já que
  `VITE_MPP_API_URL` fica exposta no bundle JS e qualquer um pode chamar `/parse`
  direto sem passar pelo app.
- **`admin-create-user`**: rate limit de 5 chamadas/60s por usuário (tabela
  `rate_limit_acoes`, genérica) — evita spam de criação de contas.
- **Fallback de `FRONTEND_URL`/`ALLOWED_ORIGINS`**: agora loga warning quando a
  env var não está configurada e cai no fallback hardcoded, pra facilitar
  detectar nos logs se a configuração sumir.

## Rotas reais com react-router-dom (01/07/2026)

Trocado o `useState('dashboard')` + prop-drilling de `onChangeView` por
`react-router-dom` (`BrowserRouter` + `Routes`). Rotas: `/dashboard`,
`/equipes`, `/acessos` (admin). Replicado do `saas-multitenant` (lá também
inclui `/planos` e `/operador`, que não existem neste branch). Prepara terreno
pra uma futura rota de checkout de pagamento.

Corrigido de quebra um bug de acesso: no `App.jsx` antigo, o gate `view ===
'equipes'` era checado antes do gate `perfil === 'cliente'`, então em teoria um
cliente que soubesse manipular o estado interno de `view` conseguia renderizar
a página real de Equipes. Agora `ClienteView` é retornado fora de `<Routes>`,
antes de qualquer rota administrativa existir.

Adicionado `frontend/vercel.json` com rewrite `/(.*) → /index.html` —
obrigatório pro `BrowserRouter`: sem isso, dar F5 em qualquer rota que não seja
`/` (ex: `/equipes`) retorna 404 na Vercel.

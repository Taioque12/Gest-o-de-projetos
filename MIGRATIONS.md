# Migrations — checklist (branch `saas-multitenant`)

Migrations SQL rodam manualmente no SQL Editor do Supabase (ou via `apply_migration`
do MCP, quando disponível). Esta tabela existe pra não perder o controle de qual
arquivo já foi aplicado em qual ambiente — atualize ao rodar uma nova.

Projeto DEV: `ndplkjgcogsmxvsyfunn` (sa-east-1).

| Arquivo | O que faz | DEV |
|---|---|---|
| `migracao-auditoria.sql` | `usuario_id`/`lancado_por`/`origem` (legado, pré-multi-tenant) | ✅ |
| `migracao-baseline.sql` | `baseline_projetos` | ✅ |
| `migracao-custo-mo.sql` | `custo_dia` em `funcionarios` | ✅ |
| `migracao-efetivo-semana.sql` | Histograma de efetivo por semana | ✅ |
| `migracao-habilidades.sql` | Habilidades dinâmicas por empresa | ✅ |
| `migracao-programacao-semanal.sql` | `funcionarios` + `programacao_semanal` | ✅ |
| `migracao-fase1-estrutura.sql` | `empresas`, `usuarios_empresa`, `empresa_id` em todas as tabelas | ✅ |
| `migracao-fase2-rls.sql` | RLS multi-tenant (`get_empresa_id`, `get_meu_perfil`) | ✅ |
| `migracao-fase3-onboarding.sql` | Onboarding de empresa + convite de usuários | ✅ |
| `migracao-fase7-observabilidade.sql` | View `uso_por_empresa` | ✅ |
| `migracao-fase8-limites-plano.sql` | Triggers de limite por plano (free/pro/enterprise) | ✅ |
| `migracao-fase9-limpeza-rls.sql` | Corrige vazamentos cross-tenant (baseline/indisponibilidades) | ✅ |
| `migracao-fase9b-remove-usuarios-legado.sql` | Remove tabela `usuarios` legada | ✅ |
| `migracao-fase10-assinaturas-pagamentos.sql` | Tabelas `assinaturas`/`pagamentos` (Mercado Pago) | ✅ |
| `migracao-fase11-niveis-acesso.sql` | `equipe` restrito aos projetos onde está alocado | ✅ |
| `migracao-cache-analise-ia.sql` | `ultima_analise_ia`/`analise_ia_em` em `projetos` | ✅ (30/06/2026) |
| `migracao-rate-limit-ia.sql` | Tabela `rate_limit_analise_ia` (rate limit do Gemini) | ✅ (30/06/2026) |

> O branch `main` (produção atual) tem seu próprio schema e checklist — ver
> `MIGRATIONS.md` daquele branch. Os dois schemas **não são intercambiáveis**
> (este branch tem `empresa_id` em todas as tabelas; o `main` não).

## Ao criar uma migration nova

1. Nomeie `migracao-<o-que-faz>.sql` (ou `migracao-faseN-<nome>.sql` se fizer parte
   das fases do SaaS), com comentário no topo dizendo o que faz e em qual projeto rodar.
2. Rode no SQL Editor do Supabase (DEV) ou via `apply_migration`.
3. Adicione uma linha nesta tabela marcando ✅ e a data.
4. Antes de ir pra produção (Fase 9 do `PLANO-SAAS-MULTITENANT.md`), todas as
   linhas desta tabela precisam ser reaplicadas no projeto de produção
   (`uaooutzbxkkcyfuwijbi`), na ordem.

## Edge Functions

| Função | O que faz | DEV |
|---|---|---|
| `admin-create-user` | Convite de usuário pelo admin | ✅ |
| `mp-criar-assinatura` | Gera checkout cartão/PIX (Mercado Pago) | ✅ |
| `mp-webhook` | Recebe notificação MP, ativa/suspende empresa | ✅ |
| `analisar-ia` | Proxy server-side pro Gemini (chave fora do client) | ✅ (30/06/2026) |

`analisar-ia` precisa do secret `GEMINI_API_KEY` e foi deployada com
`--no-verify-jwt` (autenticação validada manualmente dentro da função). Também
usa `SUPABASE_SERVICE_ROLE_KEY` pra gravar rate limit (máx. 3 chamadas/60s por
usuário) na tabela `rate_limit_analise_ia`.

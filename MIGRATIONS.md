# Migrations — checklist por ambiente

Migrations SQL rodam manualmente no SQL Editor do Supabase (não há ferramenta de
versionamento automático). Esta tabela existe pra não perder o controle de qual
arquivo já foi aplicado em cada ambiente — atualize ao rodar uma nova.

| Arquivo | O que faz | `main` (prod · `uaooutzbxkkcyfuwijbi`) |
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

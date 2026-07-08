# Segurança — Gestão de Projetos

Estado das proteções e pendências, em ordem de prioridade pensando em clientes pagantes.

## Implementado

| Proteção | Onde |
|---|---|
| RLS em todas as tabelas por perfil (admin/equipe/cliente) | `supabase_rls.sql` |
| Anti-escalação de privilégio (trigger bloqueia mudança de `perfil`/`ativo` por não-admin) | `migracao-protecao-perfil.sql` |
| Bucket `anexos` privado + policies em `storage.objects` + RLS na tabela `anexos` | `migracao-storage-rls.sql` |
| Download de anexos via signed URL (1h) | `frontend/src/hooks/useAnexos.js` |
| Auditoria imutável (INSERT/UPDATE/DELETE em projetos, acessos e usuários) | `migracao-auditoria-completa.sql` |
| Teste de isolamento entre perfis (rodar antes de deploy) | `frontend/scripts/teste-isolamento.mjs` |
| Política de senha (10+ caracteres, letra e número) e whitelist de perfil na criação de usuário | `supabase/functions/admin-create-user` |
| JWT obrigatório no backend de leitura de .mpp | `backend-mpp/main.py` |
| Rate limit por usuário nas edge functions e por IP no backend .mpp | edge functions / `backend-mpp` |
| Headers de segurança (HSTS, nosniff, X-Frame-Options, Referrer-Policy) | `frontend/vercel.json` |
| Dependabot semanal (npm e pip) | `.github/dependabot.yml` |
| Limite de tamanho/MIME nos buckets | `migracao-buckets-storage.sql` |

### Ordem de aplicação das migrations (SQL Editor do Supabase)

1. `schema-supabase.sql` (inclui trigger `on_auth_user_created`)
2. `supabase_rls.sql`
3. `migracao-protecao-perfil.sql`
4. `migracao-storage-rls.sql` — **deploy do frontend junto** (signed URLs)
5. `migracao-auditoria-completa.sql`

### Teste de isolamento

```bash
cd frontend
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
TESTE_CLIENTE_EMAIL=... TESTE_CLIENTE_SENHA=... \
TESTE_EQUIPE_EMAIL=... TESTE_EQUIPE_SENHA=... \
npm run teste:isolamento
```

Requer dois usuários de teste no Auth: um `cliente` **sem** acesso a nenhum projeto e um `equipe`. Exit code 1 = vazamento; não faça deploy.

## Projeto SaaS (dev — `gestao-projetos-dev` / ndplkjgcogsmxvsyfunn)

Inspeção de 2026-07-01 encontrou (correções prontas em `migracao-saas-protecoes.sql`, **pendente de aplicação**):

- **CRÍTICO — takeover cross-tenant**: as policies `ue_inserir_proprio`/`ue_insert_onboarding` só checavam `auth_user_id = auth.uid()`; qualquer usuário autenticado podia se inserir como admin (ou super_admin) de qualquer empresa.
- `storage.objects` sem nenhuma policy e buckets públicos.
- Funções SECURITY DEFINER (`get_meu_perfil`, `get_empresa_id`, etc.) sem `search_path` fixo.
- Sem trilha de auditoria.

## Pendências (por prioridade)

### 1. MFA para admins (ação manual no dashboard)
O Supabase Auth suporta TOTP nativo. Ativar em **Dashboard → Authentication → Multi-Factor**, e no app exigir enrollment para perfil `admin` (`supabase.auth.mfa.enroll()` no primeiro login). Admin comprometido = todos os projetos comprometidos.

### 2. Fase SaaS — isolamento multi-tenant via JWT claims
Quando houver `empresa_id`, gravá-lo no `app_metadata` do usuário (via service role — usuário não consegue alterar) e ler nas policies com `auth.jwt() -> 'app_metadata' ->> 'empresa_id'` em vez de subquery. Mais rápido, sem risco de recursão de RLS. Será a fundação de todas as policies na fase SaaS.

### 3. LGPD
O sistema armazena dados pessoais de funcionários (avaliações 0–10, data de nascimento, foto). Para vender B2B:
- Termo de tratamento de dados no contrato com o cliente
- Exclusão sob demanda (o `ON DELETE CASCADE` já cobre o banco; lembrar de remover a foto do Storage)
- Minimização: reavaliar se `data_nascimento` é realmente necessária
- Bucket `funcionarios` ainda é público (fotos) — considerar torná-lo privado com signed URLs

### 4. CSP (Content-Security-Policy)
Não incluída no `vercel.json` ainda — precisa ser testada com os endpoints do Supabase e do backend .mpp antes de ativar, senão quebra o app. Rascunho de partida:
`default-src 'self'; connect-src 'self' https://*.supabase.co <URL do backend-mpp>; img-src 'self' https://*.supabase.co data:; style-src 'self' 'unsafe-inline'`

### 5. Rotina
- Rodar os **Security Advisors** do Supabase (Dashboard → Advisors) a cada mudança de schema
- Revisar PRs do Dependabot semanalmente

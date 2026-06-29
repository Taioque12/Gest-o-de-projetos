# 📋 Plano Detalhado: Transformação em SaaS Multi-Tenant

**Objetivo:** Transformar a plataforma de gestão de projetos em um SaaS escalável onde cada empresa (CNPJ) tem seus próprios dados isolados e seguros.

**Abordagem:** Tenant ID + Row Level Security (RLS) com 1 banco de dados compartilhado.

---

## 🎯 Fase 1: Estrutura de Dados (Banco de Dados)

### 1.1 Criar tabela `empresas`

```sql
CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT UNIQUE NOT NULL,
  nome_empresa TEXT NOT NULL,
  nome_responsavel TEXT,
  email_responsavel TEXT,
  telefone TEXT,
  plano TEXT DEFAULT 'free', -- free | pro | enterprise
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMPTZ DEFAULT now(),
  data_cancelamento TIMESTAMPTZ,
  limite_projetos INTEGER DEFAULT 3,
  limite_funcionarios INTEGER DEFAULT 10,
  limite_habilidades INTEGER DEFAULT 5
);
```

**Índices:**
```sql
CREATE UNIQUE INDEX idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX idx_empresas_ativo ON empresas(ativo);
```

---

### 1.2 Criar tabela `usuarios_empresa`

Liga usuários do auth.users à empresa:

```sql
CREATE TABLE usuarios_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  perfil TEXT NOT NULL CHECK (perfil IN ('admin', 'equipe', 'cliente')),
  ativo BOOLEAN DEFAULT true,
  data_convite TIMESTAMPTZ DEFAULT now(),
  data_aceite TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(auth_user_id, empresa_id)
);

CREATE INDEX idx_usuarios_empresa_auth_user ON usuarios_empresa(auth_user_id);
CREATE INDEX idx_usuarios_empresa_empresa ON usuarios_empresa(empresa_id);
```

---

### 1.3 Adicionar `empresa_id` nas tabelas existentes

Todas essas tabelas ganham a coluna `empresa_id`:

```sql
-- Projetos
ALTER TABLE projetos ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE projetos ADD CONSTRAINT projetos_empresa_fk UNIQUE(empresa_id, os);
CREATE INDEX idx_projetos_empresa ON projetos(empresa_id);

-- Funcionários
ALTER TABLE funcionarios ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX idx_funcionarios_empresa ON funcionarios(empresa_id);

-- Habilidades
ALTER TABLE habilidades ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX idx_habilidades_empresa_nome ON habilidades(empresa_id, nome) WHERE ativo = true;
CREATE INDEX idx_habilidades_empresa ON habilidades(empresa_id);

-- Avaliacoes de habilidades (já faz referência a funcionario_id, que já referencia empresa)
-- (tabela fica igual, herança por FK)

-- Programacao_semanal
ALTER TABLE programacao_semanal ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX idx_programacao_empresa ON programacao_semanal(empresa_id);

-- Efetivo_semanal
ALTER TABLE efetivo_semanal ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX idx_efetivo_empresa ON efetivo_semanal(empresa_id);

-- Acessos_cliente (se existir)
ALTER TABLE acessos_cliente ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX idx_acessos_empresa ON acessos_cliente(empresa_id);

-- Uploads_xml
ALTER TABLE uploads_xml ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX idx_uploads_empresa ON uploads_xml(empresa_id);
```

---

## 🔐 Fase 2: Row Level Security (RLS)

### 2.1 Função auxiliar para pegar empresa_id do usuário

```sql
CREATE OR REPLACE FUNCTION get_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM usuarios_empresa 
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL STABLE;
```

### 2.2 Políticas de RLS para cada tabela

**Empresas** — usuário vê só sua empresa:
```sql
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresas_users_see_own" ON empresas
FOR SELECT TO authenticated
USING (id = get_empresa_id());

CREATE POLICY "empresas_admin_update" ON empresas
FOR UPDATE TO authenticated
USING (
  id = get_empresa_id() AND 
  EXISTS(SELECT 1 FROM usuarios_empresa 
         WHERE empresa_id = empresas.id AND auth_user_id = auth.uid() AND perfil = 'admin')
);
```

**Usuários da empresa** — vê colegas:
```sql
ALTER TABLE usuarios_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_empresa_see_colleagues" ON usuarios_empresa
FOR SELECT TO authenticated
USING (empresa_id = get_empresa_id());

CREATE POLICY "usuarios_empresa_admin_manage" ON usuarios_empresa
FOR ALL TO authenticated
USING (
  empresa_id = get_empresa_id() AND 
  EXISTS(SELECT 1 FROM usuarios_empresa u2 
         WHERE u2.auth_user_id = auth.uid() AND u2.empresa_id = usuarios_empresa.empresa_id AND u2.perfil = 'admin')
);
```

**Projetos** — isolado por empresa:
```sql
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projetos_see_own_company" ON projetos
FOR SELECT TO authenticated
USING (empresa_id = get_empresa_id());

CREATE POLICY "projetos_admin_equipe_modify" ON projetos
FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = get_empresa_id() AND 
  EXISTS(SELECT 1 FROM usuarios_empresa 
         WHERE empresa_id = projetos.empresa_id AND auth_user_id = auth.uid() 
         AND perfil IN ('admin', 'equipe'))
);

CREATE POLICY "projetos_update" ON projetos
FOR UPDATE TO authenticated
USING (empresa_id = get_empresa_id())
WITH CHECK (empresa_id = get_empresa_id());

CREATE POLICY "projetos_delete_admin" ON projetos
FOR DELETE TO authenticated
USING (
  empresa_id = get_empresa_id() AND 
  EXISTS(SELECT 1 FROM usuarios_empresa 
         WHERE empresa_id = projetos.empresa_id AND auth_user_id = auth.uid() AND perfil = 'admin')
);
```

**Funcionários** — mesma lógica:
```sql
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funcionarios_see_own_company" ON funcionarios
FOR SELECT TO authenticated
USING (empresa_id = get_empresa_id());

CREATE POLICY "funcionarios_admin_equipe_modify" ON funcionarios
FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = get_empresa_id() AND 
  EXISTS(SELECT 1 FROM usuarios_empresa 
         WHERE empresa_id = funcionarios.empresa_id AND auth_user_id = auth.uid() 
         AND perfil IN ('admin', 'equipe'))
);

CREATE POLICY "funcionarios_update" ON funcionarios
FOR UPDATE TO authenticated
USING (empresa_id = get_empresa_id())
WITH CHECK (empresa_id = get_empresa_id());

CREATE POLICY "funcionarios_delete_admin" ON funcionarios
FOR DELETE TO authenticated
USING (
  empresa_id = get_empresa_id() AND 
  EXISTS(SELECT 1 FROM usuarios_empresa 
         WHERE empresa_id = funcionarios.empresa_id AND auth_user_id = auth.uid() AND perfil = 'admin')
);
```

**Habilidades** — por empresa:
```sql
ALTER TABLE habilidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habilidades_see_own_company" ON habilidades
FOR SELECT TO authenticated
USING (empresa_id = get_empresa_id() AND ativo = true);

CREATE POLICY "habilidades_admin_manage" ON habilidades
FOR ALL TO authenticated
USING (
  empresa_id = get_empresa_id() AND 
  EXISTS(SELECT 1 FROM usuarios_empresa 
         WHERE empresa_id = habilidades.empresa_id AND auth_user_id = auth.uid() AND perfil = 'admin')
);
```

**Tabelas restantes** (programacao_semanal, efetivo_semanal, etc):
```sql
-- Aplicar o mesmo padrão para cada tabela que tem empresa_id
ALTER TABLE [tabela] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "[tabela]_see_own_company" ON [tabela]
FOR SELECT TO authenticated
USING (empresa_id = get_empresa_id());

CREATE POLICY "[tabela]_modify_own_company" ON [tabela]
FOR INSERT TO authenticated
WITH CHECK (empresa_id = get_empresa_id());

CREATE POLICY "[tabela]_update_own_company" ON [tabela]
FOR UPDATE TO authenticated
USING (empresa_id = get_empresa_id())
WITH CHECK (empresa_id = get_empresa_id());

CREATE POLICY "[tabela]_delete_admin" ON [tabela]
FOR DELETE TO authenticated
USING (
  empresa_id = get_empresa_id() AND 
  EXISTS(SELECT 1 FROM usuarios_empresa 
         WHERE empresa_id = [tabela].empresa_id AND auth_user_id = auth.uid() AND perfil = 'admin')
);
```

---

## 🔑 Fase 3: Autenticação e Fluxo de Usuário

### 3.1 Fluxo de Login

```
1. Usuário faz login com email/senha (auth.users)
   ↓
2. Frontend detecta auth.user_id
   ↓
3. Frontend consulta usuarios_empresa para esse user_id
   ↓
4. Se empresa_id encontrado:
   - Salva empresa_id no localStorage ou context
   - Redireciona para Dashboard
   ↓
5. Se NÃO encontrado:
   - Mostrar tela "Você ainda não foi adicionado a nenhuma empresa"
   - Ou redirecionar para convite de empresa
```

### 3.2 Fluxo de Criação de Empresa (Onboarding)

```
1. Novo usuário preenche:
   - Nome empresa
   - CNPJ
   - Nome responsável
   - Email responsável
   - Plano desejado (free/pro/enterprise)

2. Backend:
   - Cria registro em empresas
   - Cria registro em usuarios_empresa (auth_user_id → empresa_id, perfil='admin')
   - Retorna empresa_id

3. Frontend:
   - Salva empresa_id
   - Redireciona para Dashboard
```

### 3.3 Fluxo de Convite de Usuário (Admin convida equipe)

```
1. Admin clica "Convidar usuário"
   → Preenche email + perfil (admin/equipe/cliente)

2. Backend:
   - Procura ou cria auth.users com esse email
   - Cria/atualiza record em usuarios_empresa (ativo=false, data_aceite=null)
   - Envia email com link de aceite

3. Novo usuário:
   - Clica no link → aceita convite
   - Define senha (ou usa link mágico)
   - data_aceite = now()
   - ativo = true

4. Próximo login:
   - Já encontra usuarios_empresa
   - Pode acessar a empresa
```

---

## 💻 Fase 4: Mudanças no Frontend

### 4.1 Novo Hook: `useEmpresa()`

```javascript
// frontend/src/hooks/useEmpresa.js
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useEmpresa() {
  const [empresa, setEmpresa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    async function fetchEmpresa() {
      setLoading(true)
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (userErr || !user) throw new Error('Não autenticado')
        
        setUsuario(user)

        // Pega a empresa do usuário
        const { data, error } = await supabase
          .from('usuarios_empresa')
          .select('empresa_id, empresas(*)')
          .eq('auth_user_id', user.id)
          .single()

        if (error) throw new Error('Usuário não tem empresa associada')
        
        setEmpresa(data.empresas)
        localStorage.setItem('empresa_id', data.empresas.id)
      } catch (err) {
        console.error(err)
        setEmpresa(null)
      }
      setLoading(false)
    }

    fetchEmpresa()
  }, [])

  return { empresa, usuario, loading }
}
```

### 4.2 Atualizar todos os hooks (useFuncionarios, useProjetos, etc)

**Antes:**
```javascript
const { data, error } = await supabase
  .from('funcionarios')
  .select('*')
```

**Depois:**
```javascript
const { data, error } = await supabase
  .from('funcionarios')
  .select('*')
  .eq('empresa_id', empresaId)  // ← Adicionar filtro explícito
```

> **Nota:** RLS já filtra automaticamente, mas é boa prática filtrar também no cliente.

### 4.3 Atualizar Login (src/pages/Login.jsx)

```javascript
async function handleLogin(email, senha) {
  // 1. Login normal
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, senha })
  if (signInErr) throw signInErr

  // 2. Procura usuarios_empresa
  const { data, error } = await supabase
    .from('usuarios_empresa')
    .select('empresa_id')
    .eq('auth_user_id', user.id)
    .single()

  if (error) {
    // Usuário não tem empresa
    return onChangeView('onboarding-empresa')
  }

  // 3. Salva e redireciona
  localStorage.setItem('empresa_id', data.empresa_id)
  onChangeView('dashboard')
}
```

### 4.4 Nova página: Onboarding de Empresa

```javascript
// frontend/src/pages/OnboardingEmpresa.jsx
// Formulário para criar empresa (CNPJ, nome, etc)
```

### 4.5 Atualizar componentes que criam dados

Quando criar projeto/funcionário/habilidade, adicionar `empresa_id`:

```javascript
async function criarProjeto(dados) {
  const empresaId = localStorage.getItem('empresa_id')
  
  const { error } = await supabase
    .from('projetos')
    .insert({
      ...dados,
      empresa_id: empresaId  // ← Sempre adicionar
    })
  
  if (error) throw error
}
```

---

## 🔄 Fase 5: Migração de Dados Existentes

Para a empresa atual (antes de multi-tenant):

```sql
-- 1. Criar empresa padrão para dados existentes
INSERT INTO empresas (cnpj, nome_empresa, nome_responsavel, email_responsavel, plano)
VALUES ('00.000.000/0000-00', 'MA CONEGLIAN (Legado)', 'Admin', 'admin@maconeglia.com', 'pro')
RETURNING id AS empresa_id;

-- 2. Vincular usuário atual como admin
INSERT INTO usuarios_empresa (auth_user_id, empresa_id, perfil)
SELECT auth.uid(), 'UUID_DA_EMPRESA_ACIMA', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM usuarios_empresa WHERE auth_user_id = auth.uid());

-- 3. Atualizar todas as tabelas existentes com empresa_id
UPDATE projetos SET empresa_id = 'UUID_DA_EMPRESA_ACIMA' WHERE empresa_id IS NULL;
UPDATE funcionarios SET empresa_id = 'UUID_DA_EMPRESA_ACIMA' WHERE empresa_id IS NULL;
UPDATE habilidades SET empresa_id = 'UUID_DA_EMPRESA_ACIMA' WHERE empresa_id IS NULL;
-- ... repetir para todas as tabelas
```

---

## 🧪 Fase 6: Testes

### Testes de RLS
```javascript
// Testar que usuário A NÃO vê dados de empresa B

// 1. Login como user_a (empresa_a)
// 2. Buscar projetos → deve retornar só projeto_a
// 3. Tentar acessar projeto_b diretamente na query → deve retornar vazio (RLS bloqueia)

// 4. Login como user_b (empresa_b)
// 5. Tentar atualizar projeto_a → deve falhar (RLS bloqueia)
```

### Testes de Planos
```javascript
// Testar limites por plano

// Empresa free: tentar criar 4º projeto → deve falhar (limite 3)
// Empresa pro: criar 50º funcionário → deve falhar (limite 50)
```

---

## 📊 Fase 7: Ficar de Olho (Observabilidade)

```sql
-- View para monitorar uso por empresa
CREATE VIEW uso_por_empresa AS
SELECT 
  e.id,
  e.nome_empresa,
  e.plano,
  (SELECT COUNT(*) FROM projetos WHERE empresa_id = e.id) as num_projetos,
  (SELECT COUNT(*) FROM funcionarios WHERE empresa_id = e.id) as num_funcionarios,
  (SELECT COUNT(*) FROM usuarios_empresa WHERE empresa_id = e.id) as num_usuarios
FROM empresas e;
```

---

## 💰 Fase 8: Implementar Limites de Plano

```javascript
// Hook para validar limite
async function validarLimitePlano(empresaId, recurso) {
  // 1. Pega a empresa
  const { data: empresa } = await supabase
    .from('empresas')
    .select('plano, limite_projetos, limite_funcionarios')
    .eq('id', empresaId)
    .single()

  // 2. Conta recursos atuais
  if (recurso === 'projetos') {
    const { count } = await supabase
      .from('projetos')
      .select('id', { count: 'exact' })
      .eq('empresa_id', empresaId)

    if (count >= empresa.limite_projetos) {
      throw new Error(`Limite de projetos atingido (${empresa.plano})`)
    }
  }
  // ... repetir para outros recursos
}
```

---

## 🚀 Fase 9: Deploy

1. Executar migrações SQL no Supabase
2. Deploy do frontend (nova lógica de empresa_id)
3. Testar onboarding de nova empresa
4. Testar isolamento de dados (RLS)
5. Migrar dados existentes
6. Avisar cliente atual sobre novo acesso

---

## 🛠️ Fase 10: Painel do Operador (Super-Admin)

Painel administrativo **separado do app dos clientes**, para você operar o SaaS.
Reaproveita a base já pronta: view `uso_por_empresa`, tabela `empresas`
(com `plano`, `ativo`, limites) e acesso global via `service_role`.

### 10.1 Gestão de clientes
- Listar todas as empresas (CNPJ, plano, data de cadastro, ativo/inativo)
- Ver uso vs limite por empresa (consumir `uso_por_empresa`)
- Ativar / suspender empresa manualmente
- Alterar plano de um cliente (free → pro → enterprise)

### 10.2 Pagamentos
- Status de pagamento por cliente (em dia / atrasado / cancelado)
- Histórico de cobranças
- Integração com Mercado Pago (webhook ativa/suspende automático)

### 10.3 Status de operação
- Nº de empresas ativas e MRR (receita recorrente mensal)
- Empresas perto do limite (oportunidade de upgrade)
- Saúde do sistema (erros, uploads falhando)

### 10.4 Estrutura técnica a criar
- Role/flag de **super-admin** (operador) que enxerga todas as empresas
- Área/rota separada no app, restrita ao super-admin
- Tabelas novas: `assinaturas`, `pagamentos`
- Ordem sugerida: validar beta → Mercado Pago + `assinaturas` → painel consumindo tudo

### 💰 Custos de operação (referência)
Arquitetura multi-tenant compartilhada → custo marginal por cliente ~zero.

| Item | Plano | Custo/mês aprox. |
|------|-------|------------------|
| Supabase | Free (validação) | R$ 0 |
| Supabase | Pro (produção) | ~R$ 135 (US$ 25) |
| Vercel | Hobby | R$ 0 |
| Vercel | Pro | ~R$ 108 (US$ 20) |
| Gemini API | pay-as-you-go | ~R$ 0–30 |

- **Enxuto (free tier):** ~R$ 0/mês
- **Profissional (Pro):** ~R$ 250/mês fixo, aguenta dezenas a centenas de clientes
- Custo cresce com: storage de anexos, uso do Gemini, banda

---

## 📋 Checklist de Implementação

- [ ] Fase 1: Criar tabelas `empresas` e `usuarios_empresa`
- [ ] Fase 1: Adicionar `empresa_id` em todas as tabelas
- [ ] Fase 2: Implementar RLS em todas as tabelas
- [ ] Fase 3: Criar função `get_empresa_id()`
- [ ] Fase 4: Criar `useEmpresa()` hook
- [ ] Fase 4: Atualizar `useFuncionarios`, `useProjetos`, etc
- [ ] Fase 4: Criar página Onboarding de Empresa
- [ ] Fase 4: Atualizar Login.jsx
- [ ] Fase 5: Migrar dados existentes
- [ ] Fase 6: Testar RLS
- [ ] Fase 6: Testar isolamento
- [ ] Fase 7: Criar view de monitoramento
- [ ] Fase 8: Implementar validação de limites por plano
- [ ] Fase 9: Deploy
- [ ] Fase 10: Painel do operador (gestão de clientes, pagamentos, status)

---

## 🎯 Resultado Final

✅ Múltiplas empresas no mesmo banco  
✅ Cada empresa completamente isolada  
✅ Segurança garantida por RLS do Supabase  
✅ Escalável para N empresas  
✅ Pronto para cobrar por plano  
✅ Onboarding automático de novos clientes  

---

**Próximo passo:** Você quer que eu comece pela Fase 1 (criar tabelas no Supabase)?

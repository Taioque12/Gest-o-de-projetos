# Roadmap: Dashboard Online MA CONEGLIAN

## Status Atual ✅

| Entrega | Status | Local |
|---|---|---|
| **Dashboard offline** (HTML + dados fictícios) | ✅ Pronto | `index.html` |
| **Identidade visual** (verde MA CONEGLIAN) | ✅ Aplicada | Header + cores |
| **Campos adicionais** (Resp., Valor, Prazo, Data-fim) | ✅ Incluídos | Cards + Modal |
| **Curva S por projeto** (semanal, duração própria) | ✅ Implementada | Modal de cada projeto |

---

## Fase 2: Sistema Online — Sua ação (HOJE)

### 📋 Checklist — Você executa esses passos

**Arquivo:** `SETUP-SUPABASE.md` (nesta pasta)

```
1. Criar conta no Supabase (gratuita)
   └─ Estimar: 5 min
   
2. Executar SQL do schema
   └─ Copiar `schema-supabase.sql` → SQL Editor do Supabase → Run
   └─ Estimar: 5 min
   
3. Habilitar Email provider
   └─ Supabase Auth → Providers → Email (ativar)
   └─ Estimar: 2 min
   
4. Copiar credenciais (Project URL + anon key)
   └─ Salvar em local seguro
   └─ Estimar: 2 min
   
5. Criar usuário admin para teste
   └─ Authentication → Users → Add user
   └─ Email: gestor@maconeglia.com
   └─ Salvar senha
   └─ Estimar: 2 min
```

**⏱️ Tempo total: ~16 min**

---

## Fase 3: Frontend React — Eu monto (depende da Fase 2)

Quando você confirmar que terminou a Fase 2, eu vou criar:

✅ **App.jsx** — componente raiz com roteamento (Login → Dashboard)
✅ **Login.jsx** — tela de autenticação (email/senha via Supabase Auth)
✅ **Dashboard.jsx** — painel com:
   - KPIs (Projetos, Valor, Avanço, Desvio)
   - Curva S do portfólio (média ponderada por valor)
   - Grid de projetos com filtros (🟢 Verde / 🟡 Amarelo / 🔴 Vermelho)
   - Mapa de alocação de equipes
   - Modal drill-down (clique no card → detalhes + Curva S individual)

✅ **UploadXML.jsx** — upload de exportação MS Project (.xml)
   - Parser automático
   - Atualiza avanço_previsto e avanço_realizado no banco

✅ **CurvaS.jsx** — componente React para gráficos (SVG dinâmico)

✅ **supabase.js** — configuração do cliente Supabase

✅ **package.json** + **vite.config.js** — dependências e build

---

## Fase 4: Deploy na Vercel — Hospedagem (gratuita)

Quando o frontend estiver pronto:

1. Conectar repo GitHub
2. Vercel detecta vite.config.js
3. Deploy automático
4. URL pública: `https://gestao-projetos-xxxx.vercel.app`

**Tempo:** <5 min, totalmente automático

---

## Fase 5: Configuração de Acessos

Uma vez tudo online:

1. **Criar usuários** (equipe + clientes)
   - Admin: você (gestor)
   - Equipe: Carlos, Patrícia, Rafael
   - Clientes: Petroquímica, Logística Sul, etc.

2. **Controlar acessos**
   - Clientes veem SOMENTE seus projetos (via tabela `acessos_cliente`)
   - Equipe vê todos (por default)
   - Admin vê + controla tudo

---

## 📊 Resumo de Arquivos

Na pasta `Gestão de projetos`, você vai ter:

```
├── index.html                    ← Dashboard offline (atual)
├── schema-supabase.sql           ← Estrutura do banco (Fase 2)
├── SETUP-SUPABASE.md             ← Instruções Supabase (seu guia)
├── ROADMAP.md                    ← Este arquivo
├── frontend-README.md            ← Setup local do React
├── frontend/                      ← Pasta React (Fase 3+)
│   ├── package.json
│   ├── .env.local
│   ├── vite.config.js
│   ├── src/App.jsx
│   ├── src/pages/Login.jsx
│   ├── src/pages/Dashboard.jsx
│   ├── src/pages/UploadXML.jsx
│   ├── src/components/CurvaS.jsx
│   ├── src/components/ProjectCard.jsx
│   ├── src/supabase.js
│   └── public/index.html
```

---

## 🚀 Próximo Passo?

**Você:** Execute os passos em `SETUP-SUPABASE.md` e me mande um print ou confirmação quando terminar.

**Eu:** Assim que confirmar, gero todo o frontend React e instruções de deploy.

Pode começar? 👊

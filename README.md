# MA CONEGLIAN · Gestão de Projetos

Sistema integrado de **planejamento, acompanhamento e controle** de projetos de engenharia elétrica industrial.

**Engenharia Elétrica** · instalações, infraestrutura, SPDA, iluminação, SDAI, automação e comissionamento.

---

## 📋 Status do Projeto

| Fase | Status | Descrição |
|---|---|---|
| **1 — Dashboard Offline** | ✅ Concluída | HTML + dados fictícios, validação de layout |
| **2 — Setup Supabase** | 🔄 Em andamento | Você executa SETUP-SUPABASE.md |
| **3 — Frontend React** | ⏳ Bloqueado | Aguarda conclusão da Fase 2 |
| **4 — Deploy Vercel** | ⏳ Bloqueado | Após Fase 3 |
| **5 — Controle de Acessos** | ⏳ Bloqueado | Após Fase 4 |

---

## 🚀 Quick Start

### Versão Offline (Validação)
Abra `index.html` com duplo-clique no navegador.
- ✅ Dashboard completa com 6 projetos fictícios
- ✅ Curva S semanal por projeto
- ✅ Filtros por criticidade (🟢 🟡 🔴)
- ✅ Mapa de alocação de equipes
- ✅ Exportar PDF

### Setup Online (Fase 2)
Siga as instruções em **[SETUP-SUPABASE.md](SETUP-SUPABASE.md)** (16 minutos).

1. Criar conta Supabase (gratuita)
2. Executar schema SQL
3. Copiar credenciais
4. Criar usuário admin de teste

---

## 📁 Estrutura de Arquivos

```
Gestão de projetos/
│
├── 📄 README.md                    ← Este arquivo
├── 📄 ROADMAP.md                   ← Visão das 5 fases
├── 📄 .gitignore                   ← Configuração Git
│
├── 🌐 index.html                   ← Dashboard offline (atual)
│
├── 🗄️  Backend
│   ├── schema-supabase.sql         ← Estrutura do banco (PostgreSQL)
│   └── SETUP-SUPABASE.md           ← Guia de configuração
│
├── 🎨 Frontend (em andamento)
│   ├── frontend-README.md          ← Setup React
│   └── frontend/                   ← Pasta React (em breve)
│       ├── package.json
│       ├── vite.config.js
│       ├── .env.local              ← Suas credenciais Supabase
│       ├── src/
│       │   ├── App.jsx
│       │   ├── supabase.js
│       │   ├── pages/
│       │   │   ├── Login.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   └── UploadXML.jsx
│       │   └── components/
│       │       ├── CurvaS.jsx
│       │       ├── ProjectCard.jsx
│       │       └── AlocacaoTable.jsx
│       └── public/index.html
│
└── 📊 Backup
    ├── GitHub (este repo)
    └── Google Drive (pasta compartilhada)
```

---

## 🎯 Funcionalidades

### Versão Offline (v1)
- ✅ Dashboard com KPIs (projetos, valor, avanço, desvio)
- ✅ Curva S do portfólio (média ponderada por valor)
- ✅ Cards de projeto (nome, cliente, OS, responsável, valor, prazo, data-fim)
- ✅ Filtros de criticidade (🟢 🟡 🔴)
- ✅ Modal drill-down (Curva S individual + frentes de serviço)
- ✅ Mapa de alocação de equipes com sinalização de gargalos
- ✅ Exportar PDF

### Versão Online (v2 — em breve)
- 🔄 Login com email/senha (Supabase Auth)
- 🔄 3 perfis de acesso: admin / equipe / cliente
- 🔄 Banco de dados real (PostgreSQL + Supabase)
- 🔄 Upload de exportação XML do MS Project
- 🔄 Atualizações semanais de avanço físico
- 🔄 Controle de acesso por projeto (clientes veem seus projetos)
- 🔄 Hospedagem online (Vercel + Supabase)

---

## 👥 Perfis de Acesso

| Perfil | Acesso | Ações |
|---|---|---|
| **Admin** | Todos os projetos | Ver, editar, criar usuários, configurar acessos |
| **Equipe** | Todos os projetos | Ver, atualizar avanço, fazer upload XML |
| **Cliente** | Apenas seus projetos | Ver status, Curva S e frentes de serviço (leitura) |

---

## 📊 Critério de Criticidade

O sistema classifica desvios de avanço físico automaticamente:

| Cor | Desvio | Postura | Ação |
|---|---|---|---|
| 🟢 Verde | até −5% | Dentro da tolerância | Manter ritmo |
| 🟡 Amarelo | −5% a −10% | Atenção | Plano de recuperação |
| 🔴 Vermelho | acima de −10% | Crítico | Ação imediata e escalonamento |

---

## 📈 Curva S

A Curva S é calculada com base em:
- **Eixo X:** Tempo (semanal na Fase 2)
- **Eixo Y:** Avanço físico (0–100%)
- **Linha tracejada:** Previsto (linha de base)
- **Linha sólida:** Realizado (execução)

### Dashboard Portfólio
- Média ponderada por valor de contrato
- Eixo de calendário mensal
- Sincroniza com todos os projetos

### Modal do Projeto
- Duração própria (1,5 a 8 meses)
- Resolução semanal
- Atualizado a cada semana

---

## 🛠️ Tech Stack

| Camada | Tecnologia | Propósito |
|---|---|---|
| **Frontend (v1)** | HTML 5 + CSS 3 + JavaScript Vanilla | Dashboard offline |
| **Frontend (v2)** | React 18 + Vite | App reativa com estado |
| **Backend** | Supabase (PostgreSQL + Auth) | Banco de dados + autenticação |
| **Hospedagem** | Vercel | Deploy gratuito + CDN |
| **Parser** | JavaScript / Node.js | Lê XML do MS Project |

---

## 📝 Próximos Passos

### Você (Fase 2 — HOJE)
1. Abra [SETUP-SUPABASE.md](SETUP-SUPABASE.md)
2. Siga os 5 passos (16 min total)
3. Me mande screenshot/confirmação quando terminar

### Eu (Fase 3 — próxima sessão)
1. Gero todo o frontend React
2. Crio instrução de deploy Vercel
3. Você faz `vercel` e pronto

### Final (Fase 4+)
- ✨ Sistema online com login
- ✨ Múltiplos usuários
- ✨ Upload de XML do MS Project
- ✨ Banco de dados real
- ✨ Acesso controlado por perfil

---

## 📞 Suporte

- **Dúvidas sobre Supabase?** → Veja [SETUP-SUPABASE.md](SETUP-SUPABASE.md)
- **Dúvidas sobre React?** → Veja [frontend-README.md](frontend-README.md)
- **Visão geral?** → Veja [ROADMAP.md](ROADMAP.md)
- **Dashboard offline** → Abra `index.html`

---

## 📅 Histórico

| Data | Evento | Versão |
|---|---|---|
| 21/06/2026 | Dashboard offline criada (dados fictícios) | 1.0 |
| 21/06/2026 | Schema Supabase + documentação | 1.0 |
| (em breve) | Frontend React + Deploy Vercel | 2.0 |

---

**MA CONEGLIAN · Gestão de Projetos de Engenharia Elétrica**

Desenvolvido com ❤️ por Claude Code + usuário

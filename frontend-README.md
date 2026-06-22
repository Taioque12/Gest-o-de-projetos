# Frontend MA CONEGLIAN Dashboard — Setup Vercel

## Estrutura do Projeto

```
frontend/
├── package.json
├── .env.local (SUPABASE_URL e SUPABASE_ANON_KEY)
├── public/
│   └── index.html
├── src/
│   ├── App.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   └── UploadXML.jsx
│   ├── components/
│   │   ├── CurvaS.jsx
│   │   ├── ProjectCard.jsx
│   │   └── AlocacaoTable.jsx
│   └── supabase.js
└── vite.config.js
```

## Setup Local (para você testar antes de colocar online)

### 1. Requisitos
- Node.js 16+ instalado
- npm ou yarn

### 2. Clonar/copiar a pasta do frontend
```bash
cd "C:\Users\MAC ENGENHARIA\Documents\Gestão de projetos"
mkdir frontend
cd frontend
```

### 3. Criar package.json
```bash
npm init -y
npm install react react-dom @supabase/supabase-js axios
npm install --save-dev vite @vitejs/plugin-react
```

### 4. Criar arquivo .env.local
Na pasta `frontend/`, crie um arquivo `.env.local`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
(Substitua pelos valores que você copiou do Supabase)

### 5. Rodar localmente
```bash
npm run dev
```
Acesse em http://localhost:5173

### 6. Deploy na Vercel (gratuito)
```bash
npm install -g vercel
vercel
```
Siga as instruções. Ao final, Vercel vai te dar um domínio tipo:
`https://gestao-projetos-xxxx.vercel.app`

---

## Instruções de build estão nos arquivos React que vou criar agora.

Você vai receber em breve:
- ✅ `package.json` (dependências)
- ✅ `src/App.jsx` (componente raiz)
- ✅ `src/pages/Dashboard.jsx` (painel principal)
- ✅ `src/pages/Login.jsx` (autenticação)
- ✅ `src/components/CurvaS.jsx` (gráfico)
- ✅ `vite.config.js` (configuração)

Depois de confirmar o setup do Supabase, me avisa que eu gero esses arquivos!

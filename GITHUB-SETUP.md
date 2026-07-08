# GitHub Setup — Gestão de Projetos

## Passo 1: Criar repositório no GitHub (3 min)

1. Acesse https://github.com/new
2. Preencha:
   - **Repository name:** `gestao-projetos` (ou seu nome preferido)
   - **Description:** "Sistema de gestão de projetos de engenharia elétrica"
   - **Visibility:** Private (privado — recomendado para dados da empresa)
   - **Initialize this repository with:** deixe tudo vazio (já temos local)
3. Clique em **"Create repository"**

---

## Passo 2: Conectar repositório local ao GitHub

Na pasta `Gestão de projetos`, execute no PowerShell ou Git Bash:

```bash
# Verificar que está tudo commitado
git status

# Adicionar o remoto (substitua USERNAME e REPO-NAME)
git remote add origin https://github.com/USERNAME/gestao-projetos.git

# Fazer o push inicial (primeira vez pede autenticação)
git branch -M main
git push -u origin main
```

**Ao fazer `git push`, GitHub pede autenticação:**
- Use seu **email do GitHub** + **Personal Access Token** (PAT)
  - Gere PAT em: https://github.com/settings/tokens
  - Escopo mínimo: `repo` + `workflow`
  - Cole como senha

---

## Passo 3: Configurar `.gitignore` (já feito ✅)

O arquivo `.gitignore` já está configurado para:
- Não fazer upload de `node_modules/`
- Não fazer upload de `.env.local` (suas credenciais Supabase)
- Não fazer upload de arquivos de sistema (`.DS_Store`, etc)

---

## Passo 4: Verificar no GitHub

1. Acesse sua URL: `https://github.com/SEU-USERNAME/gestao-projetos`
2. Você deve ver:
   - ✅ Todos os arquivos (README.md, schema-supabase.sql, index.html, etc)
   - ✅ Commit inicial com a data de hoje
   - ✅ Badge: "7 commits" (ou similar)

---

## ✅ Checklist

- [ ] Repositório criado no GitHub (privado)
- [ ] Local remoto adicionado (`git remote add origin ...`)
- [ ] Push inicial feito (`git push -u origin main`)
- [ ] Arquivos visíveis no GitHub

---

## Próximas atualizações

Cada vez que você (ou eu) fazermos mudanças, basta:

```bash
git add .
git commit -m "descrição da mudança"
git push
```

E pronto — tudo sincronizado no GitHub! 🎉

---

## Dica: Proteger `.env.local`

Quando você gerar o arquivo `.env.local` com as credenciais Supabase:
1. **NUNCA** faça commit dessa arquivo
2. Ele está em `.gitignore` — seguro!
3. Compartilhe as credenciais SOMENTE via WhatsApp/Slack privado, nunca pelo Git

# Setup Supabase — MA CONEGLIAN Dashboard Online

## Passo 1: Criar conta Supabase (5 min)

1. Acesse https://supabase.com
2. Clique em **"Start your project"** → Sign up com Google ou email
3. Criar projeto → escolha:
   - **Organization name:** MA CONEGLIAN
   - **Project name:** gestao-projetos
   - **Region:** São Paulo (sa-east-1) — mais próximo
   - **Password:** salve em local seguro
4. Aguarde o projeto inicializar (~2 min)

---

## Passo 2: Criar o schema do banco (5 min)

1. No Supabase, vá para **SQL Editor** (menu esquerdo)
2. Clique em **"+ New Query"**
3. Copie todo o conteúdo do arquivo `schema-supabase.sql` (desta pasta)
4. Cole no editor do Supabase
5. Clique em **"Run"** (canto superior direito)
6. Aguarde a execução — deve confirmar sem erros

✅ Se vir "Success" — o banco está pronto!

---

## Passo 3: Habilitar autenticação por Email

1. No Supabase, vá para **Authentication** → **Providers**
2. Ative **Email** (debe estar verde)
3. Vá para **Email Templates** e deixe os padrões (já vêm bons)

---

## Passo 4: Copiar suas credenciais de conexão

1. Vá para **Project Settings** (canto inferior esquerdo)
2. Clique em **API**
3. Você verá:
   - **Project URL** → copie (vai parecer com `https://xxxxx.supabase.co`)
   - **anon key** → copie (chave pública, segura para usar no frontend)

4. Salve num arquivo seguro (você vai precisar no frontend):
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## Passo 5: Criar um usuário admin para teste

1. Vá para **Authentication** → **Users**
2. Clique em **"+ Add user"**
3. Email: `gestor@maconeglia.com`
4. Senha: defina uma senha (salve em local seguro)
5. Clique em **"Create user"**

Esse será o primeiro login que você vai testar.

---

## ✅ Checklist de conclusão

- [ ] Conta Supabase criada
- [ ] Schema SQL executado sem erros
- [ ] Email provider habilitado
- [ ] Project URL e anon key copiados
- [ ] Usuário admin criado e testado

**Depois de confirmar tudo isso, nos próximos passos:**
1. Vou montar o frontend React com login
2. Vou hospedar na Vercel (gratuito)
3. Vou configurar o parser de XML do MS Project

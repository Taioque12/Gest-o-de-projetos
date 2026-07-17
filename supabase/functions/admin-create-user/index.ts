import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://gest-o-de-projetos-eoum.vercel.app,https://gest-o-de-projetos-eight.vercel.app,https://frontend-beta-navy-63.vercel.app')
    .split(',').map(o => o.trim()).filter(Boolean)
)

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.has(origin) || origin.startsWith('http://localhost:');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Rate limit genérico (tabela rate_limit_acoes): no máx N chamadas por
// janela de tempo por usuário+ação — evita spam de criação de usuários.
// Check-and-increment atômico via RPC (evita corrida sob concorrência).
async function checarRateLimit(admin: ReturnType<typeof createClient>, userId: string, acao: string, janelaMs: number, maxChamadas: number) {
  const { data, error } = await admin.rpc('incrementar_rate_limit_acao', {
    p_user_id: userId, p_acao: acao, p_janela_ms: janelaMs, p_max: maxChamadas,
  })
  if (error) return false
  return data === true
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })

  try {
    // Verifica que o caller é admin
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json(req, { error: 'Não autenticado' }, 401)

    const { data: perf } = await userClient.from('usuarios').select('perfil').eq('id', user.id).maybeSingle()
    if (perf?.perfil !== 'admin') return json(req, { error: 'Sem permissão' }, 403)

    // Cria usuário com service role
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { email, senha, nome, perfil, funcao, data_nascimento } = await req.json()
    if (!email || !senha) return json(req, { error: 'E-mail e senha são obrigatórios' }, 400)

    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return json(req, { error: 'E-mail inválido.' }, 400)

    // Política de senha: mínimo 10 caracteres com letra e número
    if (typeof senha !== 'string' || senha.length < 10)
      return json(req, { error: 'Senha deve ter no mínimo 10 caracteres.' }, 400)
    if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha))
      return json(req, { error: 'Senha deve conter letras e números.' }, 400)

    if (perfil && !['admin', 'equipe', 'cliente'].includes(perfil))
      return json(req, { error: 'Perfil inválido.' }, 400)

    for (const [campo, valor] of Object.entries({ nome, funcao })) {
      if (valor != null && (typeof valor !== 'string' || valor.length > 200))
        return json(req, { error: `Campo "${campo}" inválido.` }, 400)
    }
    if (data_nascimento != null && (typeof data_nascimento !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento)))
      return json(req, { error: 'Data de nascimento inválida.' }, 400)

    const liberado = await checarRateLimit(admin, user.id, 'admin-create-user', 60_000, 5)
    if (!liberado) return json(req, { error: 'Muitos convites em pouco tempo. Aguarde um minuto e tente de novo.' }, 429)

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })
    if (createErr) {
      console.error('admin-create-user createUser:', createErr.message)
      const msg = /already.*registered|already.*exists/i.test(createErr.message)
        ? 'E-mail já cadastrado.'
        : 'Não foi possível criar o usuário.'
      return json(req, { error: msg }, 400)
    }

    const { error: insertErr } = await admin.from('usuarios').upsert({
      id: created.user.id,
      email,
      nome: nome ?? null,
      perfil: perfil ?? 'equipe',
      funcao: funcao ?? null,
      data_nascimento: data_nascimento ?? null,
    })
    if (insertErr) {
      console.error('admin-create-user insert usuarios:', insertErr.message)
      return json(req, { error: 'Usuário criado no Auth, mas falhou ao salvar o perfil. Contate o suporte.' }, 500)
    }

    return json(req, { id: created.user.id }, 200)
  } catch (err) {
    console.error('admin-create-user:', err)
    return json(req, { error: 'Erro interno ao criar usuário.' }, 500)
  }
})

function json(req: Request, body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

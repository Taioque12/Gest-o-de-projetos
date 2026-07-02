import { createClient } from 'jsr:@supabase/supabase-js@2'

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = origin.endsWith('.vercel.app') || origin.startsWith('http://localhost:');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Rate limit genérico (tabela rate_limit_acoes): no máx N chamadas por
// janela de tempo por usuário+ação — evita spam de criação de usuários.
async function checarRateLimit(admin: ReturnType<typeof createClient>, userId: string, acao: string, janelaMs: number, maxChamadas: number) {
  const { data: row } = await admin
    .from('rate_limit_acoes')
    .select('janela_inicio, chamadas')
    .eq('user_id', userId)
    .eq('acao', acao)
    .maybeSingle()

  const agora = Date.now()
  if (!row || agora - new Date(row.janela_inicio).getTime() > janelaMs) {
    await admin.from('rate_limit_acoes')
      .upsert({ user_id: userId, acao, janela_inicio: new Date().toISOString(), chamadas: 1 })
    return true
  }
  if (row.chamadas >= maxChamadas) return false

  await admin.from('rate_limit_acoes')
    .update({ chamadas: row.chamadas + 1 })
    .eq('user_id', userId)
    .eq('acao', acao)
  return true
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

    // Política de senha: mínimo 10 caracteres com letra e número
    if (typeof senha !== 'string' || senha.length < 10)
      return json(req, { error: 'Senha deve ter no mínimo 10 caracteres.' }, 400)
    if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha))
      return json(req, { error: 'Senha deve conter letras e números.' }, 400)

    if (perfil && !['admin', 'equipe', 'cliente'].includes(perfil))
      return json(req, { error: 'Perfil inválido.' }, 400)

    const liberado = await checarRateLimit(admin, user.id, 'admin-create-user', 60_000, 5)
    if (!liberado) return json(req, { error: 'Muitos convites em pouco tempo. Aguarde um minuto e tente de novo.' }, 429)

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })
    if (createErr) return json(req, { error: createErr.message }, 400)

    const { error: insertErr } = await admin.from('usuarios').upsert({
      id: created.user.id,
      email,
      nome: nome ?? null,
      perfil: perfil ?? 'equipe',
      funcao: funcao ?? null,
      data_nascimento: data_nascimento ?? null,
    })
    if (insertErr) return json(req, { error: insertErr.message }, 500)

    return json(req, { id: created.user.id }, 200)
  } catch (err) {
    return json(req, { error: String(err) }, 500)
  }
})

function json(req: Request, body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

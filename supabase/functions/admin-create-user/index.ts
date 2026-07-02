import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://frontend-beta-navy-63.vercel.app',
  Deno.env.get('FRONTEND_URL') || '',
].filter(Boolean)

function getCorsOrigin(reqOrigin: string | null) {
  if (reqOrigin && ALLOWED_ORIGINS.includes(reqOrigin)) return reqOrigin
  return ALLOWED_ORIGINS[0]
}

function getCorsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(req.headers.get('Origin')),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
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
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Verifica que o caller é admin da empresa
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Não autenticado' }, 401)

    const { email, senha, nome, perfil, empresa_id } = await req.json()
    if (!email || !senha || !empresa_id) return json({ error: 'email, senha e empresa_id são obrigatórios' }, 400)

    // Verifica que o caller é admin desta empresa
    const { data: ue } = await userClient
      .from('usuarios_empresa')
      .select('perfil')
      .eq('auth_user_id', user.id)
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)
      .maybeSingle()
    if (ue?.perfil !== 'admin') return json({ error: 'Sem permissão' }, 403)

    // Cria usuário com service role
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const liberado = await checarRateLimit(admin, user.id, 'admin-create-user', 60_000, 5)
    if (!liberado) return json({ error: 'Muitos convites em pouco tempo. Aguarde um minuto e tente de novo.' }, 429)

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })
    if (createErr) return json({ error: createErr.message }, 400)

    const { error: insertErr } = await admin.from('usuarios_empresa').insert({
      auth_user_id: created.user.id,
      empresa_id,
      perfil:      perfil ?? 'equipe',
      nome:        nome ?? null,
      email,
      ativo:       true,
      data_aceite: new Date().toISOString(),
    })
    if (insertErr) return json({ error: insertErr.message }, 500)

    return json({ id: created.user.id }, 200)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(new Request('http://localhost')), 'Content-Type': 'application/json' },
  })
}

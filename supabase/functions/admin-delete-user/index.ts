import { createClient } from 'jsr:@supabase/supabase-js@2'

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = origin.endsWith('.vercel.app') || origin.startsWith('http://localhost:');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

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

    const { id } = await req.json()
    if (!id) return json(req, { error: 'ID do usuário é obrigatório' }, 400)
    if (id === user.id) return json(req, { error: 'Você não pode remover a si mesmo.' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const liberado = await checarRateLimit(admin, user.id, 'admin-delete-user', 60_000, 10)
    if (!liberado) return json(req, { error: 'Muitas remoções em pouco tempo. Aguarde um minuto e tente de novo.' }, 429)

    // Se for o único admin, bloqueia — sistema não pode ficar sem admin
    const { data: alvo } = await admin.from('usuarios').select('perfil').eq('id', id).maybeSingle()
    if (alvo?.perfil === 'admin') {
      const { count } = await admin.from('usuarios').select('id', { count: 'exact', head: true }).eq('perfil', 'admin')
      if ((count ?? 0) <= 1) return json(req, { error: 'Não é possível remover o único admin do sistema.' }, 400)
    }

    // acessos_cliente cai em cascata (FK on delete cascade)
    const { error: delUsuarioErr } = await admin.from('usuarios').delete().eq('id', id)
    if (delUsuarioErr) return json(req, { error: delUsuarioErr.message }, 500)

    const { error: delAuthErr } = await admin.auth.admin.deleteUser(id)
    if (delAuthErr) return json(req, { error: delAuthErr.message }, 500)

    return json(req, { ok: true }, 200)
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

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    const { id } = await req.json()
    if (!id || typeof id !== 'string' || !UUID_RE.test(id)) return json(req, { error: 'ID do usuário inválido.' }, 400)
    if (id === user.id) return json(req, { error: 'Você não pode remover a si mesmo.' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const liberado = await checarRateLimit(admin, user.id, 'admin-delete-user', 60_000, 10)
    if (!liberado) return json(req, { error: 'Muitas remoções em pouco tempo. Aguarde um minuto e tente de novo.' }, 429)

    // Se for o único admin, bloqueia — sistema não pode ficar sem admin.
    // pode_remover_usuario() faz o check com lock (FOR UPDATE), atômico
    // contra remoções concorrentes.
    const { data: pode, error: podeErr } = await admin.rpc('pode_remover_usuario', { p_id: id })
    if (podeErr) {
      console.error('admin-delete-user pode_remover_usuario:', podeErr.message)
      return json(req, { error: 'Erro interno ao validar remoção.' }, 500)
    }
    if (!pode) return json(req, { error: 'Não é possível remover o único admin do sistema.' }, 400)

    // Alguns usuários da base (seed inicial) foram inseridos direto na tabela
    // usuarios, sem conta correspondente no Auth — deleteUser retornaria
    // "User not found" nesses casos. Isso não deve bloquear a remoção do
    // perfil, então o erro do Auth é tolerado; só a falha em `usuarios` é fatal.
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(id)
    if (delAuthErr && !/not.*found/i.test(delAuthErr.message)) {
      console.error('admin-delete-user deleteUser:', delAuthErr.message)
      return json(req, { error: 'Não foi possível remover a conta de autenticação.' }, 500)
    }

    // acessos_cliente cai em cascata (FK on delete cascade)
    const { error: delUsuarioErr } = await admin.from('usuarios').delete().eq('id', id)
    if (delUsuarioErr) {
      console.error('admin-delete-user delete usuarios:', delUsuarioErr.message)
      return json(req, { error: 'Não foi possível remover o perfil do usuário.' }, 500)
    }

    return json(req, { ok: true }, 200)
  } catch (err) {
    console.error('admin-delete-user:', err)
    return json(req, { error: 'Erro interno ao remover usuário.' }, 500)
  }
})

function json(req: Request, body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

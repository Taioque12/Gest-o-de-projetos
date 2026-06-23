import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Verifica que o caller é admin
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Não autenticado' }, 401)

    const { data: perf } = await userClient.from('usuarios').select('perfil').eq('id', user.id).maybeSingle()
    if (perf?.perfil !== 'admin') return json({ error: 'Sem permissão' }, 403)

    // Cria usuário com service role
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { email, senha, nome, perfil, funcao, data_nascimento } = await req.json()
    if (!email || !senha) return json({ error: 'E-mail e senha são obrigatórios' }, 400)

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })
    if (createErr) return json({ error: createErr.message }, 400)

    const { error: insertErr } = await admin.from('usuarios').upsert({
      id: created.user.id,
      email,
      nome: nome ?? null,
      perfil: perfil ?? 'equipe',
      funcao: funcao ?? null,
      data_nascimento: data_nascimento ?? null,
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
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

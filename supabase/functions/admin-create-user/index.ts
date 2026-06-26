import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
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
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

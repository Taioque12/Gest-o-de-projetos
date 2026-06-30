// Painel do operador (super-admin): lista empresas com uso/plano/status,
// pagamentos recentes e permite ativar/suspender ou trocar plano.
// Acesso cross-empresa só acontece aqui, via service_role — nunca direto
// do client (RLS normal bloqueia qualquer tabela por empresa_id).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function ehSuperAdmin(req: Request) {
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return null

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: ue } = await admin
    .from('usuarios_empresa')
    .select('super_admin')
    .eq('auth_user_id', user.id)
    .eq('ativo', true)
    .maybeSingle()

  return ue?.super_admin ? admin : null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const admin = await ehSuperAdmin(req)
  if (!admin) return json({ error: 'Acesso restrito ao operador do SaaS.' }, 403)

  try {
    const { action, empresa_id, dados } = await req.json().catch(() => ({ action: 'listar' }))

    if (action === 'listar') {
      const { data: empresas, error: e1 } = await admin
        .from('empresas')
        .select('*')
        .order('data_criacao', { ascending: false })
      if (e1) throw e1

      const ids = empresas.map(e => e.id)
      const [{ data: projetos }, { data: funcionarios }, { data: usuarios }, { data: pagamentos }, { data: assinaturas }] = await Promise.all([
        admin.from('projetos').select('id, empresa_id'),
        admin.from('funcionarios').select('id, empresa_id'),
        admin.from('usuarios_empresa').select('id, empresa_id').eq('ativo', true),
        admin.from('pagamentos').select('*').in('empresa_id', ids).order('criado_em', { ascending: false }).limit(50),
        admin.from('assinaturas').select('*').in('empresa_id', ids),
      ])

      const contar = (lista: any[], id: string) => (lista ?? []).filter(x => x.empresa_id === id).length

      const empresasComUso = empresas.map(e => ({
        ...e,
        num_projetos: contar(projetos, e.id),
        num_funcionarios: contar(funcionarios, e.id),
        num_usuarios: contar(usuarios, e.id),
        assinatura: (assinaturas ?? []).find(a => a.empresa_id === e.id) ?? null,
      }))

      return json({
        empresas: empresasComUso,
        pagamentos: pagamentos ?? [],
        resumo: {
          total_empresas: empresas.length,
          empresas_ativas: empresas.filter(e => e.ativo).length,
          por_plano: {
            free: empresas.filter(e => e.plano === 'free').length,
            pro: empresas.filter(e => e.plano === 'pro').length,
            enterprise: empresas.filter(e => e.plano === 'enterprise').length,
          },
        },
      }, 200)
    }

    if (action === 'atualizar_empresa') {
      if (!empresa_id) return json({ error: 'empresa_id é obrigatório' }, 400)
      const update: Record<string, unknown> = {}
      if (dados?.ativo !== undefined) update.ativo = !!dados.ativo
      if (dados?.plano && ['free', 'pro', 'enterprise'].includes(dados.plano)) update.plano = dados.plano
      if (Object.keys(update).length === 0) return json({ error: 'Nada para atualizar' }, 400)

      const { error } = await admin.from('empresas').update(update).eq('id', empresa_id)
      if (error) throw error
      return json({ ok: true }, 200)
    }

    return json({ error: 'Ação desconhecida' }, 400)
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

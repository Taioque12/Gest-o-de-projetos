// Edge Function: mp-criar-assinatura
// Gera o link de checkout do Mercado Pago para o cliente assinar um plano.
// Suporta cartão (assinatura recorrente via Preapproval) e PIX (cobrança avulsa).
//
// Secrets necessários (supabase secrets set):
//   MP_ACCESS_TOKEN  — Access Token do MP (TEST-... ou APP_USR-...)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const PLANOS: Record<string, { nome: string; valor: number }> = {
  pro:        { nome: 'Plano Pro', valor: 497 },
  enterprise: { nome: 'Plano Enterprise', valor: 1497 },
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    // Verifica autenticação
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Não autenticado' }, 401)

    // Verifica que é admin da empresa
    const { data: ue } = await userClient
      .from('usuarios_empresa')
      .select('perfil, empresa_id')
      .eq('auth_user_id', user.id)
      .eq('ativo', true)
      .maybeSingle()
    if (ue?.perfil !== 'admin') return json({ error: 'Sem permissão' }, 403)

    const empresaId: string = ue.empresa_id
    const { plano, metodo } = await req.json()

    if (!PLANOS[plano]) return json({ error: 'Plano inválido' }, 400)
    if (!['cartao', 'pix'].includes(metodo)) return json({ error: 'Método inválido' }, 400)

    const mpToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpToken) return json({ error: 'MP_ACCESS_TOKEN não configurado' }, 500)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let checkoutUrl: string

    if (metodo === 'cartao') {
      checkoutUrl = await criarAssinaturaCartao(empresaId, plano, mpToken, admin)
    } else {
      checkoutUrl = await criarCobrancaPix(empresaId, plano, mpToken, admin)
    }

    return json({ url: checkoutUrl }, 200)
  } catch (err) {
    console.error('[mp-criar-assinatura] erro:', err)
    return json({ error: String(err) }, 500)
  }
})

// ─────────────────────────────────────────────────────────────
// Cria assinatura recorrente no cartão (Preapproval do MP)
// ─────────────────────────────────────────────────────────────
async function criarAssinaturaCartao(
  empresaId: string, plano: string, mpToken: string,
  admin: ReturnType<typeof createClient>
): Promise<string> {
  const info = PLANOS[plano]

  const body = {
    reason:             info.nome,
    external_reference: empresaId,
    auto_recurring: {
      frequency:          1,
      frequency_type:     'months',
      transaction_amount: info.valor,
      currency_id:        'BRL',
    },
    back_url: Deno.env.get('FRONTEND_URL') ?? 'https://frontend-beta-navy-63.vercel.app',
  }

  const resp = await fetch('https://api.mercadopago.com/preapproval', {
    method:  'POST',
    headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.json()
    throw new Error(`MP Preapproval erro: ${JSON.stringify(err)}`)
  }
  const mp = await resp.json()

  // Grava assinatura pendente no banco
  await admin.from('assinaturas').insert({
    empresa_id:        empresaId,
    mp_preapproval_id: mp.id,
    plano,
    metodo:            'cartao',
    status:            'pending',
    valor:             info.valor,
  })

  return mp.init_point
}

// ─────────────────────────────────────────────────────────────
// Cria cobrança avulsa PIX (Preference do MP)
// ─────────────────────────────────────────────────────────────
async function criarCobrancaPix(
  empresaId: string, plano: string, mpToken: string,
  admin: ReturnType<typeof createClient>
): Promise<string> {
  const info = PLANOS[plano]

  const body = {
    items: [{
      title:      info.nome,
      quantity:   1,
      unit_price: info.valor,
      currency_id: 'BRL',
    }],
    payment_methods: {
      excluded_payment_types: [
        { id: 'credit_card' }, { id: 'debit_card' },
        { id: 'ticket' },
      ],
    },
    external_reference: empresaId,
    back_urls: {
      success: `${Deno.env.get('FRONTEND_URL') ?? 'https://frontend-beta-navy-63.vercel.app'}?pagamento=ok`,
      failure: `${Deno.env.get('FRONTEND_URL') ?? 'https://frontend-beta-navy-63.vercel.app'}?pagamento=erro`,
    },
    auto_return: 'approved',
  }

  const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method:  'POST',
    headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.json()
    throw new Error(`MP Preference erro: ${JSON.stringify(err)}`)
  }
  const mp = await resp.json()

  // Grava pagamento pendente no banco
  await admin.from('pagamentos').insert({
    empresa_id:    empresaId,
    mp_payment_id: mp.id,
    plano,
    metodo:        'pix',
    valor:         info.valor,
    status:        'pending',
  })

  // Link de sandbox (sandbox_init_point) ou produção (init_point)
  return mpToken.startsWith('TEST-') ? mp.sandbox_init_point : mp.init_point
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

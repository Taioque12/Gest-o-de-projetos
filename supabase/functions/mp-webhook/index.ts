// Edge Function: mp-webhook
// Recebe notificações do Mercado Pago, confirma via API, e
// ativa/suspende a empresa conforme o status do pagamento.
//
// URL pra configurar no MP: https://<projeto>.supabase.co/functions/v1/mp-webhook
// Secrets necessários (supabase secrets set):
//   MP_ACCESS_TOKEN  — Access Token do MP (TEST-... ou APP_USR-...)
//   MP_WEBHOOK_SECRET — secret do MP pra validar assinatura (opcional mas recomendado)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const PLANO_VALORES: Record<string, number> = { pro: 497, enterprise: 1497 }

Deno.serve(async (req: Request) => {
  // MP envia GET pra validar a URL na configuração
  if (req.method === 'GET') {
    return new Response('ok', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { type, data } = body

    // MP notifica payments e preapprovals (assinaturas recorrentes)
    if (!['payment', 'preapproval', 'subscription_preapproval'].includes(type)) {
      return new Response('ignored', { status: 200 })
    }

    const mpToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpToken) throw new Error('MP_ACCESS_TOKEN não configurado')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (type === 'payment') {
      await processarPagamento(data.id, mpToken, admin)
    } else {
      await processarAssinatura(data.id, mpToken, admin)
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[mp-webhook] erro:', err)
    // Sempre retorna 200 pro MP — senão ele reenvia em loop
    return new Response('ok', { status: 200 })
  }
})

// ─────────────────────────────────────────────────────────────
// Processa pagamento avulso (PIX ou cobrança recorrente de cartão)
// ─────────────────────────────────────────────────────────────
async function processarPagamento(mpPaymentId: string, mpToken: string, admin: ReturnType<typeof createClient>) {
  // Busca detalhes do pagamento no MP
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
    headers: { Authorization: `Bearer ${mpToken}` },
  })
  if (!resp.ok) throw new Error(`MP API erro ${resp.status}`)
  const mp = await resp.json()

  // empresa_id vem no external_reference que gravamos no momento da criação
  const empresaId: string = mp.external_reference
  if (!empresaId) { console.warn('Pagamento sem external_reference, ignorando'); return }

  const status: string = mp.status // approved | pending | rejected | refunded

  // Grava/atualiza em pagamentos
  const { error: pgErr } = await admin.from('pagamentos').upsert({
    empresa_id:    empresaId,
    mp_payment_id: String(mpPaymentId),
    metodo:        mp.payment_type_id === 'pix' ? 'pix' : 'cartao',
    valor:         mp.transaction_amount,
    status,
    pago_em:       status === 'approved' ? new Date().toISOString() : null,
  }, { onConflict: 'mp_payment_id' })
  if (pgErr) throw pgErr

  // Ativa ou suspende a empresa
  await atualizarEmpresa(empresaId, status, admin)
}

// ─────────────────────────────────────────────────────────────
// Processa mudança de status em assinatura recorrente (cartão)
// ─────────────────────────────────────────────────────────────
async function processarAssinatura(mpPreapprovalId: string, mpToken: string, admin: ReturnType<typeof createClient>) {
  const resp = await fetch(`https://api.mercadopago.com/preapproval/${mpPreapprovalId}`, {
    headers: { Authorization: `Bearer ${mpToken}` },
  })
  if (!resp.ok) throw new Error(`MP API erro ${resp.status}`)
  const mp = await resp.json()

  const empresaId: string = mp.external_reference
  if (!empresaId) { console.warn('Preapproval sem external_reference, ignorando'); return }

  // Mapeia status do MP → status interno
  // authorized = ativa | paused/cancelled = suspende
  const statusMp: string = mp.status

  const { error: assnErr } = await admin.from('assinaturas').upsert({
    empresa_id:        empresaId,
    mp_preapproval_id: String(mpPreapprovalId),
    plano:             mp.reason ?? 'pro',
    metodo:            'cartao',
    status:            statusMp,
    valor:             mp.auto_recurring?.transaction_amount ?? 0,
    proxima_cobranca:  mp.next_payment_date?.slice(0, 10) ?? null,
    atualizado_em:     new Date().toISOString(),
  }, { onConflict: 'mp_preapproval_id' })
  if (assnErr) throw assnErr

  const statusPagamento = statusMp === 'authorized' ? 'approved' : 'rejected'
  await atualizarEmpresa(empresaId, statusPagamento, admin)
}

// ─────────────────────────────────────────────────────────────
// Ativa ou suspende empresa conforme status do pagamento
// ─────────────────────────────────────────────────────────────
async function atualizarEmpresa(empresaId: string, statusPagamento: string, admin: ReturnType<typeof createClient>) {
  if (statusPagamento === 'approved') {
    // Busca plano da assinatura ativa pra saber o que ativar
    const { data: assinatura } = await admin
      .from('assinaturas')
      .select('plano')
      .eq('empresa_id', empresaId)
      .eq('status', 'authorized')
      .order('criado_em', { ascending: false })
      .maybeSingle()

    const plano = assinatura?.plano ?? 'pro'
    await admin.from('empresas').update({ ativo: true, plano }).eq('id', empresaId)
    console.info(`[mp-webhook] Empresa ${empresaId} ATIVADA (plano=${plano})`)
  } else if (['rejected', 'cancelled', 'refunded'].includes(statusPagamento)) {
    // Rebaixa pra free mas não desativa (empresa continua acessando com limite menor)
    await admin.from('empresas').update({ plano: 'free' }).eq('id', empresaId)
    console.info(`[mp-webhook] Empresa ${empresaId} rebaixada para free`)
  }
}

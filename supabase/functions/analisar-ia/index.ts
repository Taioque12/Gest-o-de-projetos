// Proxy server-side pra Gemini: mantém a API key fora do bundle do frontend.
// Só usuários autenticados (qualquer perfil) podem chamar. Autenticação
// verificada manualmente abaixo (deploy com --no-verify-jwt pra evitar
// rejeição no gateway antes de chegar aqui).
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

const GEMINI_KEY   = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`

// Rate limit: no máx 3 chamadas por janela de 60s por usuário (1 análise
// completa = 2 chamadas — diagnóstico + plano de ação — então 3 dá folga
// pra 1 análise + 1 reanálise rápida, mas bloqueia clique em loop).
const JANELA_MS    = 60_000
const MAX_CHAMADAS = 3

async function checarRateLimit(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: row } = await admin
    .from('rate_limit_analise_ia')
    .select('janela_inicio, chamadas')
    .eq('user_id', userId)
    .maybeSingle()

  const agora = Date.now()
  if (!row || agora - new Date(row.janela_inicio).getTime() > JANELA_MS) {
    await admin.from('rate_limit_analise_ia')
      .upsert({ user_id: userId, janela_inicio: new Date().toISOString(), chamadas: 1 })
    return true
  }
  if (row.chamadas >= MAX_CHAMADAS) return false

  await admin.from('rate_limit_analise_ia')
    .update({ chamadas: row.chamadas + 1 })
    .eq('user_id', userId)
  return true
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Não autenticado' }, 401)

    if (!GEMINI_KEY) return json({ error: 'GEMINI_API_KEY não configurada no servidor (secrets da função).' }, 500)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const liberado = await checarRateLimit(admin, user.id)
    if (!liberado) return json({ error: 'Muitas análises em pouco tempo. Aguarde um minuto e tente de novo.' }, 429)

    const { prompt, maxTokens } = await req.json()
    if (!prompt || typeof prompt !== 'string') return json({ error: 'prompt é obrigatório' }, 400)

    const resp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens ?? 6000, temperature: 0.2 },
      }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      return json({ error: err.error?.message ?? `Erro ${resp.status} ao consultar Gemini` }, 502)
    }
    const data = await resp.json()
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta.'
    return json({ texto }, 200)
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

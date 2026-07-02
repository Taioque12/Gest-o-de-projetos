// Proxy server-side pra Gemini: mantém a API key fora do bundle do frontend.
// Só usuários autenticados (qualquer perfil) podem chamar. Autenticação
// verificada manualmente abaixo (deploy com --no-verify-jwt pra evitar
// rejeição no gateway antes de chegar aqui).
import { createClient } from 'jsr:@supabase/supabase-js@2'

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = origin.endsWith('.vercel.app') || origin.startsWith('http://localhost:');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

const GEMINI_KEY   = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`

const JANELA_MS    = 60_000
const MAX_CHAMADAS = 3
const MAX_TAREFAS = 150;

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

function classificarTarefas(tarefas: any[], hoje: string) {
  const naoIniciadas = tarefas.filter(t => t.previsto === 0);
  const emAndamento  = tarefas.filter(t => t.previsto > 0 && t.previsto < 100 && !(t.fim && t.fim < hoje));
  const concluidas   = tarefas.filter(t => t.previsto === 100);
  const atrasadas    = tarefas.filter(t => t.fim && t.fim < hoje && t.previsto < 100);
  return { naoIniciadas, emAndamento, concluidas, atrasadas };
}

function priorizarTarefas(tarefas: any[], hoje: string, max: number) {
  const { naoIniciadas, emAndamento, concluidas, atrasadas } = classificarTarefas(tarefas, hoje);
  return [...atrasadas, ...emAndamento, ...naoIniciadas, ...concluidas].slice(0, max);
}

function buildDados(projeto: any, tarefas: any[]) {
  const hoje = new Date().toISOString().slice(0, 10);
  const diasRestantes = projeto.fim
    ? Math.round((new Date(projeto.fim).getTime() - new Date(hoje).getTime()) / 86400000)
    : null;
  const diasTotais = projeto.inicio && projeto.fim
    ? Math.round((new Date(projeto.fim).getTime() - new Date(projeto.inicio).getTime()) / 86400000)
    : null;
  const diasDecorridos = projeto.inicio
    ? Math.round((new Date(hoje).getTime() - new Date(projeto.inicio).getTime()) / 86400000)
    : null;
  const avancoPrevistoProporcional = diasTotais && diasDecorridos
    ? Math.min(100, Math.round((diasDecorridos / diasTotais) * 100))
    : null;
  const desvioTemporal = avancoPrevistoProporcional !== null
    ? (projeto.prev - avancoPrevistoProporcional).toFixed(1)
    : null;
  const { naoIniciadas, emAndamento, concluidas, atrasadas } = classificarTarefas(tarefas, hoje);
  const linhasTarefas = priorizarTarefas(tarefas, hoje, MAX_TAREFAS).map(t => {
    const status = t.previsto === 100 ? '✓' : t.fim && t.fim < hoje && t.previsto < 100 ? '⚠' : t.previsto > 0 ? '▶' : '○';
    return `${status} ${t.nome}: ${t.previsto}% ${t.inicio}→${t.fim}`;
  }).join('\n');
  return { hoje, diasRestantes, diasTotais, diasDecorridos, avancoPrevistoProporcional, desvioTemporal, naoIniciadas, emAndamento, concluidas, atrasadas, linhasTarefas };
}

function buildPromptParte1(projeto: any, tarefas: any[]) {
  const { hoje, diasRestantes, diasTotais, diasDecorridos, avancoPrevistoProporcional, desvioTemporal, naoIniciadas, emAndamento, concluidas, atrasadas, linhasTarefas } = buildDados(projeto, tarefas);
  return `Você é um engenheiro sênior de planejamento e controle de projetos (PCP), especialista em engenharia elétrica industrial. Analise RAPIDAMENTE (conciso mas completo) o cronograma do projeto. Baseie-se APENAS nos dados fornecidos — não invente.

DADOS DO PROJETO
Nome: ${projeto.nome || '(não informado)'}
Data de término: ${projeto.fim || '(não informada)'}
Avanço atual: ${projeto.prev}% | Esperado: ${avancoPrevistoProporcional ?? 'N/D'}% | Desvio: ${desvioTemporal ?? 'N/D'} p.p.
Tarefas: ${concluidas.length} concluídas, ${emAndamento.length} em andamento, ${atrasadas.length} atrasadas

CRONOGRAMA
${linhasTarefas}
${tarefas.length > MAX_TAREFAS ? `(+ ${tarefas.length - MAX_TAREFAS} tarefas omitidas — priorizadas atrasadas e em andamento)` : ''}

INSTRUÇÕES — PARTE 1 (DIAGNÓSTICO RÁPIDO)

### 🔴🟡🟢 Veredito Executivo
Uma frase: (CRÍTICO / ATENÇÃO / CONTROLADO) + desvio + risco ao prazo.

### 📐 EVM Essencial
- SPI (avanço real ÷ esperado): estime
- Dias de atraso estimados se ritmo mantido
- Data de término estimada

### ⚠️ Tarefas Críticas (máx 5)
Para cada uma: nome, status, impacto em dias, causa provável

### 🔧 Disciplinas em Risco
Quais disciplinas (elétrica, automação, etc) estão comprometendo o prazo?

### 📊 Painel de Indicadores
| Indicador | Valor | Status |
| Avanço atual | ${projeto.prev}% | - |
| SPI estimado | (calcule) | - |
| Tarefas atrasadas | ${atrasadas.length}/${tarefas.length} | - |
| Risco ao prazo | Baixo/Médio/Alto/Crítico | - |

Complete com 🟢 / 🟡 / 🔴

IMPORTANTE: Seja técnico, direto e baseado nos dados. Cite nomes reais de tarefas.`;
}

function buildPromptParte2(projeto: any, tarefas: any[]) {
  const { hoje, diasRestantes, diasTotais, diasDecorridos, avancoPrevistoProporcional, desvioTemporal, naoIniciadas, emAndamento, concluidas, atrasadas, linhasTarefas } = buildDados(projeto, tarefas);
  return `Você é um engenheiro sênior PCP em engenharia elétrica industrial. PARTE 2 — PLANO DE AÇÃO DETALHADO baseado no cronograma a seguir.

DADOS RESUMIDOS
Nome: ${projeto.nome || '(não informado)'}
Avanço: ${projeto.prev}% (esperado: ${avancoPrevistoProporcional ?? 'N/D'}% | desvio: ${desvioTemporal ?? 'N/D'} p.p.)
Prazo: ${projeto.fim || '(não informado)'} (${diasRestantes} dias restantes)
Tarefas: ${concluidas.length}✓ / ${emAndamento.length}▶ / ${atrasadas.length}⚠

CRONOGRAMA
${linhasTarefas}

INSTRUÇÕES — PARTE 2 (PLANO DE AÇÃO)

### 🚀 Top 3 Ações Imediatas (Esta Semana)
As 3 ações de maior impacto para HOJE/ESTA SEMANA. Para cada uma:
- **Ação**: objetivo específico (1–2 linhas)
- **Quem**: Gestor / Eng. Campo / Equipe / Escritório
- **Como**: 3–5 passos concretos
- **Meta**: resultado mensurável (ex: ganho de 5% em avanço)

### 🎯 Plano de Ação Corretivo (6–10 ações)
Priorizadas por impacto. Estrutura:
1. **Prioridade**: 🔴 Alta / 🟡 Média / 🟢 Baixa
2. **Ação**: específica, cite tarefas reais do cronograma
3. **Responsável**: Gestor / Eng. / Equipe / Escritório
4. **Prazo**: Imediato / Curto (este mês) / Médio (próximo mês)
5. **Esforço**: Baixo / Médio / Alto
6. **Impacto**: % avanço ou dias recuperados
7. **Indicador de sucesso**: métrica para validar (ex: ✓ Tarefa X em 80%)

### 📅 Cronograma de Recuperação (Se Atrasado)
Próximas 4 semanas — foco e meta de avanço semanal para voltar ao trilho.

### 💡 Recomendações Estratégicas (Médio/Longo Prazo)
2–3 dicas para melhorar gestão de cronograma em projetos similares.

IMPORTANTE: Seja técnico, direto e acionável. Cada ação deve ter responsável, prazo e métrica de sucesso.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })

  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json(req, { error: 'Não autenticado' }, 401)

    if (!GEMINI_KEY) return json(req, { error: 'GEMINI_API_KEY não configurada no servidor (secrets da função).' }, 500)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const liberado = await checarRateLimit(admin, user.id)
    if (!liberado) return json(req, { error: 'Muitas análises em pouco tempo. Aguarde um minuto e tente de novo.' }, 429)

    const { projeto, tarefas, parte, maxTokens } = await req.json()
    if (!projeto || !tarefas || !parte) return json(req, { error: 'projeto, tarefas e parte são obrigatórios' }, 400)

    const prompt = parte === 1 ? buildPromptParte1(projeto, tarefas) : buildPromptParte2(projeto, tarefas);

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
      return json(req, { error: err.error?.message ?? `Erro ${resp.status} ao consultar Gemini` }, 502)
    }
    const data = await resp.json()
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta.'
    return json(req, { texto }, 200)
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

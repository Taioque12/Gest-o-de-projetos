import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Auth Check
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Não autorizado.')

    const { projeto_id } = await req.json()
    if (!projeto_id) throw new Error('projeto_id obrigatório.')

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('Chave Gemini não configurada.')

    // 1. Busca dados do projeto
    const { data: p, error: pErr } = await supabaseClient
      .from('projetos')
      .select('*')
      .eq('id', projeto_id)
      .single()

    if (pErr || !p) throw new Error('Projeto não encontrado.')
    if (p.status === 'Concluído' || p.status === 'Cancelado') {
      return new Response(JSON.stringify({ message: 'Projeto inativo. Risco 0.' }), { headers: corsHeaders })
    }

    // 2. Busca histórico RAG
    const resumoProjeto = `OS ${p.os} | ${p.nome} | Prev: ${p.prev}% | Real: ${p.real}% | Equipes: ${(p.equipes||[]).join(',')}`
    let historicoRisco = ''
    try {
      const embedRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: resumoProjeto }] } })
      })
      if (embedRes.ok) {
        const query_embedding = (await embedRes.json()).embedding?.values
        if (query_embedding) {
          const { data: matches } = await supabaseClient.rpc('match_projetos', { query_embedding, match_threshold: 0.7, match_count: 2 })
          if (matches && matches.length > 0) {
            historicoRisco = matches.map(m => `- ${m.conteudo_texto} | Ação passada: ${m.metadata?.acao_recomendada||'Nenhuma'}`).join('\n')
          }
        }
      }
    } catch(e) { console.error('RAG Error', e) }

    // 3. Pede pro Gemini avaliar o risco
    const hoje = new Date().toISOString().slice(0, 10)
    const prompt = `
    Atue como um analista de risco sênior de projetos de engenharia.
    Analise o projeto atual e gere um score de risco (0 a 100).
    Quanto maior o score, pior a saúde do projeto.
    
    Regras:
    1. Se Realizado < Previsto, o risco sobe.
    2. Se a data final (${p.data_fim}) está próxima de hoje (${hoje}) e o avanço está baixo, o risco sobe muito.
    3. Se houver histórico de projetos similares com ações corretivas graves, o risco sobe.

    Dados do Projeto:
    - OS: ${p.os}
    - Nome: ${p.nome}
    - Início: ${p.data_inicio}
    - Fim: ${p.data_fim}
    - Avanço Previsto: ${p.prev}%
    - Avanço Realizado: ${p.real}%
    
    Projetos Anteriores Similares (AgentDB RAG):
    ${historicoRisco || 'Nenhum histórico parecido encontrado.'}

    Responda APENAS UM JSON no formato:
    { "risk_score": 85, "risk_level": "ALTO" }
    
    risk_level deve ser obrigatoriamente: BAIXO, MEDIO ou ALTO.
    `

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      })
    })

    if (!response.ok) throw new Error('Erro no Gemini.')
    const textOutput = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const parsed = JSON.parse(textOutput)

    // 4. Salva no banco
    const { error: updErr } = await supabaseClient
      .from('projetos')
      .update({ risk_score: parsed.risk_score || 0, risk_level: parsed.risk_level || 'BAIXO' })
      .eq('id', projeto_id)

    if (updErr) throw updErr

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

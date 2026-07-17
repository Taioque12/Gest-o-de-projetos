import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  try {
    const { prompt } = await req.json()
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Prompt inválido ou vazio.')
    }
    
    // Auth Check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Não autorizado.')

    // Rate limit check (using the RPC we already have)
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc('incrementar_rate_limit_ia', { _user_id: user.id })
    if (rpcError) throw new Error('Erro ao checar limite de IA.')
    if (rpcData && rpcData.allow === false) {
      return new Response(JSON.stringify({ erro: 'Limite de IA atingido (5 por minuto).' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('Chave da API não configurada.')

    // Limiting prompt size for security
    const sanitizedPrompt = prompt.substring(0, 1000)
    
    const systemInstruction = `
      Você é um especialista em planejamento de projetos de engenharia e obras.
      O usuário fornecerá uma frase curta sobre um projeto.
      Seu trabalho é gerar a Estrutura Analítica do Projeto (WBS) e retornar **APENAS UM JSON VÁLIDO**, sem nenhum bloco markdown (sem \`\`\`json).
      O JSON deve seguir EXATAMENTE esta estrutura:
      {
        "nome": "Nome formal do projeto gerado (ex: Ampliação Subestação 13,8kV)",
        "escopo": "Um dos seguintes: Instalação, Manutenção, Comissionamento, Estudo/Laudo, Ampliação, Reforma",
        "dias_estimados": 45,
        "frentes": ["Civil", "Elétrica", "Testes", "Projeto"]
      }
      Se a frase do usuário for fora de contexto ou absurda, devolva valores genéricos seguros, mas mantenha o JSON válido.
    `

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: sanitizedPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
          responseMimeType: "application/json"
        }
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini error:', err)
      throw new Error('Falha ao comunicar com LLM.')
    }

    const data = await response.json()
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    let parsed
    try {
      parsed = JSON.parse(textOutput)
    } catch(e) {
      console.error("JSON parse erro:", e, "Retorno cru:", textOutput)
      parsed = { nome: "Projeto Indefinido", escopo: "Instalação", dias_estimados: 30, frentes: ["Geral"] }
    }

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

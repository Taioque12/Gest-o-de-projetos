import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Need admin rights to update all projects
    )
    
    // Auth Check: Somente permite se for chamado pelo Cron Job (via secret / Service Role)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
      throw new Error('Acesso não autorizado ao Scrum Agent.')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('Chave da API Gemini não configurada.')

    // Busca projetos ativos
    const { data: projetos, error: dbError } = await supabaseClient
      .from('projetos')
      .select('id, os, nome, escopo, responsavel, status, inicio, fim, prev, real, valor')
      .not('status', 'in', '("Concluído", "Cancelado")')

    if (dbError) throw dbError
    if (!projetos || projetos.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum projeto ativo para analisar." }), { status: 200 })
    }

    // Prepara dados para a LLM
    const hoje = new Date().toISOString().slice(0, 10)
    const projetosContext = projetos.map(p => {
      let calcAtraso = ""
      if (p.fim && p.fim < hoje) calcAtraso = "ATRASADO"
      const estourou = p.real > p.prev ? "ESTOUROU" : "NO ORÇAMENTO"
      return `OS: ${p.os} | Nome: ${p.nome} | Status: ${p.status} | Prazo: ${p.fim} (${calcAtraso}) | Avanço: ${p.real}/${p.prev} (${estourou})`
    }).join('\n')

    const systemInstruction = `
      Você é um Master Scrum durão e sênior. Seu papel é olhar os dados brutos de projetos ativos e alertar sobre gargalos.
      Hoje é ${hoje}.
      Se o projeto estiver saudável (sem atraso e sem estouro), você responde vazio ou com elogio curto.
      Se o projeto estiver atrasado ou estourado, dê um alerta curto, assertivo e focado em ação para a equipe.
      
      Retorne um JSON OBRIGATÓRIO neste formato:
      [
        { "os": "NUMERO_DA_OS", "alerta_ia": "Seu alerta sarcástico ou gerencial aqui" }
      ]
    `

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: "Analise estes projetos:\n" + projetosContext }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json"
        }
      })
    })

    if (!response.ok) throw new Error('Falha ao comunicar com LLM.')

    const data = await response.json()
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    
    let recomendacoes = []
    try {
      recomendacoes = JSON.parse(textOutput)
    } catch(e) {
      console.error("JSON parse erro:", e)
    }

    // Grava os alertas de volta no banco
    for (const rec of recomendacoes) {
      if (rec.os && rec.alerta_ia) {
        await supabaseClient
          .from('projetos')
          .update({ alerta_ia: rec.alerta_ia })
          .eq('os', rec.os)
      }
    }

    return new Response(JSON.stringify({ success: true, analises: recomendacoes.length }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  try {
    const { projeto_id, conteudo_texto, metadata } = await req.json()
    if (!projeto_id || !conteudo_texto) {
      throw new Error('projeto_id e conteudo_texto são obrigatórios.')
    }
    
    // Auth Check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Não autorizado.')

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('Chave da API não configurada.')
    
    // Generates Embedding using text-embedding-004
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: conteudo_texto.substring(0, 5000) }] } // limite de caracteres por segurança
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini Embedding error:', err)
      throw new Error('Falha ao gerar embedding.')
    }

    const data = await response.json()
    const embedding = data.embedding?.values
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Formato de embedding inválido.')
    }

    // Insert into Supabase projetos_embeddings
    const { error: dbError } = await supabaseClient
      .from('projetos_embeddings')
      .upsert({
        projeto_id,
        conteudo_texto,
        metadata: metadata || {},
        embedding
      }, { onConflict: 'projeto_id' })

    if (dbError) {
      console.error('DB Error:', dbError)
      throw new Error('Erro ao salvar embedding no banco.')
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

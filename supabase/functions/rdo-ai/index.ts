import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header is missing');
    
    // Auth Check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Não autorizado.');

    const { textoTranscrevido } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Você é um assistente de inteligência artificial de um sistema ERP de Construção Civil.
Seu objetivo é transformar um texto falado (transcrito) por um engenheiro em um objeto JSON estrito com os campos para o Relatório Diário de Obra (RDO).
Retorne APENAS um JSON válido. Não inclua \`\`\`json ou explicações.

Formato esperado:
{
  "clima": "String descrevendo o clima (ex: Manhã sol, tarde chuva)",
  "efetivo": "Número inteiro contendo a quantidade de pessoas que trabalharam. Se não houver clareza, deduza ou retorne 0",
  "ocorrencias": "String com um resumo bem redigido e profissional das atividades e ocorrências do dia, arrumando erros da transcrição de fala"
}

Texto transcrito do engenheiro:
"${textoTranscrevido}"
`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // Remove potential markdown code blocks if the model ignores the instruction
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let jsonResult;
    try {
      jsonResult = JSON.parse(responseText);
    } catch (e) {
       // fallback if gemini fails
       jsonResult = {
         clima: "Desconhecido",
         efetivo: 0,
         ocorrencias: textoTranscrevido
       }
    }

    return new Response(JSON.stringify(jsonResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

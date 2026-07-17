import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) throw new Error('imageBase64 is required');

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Você é um assistente OCR avançado de um ERP de Engenharia.
Sua missão é ler a imagem/nota fiscal/cupom enviada e extrair TODOS os itens/produtos comprados, retornando um JSON estrito no formato abaixo.

RETORNE APENAS UM ARRAY JSON VÁLIDO. Sem \`\`\`json, sem textos adicionais.

Formato esperado:
[
  {
    "item": "Nome completo do produto",
    "quantidade": 1.5,
    "unidade": "un",
    "valor_estimado": 150.00
  }
]
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: mimeType || 'image/jpeg'
        }
      }
    ]);
    
    let responseText = result.response.text();
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let jsonResult;
    try {
      jsonResult = JSON.parse(responseText);
      if (!Array.isArray(jsonResult)) jsonResult = [jsonResult];
    } catch (e) {
      throw new Error("Failed to parse Gemini output: " + responseText);
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

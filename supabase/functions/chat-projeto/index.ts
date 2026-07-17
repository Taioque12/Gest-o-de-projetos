import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projeto_id, messages } = await req.json();

    if (!projeto_id || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Faltam parâmetros" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado.");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Token inválido ou expirado.");

    // 1. Busca dados do projeto para dar contexto (somente leitura autorizada pelo RLS)
    const { data: proj, error: projErr } = await supabaseClient
      .from("projetos")
      .select("nome, os, cliente, prev, real, json_ms_project")
      .eq("id", projeto_id)
      .single();

    if (projErr || !proj) {
      throw new Error("Projeto não encontrado ou sem permissão");
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("Chave do Gemini não configurada");

    // 2. Busca embeddings (RAG) se houver uma pergunta do usuário
    const lastMessage = messages[messages.length - 1];
    let ragContext = "";
    
    if (lastMessage && lastMessage.role === "user") {
      try {
        // Gera embedding da pergunta
        const embedRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: lastMessage.text }] }
          })
        });
        
        if (embedRes.ok) {
          const embedData = await embedRes.json();
          const queryEmbedding = embedData.embedding?.values;
          
          if (queryEmbedding) {
            // Busca no AgentDB
            const { data: matches } = await supabaseClient.rpc('match_projetos', {
              query_embedding: queryEmbedding,
              match_threshold: 0.6,
              match_count: 3
            });
            
            if (matches && matches.length > 0) {
              ragContext = "\\n\\nCONHECIMENTO DA BASE (AgentDB):\\n" + matches.map(m => `- ${m.conteudo_texto}`).join('\\n');
            }
          }
        }
      } catch (e) {
        console.error("Erro no RAG:", e);
      }
    }

    // 3. Monta o Prompt de Sistema com o contexto do projeto
    const systemPrompt = `Você é o Copilot de Engenharia (IA) da Construtora.
Seu papel é ajudar o Diretor/Engenheiro a gerenciar a obra baseando-se nos dados reais.
Nome do Projeto: ${proj.nome} (OS: ${proj.os}, Cliente: ${proj.cliente})
Avanço Previsto Atual: ${proj.prev}%
Avanço Realizado Atual: ${proj.real}%
Diferença: ${proj.real - proj.prev}% (Positivo é adiantado, Negativo é atrasado).

Seja muito objetivo, profissional e direto. Use formatação markdown para destacar pontos importantes.
Se perguntarem por cronograma, você pode mencionar que possui os dados da linha de base (se aplicável).${ragContext}`;

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("Chave do Gemini não configurada");

    // Formata o array de mensagens para o Gemini REST API
    const contents = [];
    contents.push({ role: "user", parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Entendido. Como posso ajudar com este projeto hoje?" }] });
    
    for (const m of messages) {
      contents.push({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      });
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Erro Gemini:", errText);
      throw new Error("Falha na comunicação com IA");
    }

    const aiData = await res.json();
    const reply = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

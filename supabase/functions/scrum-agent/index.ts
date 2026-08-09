import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  criarLotesIsoladosPorProjeto,
  executarComConcorrenciaLimitada,
  lerInteiroLimitado,
  validarRecomendacoesDoLote,
} from "./logic.ts";

const LIMITE_PROJETOS_PADRAO = 15;
const LIMITE_PROJETOS_MAXIMO = 25;
const CONCORRENCIA_PADRAO = 3;
const CONCORRENCIA_MAXIMA = 5;
const TIMEOUT_GEMINI_PADRAO_MS = 10_000;
const TIMEOUT_GEMINI_MAXIMO_MS = 15_000;

type RespostaJson = {
  ok: boolean;
  status: number;
  data: unknown;
};

async function fetchJsonComTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<RespostaJson> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data: unknown = await response.json();
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timeoutId);
  }
}

type AtualizacaoSemana = {
  data_atualizacao: string;
  avanco_previsto: number | null;
  avanco_realizado: number | null;
};

type Projeto = {
  id: string;
  os: string;
  nome: string;
  cliente: string;
  escopo: string | null;
  responsavel: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  valor_os: number | null;
  scrum_analisado_em: string | null;
  atualizacoes_semana: AtualizacaoSemana[] | null;
};

serve(async (req) => {
  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey, // Need admin rights to update all projects
    );

    // Auth Check: Somente permite se for chamado pelo Cron Job (via secret / Service Role)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      throw new Error("Acesso não autorizado ao Scrum Agent.");
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Chave da API Gemini não configurada.");

    const limiteProjetos = lerInteiroLimitado(
      Deno.env.get("SCRUM_AGENT_PROJECT_LIMIT"),
      LIMITE_PROJETOS_PADRAO,
      1,
      LIMITE_PROJETOS_MAXIMO,
    );
    const concorrencia = lerInteiroLimitado(
      Deno.env.get("SCRUM_AGENT_CONCURRENCY"),
      CONCORRENCIA_PADRAO,
      1,
      CONCORRENCIA_MAXIMA,
    );
    const timeoutGeminiMs = lerInteiroLimitado(
      Deno.env.get("GEMINI_TIMEOUT_MS"),
      TIMEOUT_GEMINI_PADRAO_MS,
      1_000,
      TIMEOUT_GEMINI_MAXIMO_MS,
    );

    // O schema identifica o locatário por projetos.cliente e guarda o avanço
    // no histórico de atualizacoes_semana.
    const { data: projetosData, error: dbError, count } = await supabaseClient
      .from("projetos")
      .select(
        `
        id, os, nome, cliente, escopo, responsavel,
        data_inicio, data_fim, valor_os, scrum_analisado_em,
        atualizacoes_semana (data_atualizacao, avanco_previsto, avanco_realizado)
      `,
        { count: "exact" },
      )
      .order("scrum_analisado_em", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true })
      .order("data_atualizacao", {
        referencedTable: "atualizacoes_semana",
        ascending: false,
      })
      .limit(1, { referencedTable: "atualizacoes_semana" })
      .limit(limiteProjetos);

    if (dbError) throw dbError;

    const projetos = (projetosData ?? []) as Projeto[];
    const totalProjetos = count ?? projetos.length;
    if (projetos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum projeto para analisar.",
          considerados: 0,
          analises: 0,
          falhas: 0,
          pendentes: totalProjetos,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // O nome textual do cliente não é uma fronteira de segurança estável.
    // Na ausência de tenant_id, cada chamada ao modelo recebe um único projeto.
    const lotesPorProjeto = criarLotesIsoladosPorProjeto(projetos);

    const hoje = new Date().toISOString().slice(0, 10);

    const resultados = await executarComConcorrenciaLimitada(
      lotesPorProjeto,
      concorrencia,
      async ([projeto]) => {
        let resultado = { sucesso: false, alertasAtualizados: 0 };
        let erroAnalise: string | null = null;

        try {
          const ultimaAtualizacao = [...(projeto.atualizacoes_semana ?? [])]
            .sort((a, b) =>
              b.data_atualizacao.localeCompare(a.data_atualizacao)
            )[0];
          const previsto = Number(ultimaAtualizacao?.avanco_previsto ?? 0);
          const realizado = Number(ultimaAtualizacao?.avanco_realizado ?? 0);
          const atraso = projeto.data_fim && projeto.data_fim < hoje
            ? "ATRASADO"
            : "NO PRAZO";
          const orcamento = realizado > previsto
            ? "ACIMA DO PREVISTO"
            : "DENTRO DO PREVISTO";
          const projetoContext =
            `ID: ${projeto.id} | OS: ${projeto.os} | Nome: ${projeto.nome} | Cliente: ${projeto.cliente} | Prazo: ${
              projeto.data_fim ?? "Não informado"
            } (${atraso}) | Avanço: ${realizado}/${previsto} (${orcamento})`;

          const systemInstruction = `
            Você é um Master Scrum sênior. Seu papel é olhar os dados brutos de projetos e alertar sobre gargalos.
            Hoje é ${hoje}.
            Se o projeto estiver saudável (sem atraso e sem desvio), responda com um elogio curto ou não o inclua.
            Se o projeto estiver atrasado ou com desvio, dê um alerta curto, assertivo e focado em ação para a equipe.
            Use somente IDs presentes nos dados recebidos. Não invente projetos nem IDs.

            Retorne um JSON OBRIGATÓRIO neste formato:
            [
              { "projeto_id": "UUID_DO_PROJETO", "alerta_ia": "Seu alerta gerencial aqui" }
            ]
          `;

          const response = await fetchJsonComTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemInstruction }] },
                contents: [{
                  role: "user",
                  parts: [{
                    text:
                      `Analise exclusivamente este projeto:\n${projetoContext}`,
                  }],
                }],
                generationConfig: {
                  temperature: 0.4,
                  responseMimeType: "application/json",
                },
              }),
            },
            timeoutGeminiMs,
          );

          if (!response.ok) {
            throw new Error(`Gemini respondeu com HTTP ${response.status}`);
          }

          const data = response.data as {
            candidates?: Array<
              { content?: { parts?: Array<{ text?: string }> } }
            >;
          };
          const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "[]";
          const recomendacoes = JSON.parse(textOutput);
          if (!Array.isArray(recomendacoes)) {
            throw new Error("Resposta do Gemini não é uma lista JSON.");
          }

          // O ID retornado pelo modelo precisa ser exatamente o projeto do prompt.
          const idsPermitidos = new Set([projeto.id]);
          const recomendacoesValidadas = validarRecomendacoesDoLote(
            recomendacoes,
            idsPermitidos,
          );

          for (const recomendacao of recomendacoesValidadas) {
            const { error: updateError } = await supabaseClient
              .from("projetos")
              .update({ alerta_ia: recomendacao.alerta_ia })
              .eq("id", recomendacao.projeto_id);

            if (updateError) throw updateError;
          }

          resultado = {
            sucesso: true,
            alertasAtualizados: recomendacoesValidadas.length,
          };
        } catch (error) {
          erroAnalise = error instanceof Error
            ? error.message
            : "falha inesperada";
          console.error(
            `Análise falhou para o projeto ${projeto.id}: ${erroAnalise}`,
          );
        } finally {
          try {
            const { error: markerError } = await supabaseClient
              .from("projetos")
              .update({ scrum_analisado_em: new Date().toISOString() })
              .eq("id", projeto.id);

            if (markerError) throw markerError;
          } catch (markerError) {
            const markerMessage = markerError instanceof Error
              ? markerError.message
              : "falha inesperada ao atualizar marcador";
            console.error(
              `Marcador Scrum falhou para o projeto ${projeto.id}: ${markerMessage}`,
            );

            // A falha do marcador não substitui a causa original da análise.
            // Se a análise havia funcionado, a unidade passa a ser reportada
            // como falha porque não avançou de forma segura na fila.
            if (erroAnalise === null) resultado.sucesso = false;
          }
        }

        return resultado;
      },
    );

    const analises = resultados.filter((resultado) => resultado.sucesso).length;
    const falhas = resultados.filter((resultado) => !resultado.sucesso).length +
      (projetos.length - lotesPorProjeto.length);
    const alertasAtualizados = resultados.reduce(
      (total, resultado) => total + resultado.alertasAtualizados,
      0,
    );

    return new Response(
      JSON.stringify({
        success: true,
        considerados: projetos.length,
        analises,
        falhas,
        pendentes: Math.max(totalProjetos - projetos.length, 0),
        alertas_atualizados: alertasAtualizados,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Erro inesperado no Scrum Agent.";
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});

import {
  criarLotesIsoladosPorProjeto,
  executarComConcorrenciaLimitada,
  lerInteiroLimitado,
  validarRecomendacoesDoLote,
} from "./logic.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  assert(
    actualJson === expectedJson,
    `${message}: esperado ${expectedJson}, recebido ${actualJson}`,
  );
}

Deno.test("cria exatamente um projeto por prompt", () => {
  const lotes = criarLotesIsoladosPorProjeto([
    { id: "a-1", cliente: "Cliente A", os: "OS-1" },
    { id: "b-1", cliente: "Cliente B", os: "OS-1" },
    { id: "a-2", cliente: "Cliente A", os: "OS-2" },
  ]);

  assertEquals(lotes.map((lote) => lote.map((projeto) => projeto.id)), [
    ["a-1"],
    ["b-1"],
    ["a-2"],
  ], "cada lote deve ser unitário");
  assert(
    lotes.every((lote) => lote.length === 1),
    "nenhum prompt pode conter mais de um projeto",
  );
});

Deno.test("nomes de cliente iguais nunca compartilham o mesmo prompt", () => {
  const lotes = criarLotesIsoladosPorProjeto([
    { id: "tenant-a-projeto", cliente: "Cliente com nome repetido" },
    { id: "tenant-b-projeto", cliente: "Cliente com nome repetido" },
  ]);

  assertEquals(
    lotes.length,
    2,
    "projetos com nomes de cliente iguais devem gerar prompts separados",
  );
  assertEquals(
    lotes[0].map((projeto) => projeto.id),
    ["tenant-a-projeto"],
    "primeiro projeto deve ficar isolado",
  );
  assertEquals(
    lotes[1].map((projeto) => projeto.id),
    ["tenant-b-projeto"],
    "segundo projeto deve ficar isolado",
  );
});

Deno.test("ignora identificadores ausentes ou duplicados de forma fechada", () => {
  const lotes = criarLotesIsoladosPorProjeto([
    { id: "", cliente: "Cliente A" },
    { id: "   ", cliente: "Cliente B" },
    { id: "projeto-valido", cliente: "Cliente A" },
    { id: "projeto-valido", cliente: "Cliente B" },
  ]);

  assertEquals(
    lotes,
    [[{ id: "projeto-valido", cliente: "Cliente A" }]],
    "IDs inválidos ou duplicados não devem abrir novos lotes",
  );
});

Deno.test("aceita somente projeto_id pertencente ao lote atual", () => {
  const validadas = validarRecomendacoesDoLote([
    { projeto_id: "a-1", alerta_ia: "  Corrigir cronograma.  " },
    { projeto_id: "b-1", alerta_ia: "Projeto de outro cliente." },
    { os: "OS-1", alerta_ia: "Referência por OS." },
    { projeto_id: "a-1", alerta_ia: "   " },
  ], new Set(["a-1", "a-2"]));

  assertEquals(
    validadas,
    [{ projeto_id: "a-1", alerta_ia: "Corrigir cronograma." }],
    "somente IDs permitidos e alertas válidos devem seguir para update",
  );
});

Deno.test("configuração numérica usa padrão seguro e respeita limites absolutos", () => {
  assertEquals(
    lerInteiroLimitado(undefined, 15, 1, 25),
    15,
    "ausência deve usar o padrão",
  );
  assertEquals(
    lerInteiroLimitado("", 15, 1, 25),
    15,
    "valor vazio deve usar o padrão",
  );
  assertEquals(
    lerInteiroLimitado("abc", 15, 1, 25),
    15,
    "valor inválido deve usar o padrão",
  );
  assertEquals(
    lerInteiroLimitado("-1", 15, 1, 25),
    15,
    "valor assinado deve usar o padrão",
  );
  assertEquals(
    lerInteiroLimitado("0", 15, 1, 25),
    1,
    "valor baixo deve ser elevado ao mínimo",
  );
  assertEquals(
    lerInteiroLimitado("999", 15, 1, 25),
    25,
    "valor alto deve ser reduzido ao máximo",
  );
  assertEquals(
    lerInteiroLimitado("5", 15, 1, 25),
    5,
    "valor válido deve ser preservado",
  );
});

Deno.test("worker pool nunca excede a concorrência e preserva a ordem", async () => {
  let ativos = 0;
  let pico = 0;

  const resultados = await executarComConcorrenciaLimitada(
    [1, 2, 3, 4, 5, 6],
    3,
    async (item) => {
      ativos++;
      pico = Math.max(pico, ativos);
      await new Promise((resolve) => setTimeout(resolve, (7 - item) * 2));
      ativos--;
      return item * 10;
    },
  );

  assertEquals(
    resultados,
    [10, 20, 30, 40, 50, 60],
    "resultados devem preservar a ordem de entrada",
  );
  assert(
    pico <= 3,
    `pico de concorrência deveria ser no máximo 3, recebido ${pico}`,
  );
  assert(pico > 1, "o pool deve executar mais de um item em paralelo");
});

Deno.test("handler usa lotes unitários e persiste pela chave primária", async () => {
  const source = await Deno.readTextFile(
    new URL("./index.ts", import.meta.url),
  );

  const serviceKeyGuard = source.indexOf("if (!serviceRoleKey)");
  const authComparison = source.indexOf(
    "authHeader !== `Bearer ${serviceRoleKey}`",
  );
  assert(
    serviceKeyGuard >= 0 && authComparison > serviceKeyGuard,
    "chave de service role ausente deve falhar antes da comparação do Bearer",
  );
  assert(
    /const lotesPorProjeto\s*=\s*criarLotesIsoladosPorProjeto\(projetos\)/
      .test(source) &&
      /executarComConcorrenciaLimitada\(\s*lotesPorProjeto,\s*concorrencia,/
        .test(source),
    "handler deve gerar cada prompt a partir dos lotes unitários da função testada",
  );
  assert(
    /const idsPermitidos\s*=\s*new Set\(\[projeto\.id\]\)/.test(source),
    "cada resposta do modelo deve aceitar somente o ID do projeto do prompt atual",
  );
  assert(
    /\.from\(["']projetos["']\)\s*\.update\(\{ alerta_ia: recomendacao\.alerta_ia \}\)\s*\.eq\(["']id["'], recomendacao\.projeto_id\)/
      .test(source),
    "a cadeia de update deve filtrar pela chave primária retornada pela validação",
  );
  assert(
    !/\.eq\(["']os["']/.test(source),
    "handler não pode atualizar alertas pela OS",
  );
  assert(
    /\{ count: ["']exact["'] \}/.test(source) &&
      /\.order\(["']scrum_analisado_em["'], \{\s*ascending: true,\s*nullsFirst: true,?\s*\}\)/
        .test(source) &&
      /\.order\(["']id["'], \{ ascending: true \}\)/.test(source) &&
      /\.limit\(1, \{ referencedTable: ["']atualizacoes_semana["'] \}\)/
        .test(source) &&
      source.includes(".limit(limiteProjetos)"),
    "consulta deve contar o total e limitar projetos e histórico em ordem determinística",
  );
  assert(
    /finally\s*\{[\s\S]*?\.update\(\{ scrum_analisado_em: new Date\(\)\.toISOString\(\) \}\)[\s\S]*?\.eq\(["']id["'], projeto\.id\)/
      .test(source),
    "marcador persistente deve avançar no finally para sucessos e falhas",
  );
  assert(
    source.includes("new AbortController()") &&
      source.includes("signal: controller.signal") &&
      source.includes("controller.abort()") &&
      source.includes("const data: unknown = await response.json()"),
    "cada chamada e leitura da resposta Gemini deve permanecer sob timeout via AbortController",
  );
  assert(
    source.includes("considerados: projetos.length") &&
      source.includes(
        "pendentes: Math.max(totalProjetos - projetos.length, 0)",
      ),
    "resposta deve reportar projetos considerados e pendentes",
  );
});

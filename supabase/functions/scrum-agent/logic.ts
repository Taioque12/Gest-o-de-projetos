export type ProjetoIdentificavel = {
  id: string;
};

export type RecomendacaoValidada = {
  projeto_id: string;
  alerta_ia: string;
};

export function lerInteiroLimitado(
  valor: string | undefined,
  valorPadrao: number,
  minimo: number,
  maximo: number,
): number {
  if (
    !Number.isInteger(valorPadrao) || valorPadrao < minimo ||
    valorPadrao > maximo
  ) {
    throw new Error("O valor padrão deve estar dentro dos limites permitidos.");
  }

  if (valor === undefined || !/^\d+$/.test(valor.trim())) return valorPadrao;

  const numero = Number(valor);
  if (!Number.isSafeInteger(numero)) return valorPadrao;

  return Math.min(maximo, Math.max(minimo, numero));
}

export async function executarComConcorrenciaLimitada<T, R>(
  itens: readonly T[],
  concorrencia: number,
  executar: (item: T, indice: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concorrencia) || concorrencia < 1) {
    throw new Error("A concorrência deve ser um inteiro positivo.");
  }

  const resultados = new Array<R>(itens.length);
  let proximoIndice = 0;

  async function worker(): Promise<void> {
    while (true) {
      const indice = proximoIndice++;
      if (indice >= itens.length) return;
      resultados[indice] = await executar(itens[indice], indice);
    }
  }

  const totalWorkers = Math.min(concorrencia, itens.length);
  await Promise.all(Array.from({ length: totalWorkers }, () => worker()));
  return resultados;
}

export function criarLotesIsoladosPorProjeto<T extends ProjetoIdentificavel>(
  projetos: T[],
): T[][] {
  const idsIncluidos = new Set<string>();
  const lotes: T[][] = [];

  for (const projeto of projetos) {
    if (typeof projeto.id !== "string") continue;

    const projetoId = projeto.id.trim();
    if (projetoId === "" || idsIncluidos.has(projetoId)) continue;

    idsIncluidos.add(projetoId);
    lotes.push([projeto]);
  }

  return lotes;
}

export function validarRecomendacoesDoLote(
  recomendacoes: unknown,
  idsPermitidos: ReadonlySet<string>,
): RecomendacaoValidada[] {
  if (!Array.isArray(recomendacoes)) return [];

  const validadas: RecomendacaoValidada[] = [];
  for (const recomendacao of recomendacoes) {
    if (
      typeof recomendacao === "object" &&
      recomendacao !== null &&
      "projeto_id" in recomendacao &&
      typeof recomendacao.projeto_id === "string" &&
      idsPermitidos.has(recomendacao.projeto_id) &&
      "alerta_ia" in recomendacao &&
      typeof recomendacao.alerta_ia === "string" &&
      recomendacao.alerta_ia.trim() !== ""
    ) {
      validadas.push({
        projeto_id: recomendacao.projeto_id,
        alerta_ia: recomendacao.alerta_ia.trim(),
      });
    }
  }

  return validadas;
}

export type UnidadeBase = "unidade" | "g" | "kg" | "ml" | "L" | string;

export type CompraHistoricaParaCusto = {
  inventory_item_id: number | null;
  quantity: number;
  unit: string;
  total_price: number;
};

/**
 * Converte uma quantidade para a unidade-base usada no estoque.
 * Retorna null quando as unidades representam grandezas incompatíveis.
 */
export function normalizarQuantidadeParaBase(
  quantidade: number,
  unidadeOrigem: string,
  unidadeBase: string
): number | null {
  const valor = Number(quantidade);

  if (!Number.isFinite(valor)) {
    return null;
  }

  if (unidadeOrigem === unidadeBase) {
    return valor;
  }

  if (unidadeOrigem === "kg" && unidadeBase === "g") {
    return valor * 1000;
  }

  if (unidadeOrigem === "g" && unidadeBase === "kg") {
    return valor / 1000;
  }

  if (unidadeOrigem === "L" && unidadeBase === "ml") {
    return valor * 1000;
  }

  if (unidadeOrigem === "ml" && unidadeBase === "L") {
    return valor / 1000;
  }

  return null;
}

/**
 * Calcula o custo médio ponderado por item de estoque usando o histórico
 * de compras detalhadas. O total_price já representa o valor realmente pago.
 */
export function calcularCustosMediosPonderados(
  compras: CompraHistoricaParaCusto[],
  unidadesBase: Map<number, string>
) {
  const acumulado = new Map<
    number,
    { quantidade: number; valor: number }
  >();

  compras.forEach((compra) => {
    if (compra.inventory_item_id == null) {
      return;
    }

    const inventoryId = Number(compra.inventory_item_id);
    const unidadeBase = unidadesBase.get(inventoryId);

    if (!unidadeBase) {
      return;
    }

    const quantidadeNormalizada = normalizarQuantidadeParaBase(
      Number(compra.quantity),
      String(compra.unit),
      unidadeBase
    );

    const valorPago = Number(compra.total_price);

    if (
      quantidadeNormalizada == null ||
      quantidadeNormalizada <= 0 ||
      !Number.isFinite(valorPago) ||
      valorPago < 0
    ) {
      return;
    }

    const atual = acumulado.get(inventoryId) ?? {
      quantidade: 0,
      valor: 0,
    };

    atual.quantidade += quantidadeNormalizada;
    atual.valor += valorPago;

    acumulado.set(inventoryId, atual);
  });

  const custos = new Map<number, number>();

  acumulado.forEach((dados, inventoryId) => {
    if (dados.quantidade <= 0) {
      return;
    }

    custos.set(
      inventoryId,
      dados.valor / dados.quantidade
    );
  });

  return custos;
}

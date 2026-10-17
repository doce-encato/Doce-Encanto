"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Compra = {
  id: number;
  purchase_date: string;
  total: number;
};

type Venda = {
  id: number;
  customer_id: number | null;
  sale_date: string;
  total: number;
  amount_paid: number;
  payment_status: "paid" | "pending" | "partial" | "canceled";
};

type Cliente = {
  id: number;
  name: string;
};

type DoceEstoque = {
  id: number;
  name: string;
  category_id: number;
  quantity: number;
  sale_price: number;
};

type CategoriaDoce = {
  id: number;
  name: string;
};

type Devedor = {
  customerId: number | null;
  name: string;
  amount: number;
  saleIds: number[];
};

type ModoPeriodo = "month" | "year" | "all";

function dinheiro(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function anoAtual() {
  return String(new Date().getFullYear());
}

function dataISO(data: Date) {
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

function nomeDoMes(mes: string) {
  const [ano, numeroMes] = mes.split("-");
  const data = new Date(Number(ano), Number(numeroMes) - 1, 1);

  return data
    .toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    })
    .replace(/^./, (letra) => letra.toUpperCase());
}

function formatarDataCurta(valor: string) {
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function intervaloDoPeriodo(
  modo: ModoPeriodo,
  mes: string,
  ano: string
): { inicio: string | null; fimExclusivo: string | null } {
  if (modo === "all") {
    return { inicio: null, fimExclusivo: null };
  }

  if (modo === "year") {
    const anoNumero = Number(ano);
    return {
      inicio: `${ano}-01-01`,
      fimExclusivo: `${anoNumero + 1}-01-01`,
    };
  }

  const [anoTexto, mesTexto] = mes.split("-");
  const anoNumero = Number(anoTexto);
  const mesNumero = Number(mesTexto);
  const proximoMes = new Date(anoNumero, mesNumero, 1);

  return {
    inicio: `${anoTexto}-${mesTexto}-01`,
    fimExclusivo: dataISO(proximoMes),
  };
}

export default function ResumoPage() {
  const [modoPeriodo, setModoPeriodo] = useState<ModoPeriodo>("month");
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual());
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual());

  const [compras, setCompras] = useState<Compra[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [docesEstoque, setDocesEstoque] = useState<DoceEstoque[]>([]);
  const [categoriasDoces, setCategoriasDoces] = useState<CategoriaDoce[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function carregarResumo() {
    setCarregando(true);
    setErro("");

    const { inicio, fimExclusivo } = intervaloDoPeriodo(
      modoPeriodo,
      mesSelecionado,
      anoSelecionado
    );

    let comprasQuery = supabase
      .from("purchases")
      .select("id, purchase_date, total")
      .order("purchase_date", { ascending: true });

    let vendasQuery = supabase
      .from("sales")
      .select("id, customer_id, sale_date, total, amount_paid, payment_status")
      .neq("payment_status", "canceled")
      .order("sale_date", { ascending: true });

    if (inicio && fimExclusivo) {
      comprasQuery = comprasQuery
        .gte("purchase_date", inicio)
        .lt("purchase_date", fimExclusivo);

      vendasQuery = vendasQuery
        .gte("sale_date", inicio)
        .lt("sale_date", fimExclusivo);
    }

    const [
      comprasResp,
      vendasResp,
      clientesResp,
      docesEstoqueResp,
      categoriasDocesResp,
    ] = await Promise.all([
      comprasQuery,
      vendasQuery,
      supabase.from("customers").select("id, name"),
      supabase
        .from("sweets")
        .select("id, name, category_id, quantity, sale_price")
        .eq("is_customizable", false)
        .gt("quantity", 0)
        .order("quantity", { ascending: false }),
      supabase.from("sweet_categories").select("id, name"),
    ]);

    if (
      comprasResp.error ||
      vendasResp.error ||
      clientesResp.error ||
      docesEstoqueResp.error ||
      categoriasDocesResp.error
    ) {
      console.error(
        comprasResp.error ||
          vendasResp.error ||
          clientesResp.error ||
          docesEstoqueResp.error ||
          categoriasDocesResp.error
      );
      setErro("Não foi possível carregar o resumo.");
      setCarregando(false);
      return;
    }

    setCompras(
      (comprasResp.data ?? []).map((item) => ({
        id: Number(item.id),
        purchase_date: String(item.purchase_date),
        total: Number(item.total ?? 0),
      }))
    );

    setVendas(
      (vendasResp.data ?? []).map((item) => ({
        id: Number(item.id),
        customer_id: item.customer_id === null ? null : Number(item.customer_id),
        sale_date: String(item.sale_date),
        total: Number(item.total ?? 0),
        amount_paid: Number(item.amount_paid ?? 0),
        payment_status: item.payment_status as Venda["payment_status"],
      }))
    );

    setClientes(
      (clientesResp.data ?? []).map((item) => ({
        id: Number(item.id),
        name: String(item.name),
      }))
    );

    setDocesEstoque(
      (docesEstoqueResp.data ?? []).map((item) => ({
        id: Number(item.id),
        name: String(item.name),
        category_id: Number(item.category_id),
        quantity: Number(item.quantity ?? 0),
        sale_price: Number(item.sale_price ?? 0),
      }))
    );

    setCategoriasDoces(
      (categoriasDocesResp.data ?? []).map((item) => ({
        id: Number(item.id),
        name: String(item.name),
      }))
    );

    setCarregando(false);
  }

  useEffect(() => {
    carregarResumo();
  }, [modoPeriodo, mesSelecionado, anoSelecionado]);

  const calculos = useMemo(() => {
    const materiaPrima = compras.reduce(
      (total, compra) => total + Number(compra.total || 0),
      0
    );

    const despesasEstimadas = materiaPrima;
    const maoDeObraEstimada = materiaPrima;
    const custoConsiderado =
      materiaPrima + despesasEstimadas + maoDeObraEstimada;

    const totalVendido = vendas.reduce(
      (total, venda) => total + Number(venda.total || 0),
      0
    );

    const totalRecebido = vendas.reduce(
      (total, venda) =>
        total + Math.min(Number(venda.amount_paid || 0), Number(venda.total || 0)),
      0
    );

    const totalAReceber = vendas.reduce(
      (total, venda) =>
        total +
        Math.max(0, Number(venda.total || 0) - Number(venda.amount_paid || 0)),
      0
    );

    const lucroRealizado = totalRecebido - custoConsiderado;
    const lucroEsperado = totalVendido - custoConsiderado;
    const margemEsperada =
      totalVendido > 0 ? (lucroEsperado / totalVendido) * 100 : 0;

    return {
      materiaPrima,
      despesasEstimadas,
      maoDeObraEstimada,
      custoConsiderado,
      totalVendido,
      totalRecebido,
      totalAReceber,
      lucroRealizado,
      lucroEsperado,
      margemEsperada,
    };
  }, [compras, vendas]);

  const devedores = useMemo(() => {
    const nomes = new Map<number, string>(
      clientes.map((cliente) => [cliente.id, cliente.name])
    );

    const agrupados = new Map<string, Devedor>();

    vendas.forEach((venda) => {
      const pendente = Math.max(
        0,
        Number(venda.total || 0) - Number(venda.amount_paid || 0)
      );

      if (pendente <= 0) return;

      const chave =
        venda.customer_id === null
          ? `sem-cliente-${venda.id}`
          : `cliente-${venda.customer_id}`;

      const nome =
        venda.customer_id === null
          ? "Venda sem cliente"
          : nomes.get(venda.customer_id) ?? "Cliente";

      const atual = agrupados.get(chave);

      if (atual) {
        atual.amount += pendente;
        atual.saleIds.push(venda.id);
      } else {
        agrupados.set(chave, {
          customerId: venda.customer_id,
          name: nome,
          amount: pendente,
          saleIds: [venda.id],
        });
      }
    });

    return Array.from(agrupados.values()).sort((a, b) => b.amount - a.amount);
  }, [vendas, clientes]);

  const estoquePronto = useMemo(() => {
    const categoriasMap = new Map<number, string>(
      categoriasDoces.map((categoria) => [categoria.id, categoria.name])
    );

    const itens = docesEstoque
      .map((doce) => {
        const valorPotencial =
          Number(doce.quantity || 0) * Number(doce.sale_price || 0);

        return {
          ...doce,
          category: categoriasMap.get(doce.category_id) ?? "Sem categoria",
          valorPotencial,
        };
      })
      .filter((doce) => doce.quantity > 0)
      .sort((a, b) => b.valorPotencial - a.valorPotencial);

    const unidades = itens.reduce(
      (total, doce) => total + Number(doce.quantity || 0),
      0
    );

    const valorPotencial = itens.reduce(
      (total, doce) => total + doce.valorPotencial,
      0
    );

    return { itens, unidades, valorPotencial };
  }, [docesEstoque, categoriasDoces]);

  const periodoGeral = useMemo(() => {
    if (modoPeriodo !== "all") return null;

    const datas = [
      ...compras.map((compra) => compra.purchase_date),
      ...vendas.map((venda) => venda.sale_date),
    ].filter(Boolean);

    if (datas.length === 0) return null;

    const ordenadas = [...datas].sort();

    return {
      inicio: ordenadas[0],
      fim: ordenadas[ordenadas.length - 1],
    };
  }, [modoPeriodo, compras, vendas]);

  const resultadoComEstoque =
    calculos.lucroEsperado + estoquePronto.valorPotencial;

  const tituloPeriodo =
    modoPeriodo === "month"
      ? nomeDoMes(mesSelecionado)
      : modoPeriodo === "year"
        ? `Ano de ${anoSelecionado}`
        : "Todo o período";

  const temMovimento = compras.length > 0 || vendas.length > 0;

  return (
    <main className="compras-page">
      <div className="page-shell summary-page-shell">
        <header className="page-header">
          <Link href="/" className="back-button">←</Link>

          <div>
            <span className="page-kicker">FINANCEIRO</span>
            <h1>Resumo</h1>
            <p>Veja rapidamente quanto entrou, quanto falta receber e o resultado do negócio.</p>
          </div>
        </header>

        <section className="summary-period-card">
          <div className="summary-period-info">
            <span className="section-kicker">PERÍODO</span>
            <strong>{tituloPeriodo}</strong>

            {periodoGeral && (
              <small>
                {formatarDataCurta(periodoGeral.inicio)} até {formatarDataCurta(periodoGeral.fim)}
              </small>
            )}
          </div>

          <div className="summary-period-controls">
            <div className="summary-period-tabs">
              <button
                type="button"
                className={modoPeriodo === "month" ? "active" : ""}
                onClick={() => setModoPeriodo("month")}
              >
                Mês
              </button>

              <button
                type="button"
                className={modoPeriodo === "year" ? "active" : ""}
                onClick={() => setModoPeriodo("year")}
              >
                Ano
              </button>

              <button
                type="button"
                className={modoPeriodo === "all" ? "active" : ""}
                onClick={() => setModoPeriodo("all")}
              >
                Geral
              </button>
            </div>

            {modoPeriodo === "month" && (
              <input
                type="month"
                value={mesSelecionado}
                onChange={(event) => setMesSelecionado(event.target.value)}
                aria-label="Escolher mês do resumo"
              />
            )}

            {modoPeriodo === "year" && (
              <input
                type="number"
                inputMode="numeric"
                min="2020"
                max="2100"
                value={anoSelecionado}
                onChange={(event) => setAnoSelecionado(event.target.value)}
                aria-label="Escolher ano do resumo"
              />
            )}
          </div>
        </section>

        {erro && <div className="form-error">{erro}</div>}

        {carregando ? (
          <div className="empty-purchases"><strong>Carregando resumo...</strong></div>
        ) : !temMovimento ? (
          <div className="empty-purchases">
            <strong>Nenhum movimento neste período</strong>
            <p>Quando houver compras ou vendas, o resumo aparecerá aqui.</p>
          </div>
        ) : (
          <>
            <section className="summary-profit-grid summary-profit-grid-three">
              <article
                className={`summary-profit-hero ${
                  calculos.lucroRealizado >= 0 ? "positive" : "negative"
                }`}
              >
                <div>
                  <span className="section-kicker">LUCRO JÁ REALIZADO</span>
                  <h2>Quanto já sobrou</h2>
                </div>

                <strong>{dinheiro(calculos.lucroRealizado)}</strong>
                <p>O que já foi recebido menos o custo considerado.</p>
              </article>

              <article
                className={`summary-profit-secondary ${
                  calculos.lucroEsperado >= 0 ? "positive" : "negative"
                }`}
              >
                <div>
                  <span className="section-kicker">SE TODOS PAGAREM</span>
                  <h2>Lucro esperado</h2>
                </div>

                <strong>{dinheiro(calculos.lucroEsperado)}</strong>

                <div className="summary-margin-pill">
                  Margem estimada{" "}
                  <b>
                    {calculos.margemEsperada.toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })}%
                  </b>
                </div>
              </article>

              <article
                className={`summary-profit-secondary summary-profit-stock ${
                  resultadoComEstoque >= 0 ? "positive" : "negative"
                }`}
              >
                <div>
                  <span className="section-kicker">SE VENDER TODO O ESTOQUE</span>
                  <h2>Resultado projetado</h2>
                </div>

                <strong>{dinheiro(resultadoComEstoque)}</strong>

                <p className="summary-profit-stock-note">
                  Considera todos pagando + {dinheiro(estoquePronto.valorPotencial)}
                  em vendas do estoque pronto.
                </p>
              </article>
            </section>

            <section className="summary-main-grid">
              <article className="summary-kpi-card">
                <span>Vendido</span>
                <strong>{dinheiro(calculos.totalVendido)}</strong>
                <small>Total das vendas do período</small>
              </article>

              <article className="summary-kpi-card summary-kpi-positive">
                <span>Recebido</span>
                <strong>{dinheiro(calculos.totalRecebido)}</strong>
                <small>Valor já pago pelos clientes</small>
              </article>

              <article className="summary-kpi-card summary-kpi-warning">
                <span>A receber</span>
                <strong>{dinheiro(calculos.totalAReceber)}</strong>
                <small>Valores ainda pendentes</small>
              </article>
            </section>

            <section className="summary-section summary-stock-section">
              <div className="summary-section-heading">
                <div>
                  <span className="section-kicker">ESTOQUE PRONTO HOJE</span>
                  <h2>Quanto pode virar em vendas</h2>
                </div>

                <strong className="summary-stock-total">
                  {dinheiro(estoquePronto.valorPotencial)}
                </strong>
              </div>

              <div className="summary-stock-hero">
                <div>
                  <span>Potencial de vendas do estoque</span>
                  <strong>{dinheiro(estoquePronto.valorPotencial)}</strong>
                  <small>
                    {estoquePronto.unidades.toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    unidades prontas disponíveis
                  </small>
                </div>

                <p>
                  Se todo o estoque pronto for vendido pelos preços atuais,
                  esse é o valor que pode entrar em novas vendas.
                </p>
              </div>

              {estoquePronto.itens.length > 0 ? (
                <div className="summary-stock-list">
                  {estoquePronto.itens.map((doce) => (
                    <div className="summary-stock-card" key={`estoque-${doce.id}`}>
                      <div>
                        <span>{doce.category}</span>
                        <strong>{doce.name}</strong>
                        <small>
                          {Number(doce.quantity).toLocaleString("pt-BR", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          un × {dinheiro(doce.sale_price)}
                        </small>
                      </div>

                      <div className="summary-stock-value">
                        <span>Se vender tudo</span>
                        <strong>{dinheiro(doce.valorPotencial)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="summary-all-paid">
                  <strong>Nenhum doce pronto no estoque</strong>
                  <span>
                    Quando houver produção disponível, o potencial de vendas
                    aparecerá aqui.
                  </span>
                </div>
              )}

              <p className="summary-stock-note">
                Este valor representa faturamento potencial, não lucro líquido.
                O custo continua sendo calculado separadamente pela regra das
                compras × 3.
              </p>
            </section>

            <section className="summary-section">
              <div className="summary-section-heading">
                <div>
                  <span className="section-kicker">CUSTOS</span>
                  <h2>Como chegamos ao custo</h2>
                </div>

                <span className="summary-formula-badge">Compras × 3</span>
              </div>

              <div className="summary-cost-card">
                <div className="summary-cost-row">
                  <span>Matéria-prima</span>
                  <strong>{dinheiro(calculos.materiaPrima)}</strong>
                </div>

                <div className="summary-cost-row">
                  <span>Luz + água + gás</span>
                  <strong>{dinheiro(calculos.despesasEstimadas)}</strong>
                </div>

                <div className="summary-cost-row">
                  <span>Mão de obra</span>
                  <strong>{dinheiro(calculos.maoDeObraEstimada)}</strong>
                </div>

                <div className="summary-cost-row summary-cost-total">
                  <span>Custo considerado</span>
                  <strong>{dinheiro(calculos.custoConsiderado)}</strong>
                </div>

                <p className="summary-cost-note">
                  Regra usada no negócio: uma parte representa a matéria-prima,
                  uma parte as despesas de produção e uma parte a mão de obra.
                </p>
              </div>
            </section>

            <section className="summary-section">
              <div className="summary-section-heading">
                <div>
                  <span className="section-kicker">CONTAS A RECEBER</span>
                  <h2>Quem ainda precisa pagar</h2>
                </div>

                <strong className="summary-pending-total">
                  {dinheiro(calculos.totalAReceber)}
                </strong>
              </div>

              {devedores.length === 0 ? (
                <div className="summary-all-paid">
                  <strong>✓ Tudo recebido</strong>
                  <span>Não há valores pendentes neste período.</span>
                </div>
              ) : (
                <div className="summary-debt-list">
                  {devedores.map((devedor) =>
                    devedor.customerId ? (
                      <Link
                        key={`cliente-${devedor.customerId}`}
                        href={`/clientes/${devedor.customerId}`}
                        className="summary-debt-card"
                      >
                        <div>
                          <strong>{devedor.name}</strong>
                          <span>
                            {devedor.saleIds.length === 1
                              ? `Pedido #${devedor.saleIds[0]}`
                              : `${devedor.saleIds.length} pedidos pendentes`}
                          </span>
                        </div>

                        <div className="summary-debt-value">
                          <strong>{dinheiro(devedor.amount)}</strong>
                          <span>Ver cliente ›</span>
                        </div>
                      </Link>
                    ) : (
                      <div
                        key={`sem-cliente-${devedor.saleIds.join("-")}`}
                        className="summary-debt-card"
                      >
                        <div>
                          <strong>{devedor.name}</strong>
                          <span>Pedido #{devedor.saleIds[0]}</span>
                        </div>

                        <div className="summary-debt-value">
                          <strong>{dinheiro(devedor.amount)}</strong>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            <section className="summary-explanation">
              <strong>Entendendo os dois lucros</strong>

              <div>
                <span>
                  <b>Lucro já realizado:</b> considera apenas o que os clientes já pagaram.
                </span>

                <span>
                  <b>Lucro esperado:</b> considera também os valores que ainda estão pendentes.
                </span>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

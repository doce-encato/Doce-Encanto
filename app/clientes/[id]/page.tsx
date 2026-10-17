"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: number;
  name: string;
  phone: string | null;
  phone_normalized: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Venda = {
  id: number;
  customer_id: number | null;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  payment_status: "paid" | "pending" | "partial" | "canceled";
  payment_method: string | null;
  notes: string | null;
  canceled_at: string | null;
};

type ItemVendaDetalhe = {
  label: string;
  value: string;
};

type ItemVenda = {
  id: number;
  sale_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  sweet_id: number | null;
  customer_name: string | null;
  customer_details: ItemVendaDetalhe[];
};

type DoceReferencia = {
  id: number;
  name: string;
  category_id: number;
};

type CategoriaReferencia = {
  id: number;
  name: string;
};

type FiltroHistorico = "todos" | "pendentes" | "pagos";

function normalizarTelefone(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarTelefone(valor: string | null) {
  if (!valor) return "Sem telefone";

  const numeros = normalizarTelefone(valor);

  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  }

  if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return valor;
}

function formatarData(valor: string) {
  const [ano, mes, dia] = valor.split("-");

  if (ano && mes && dia) {
    return `${dia}/${mes}/${ano}`;
  }

  return new Date(valor).toLocaleDateString("pt-BR");
}

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function nomeFormaPagamento(valor: string | null) {
  if (!valor) return "Não informado";

  const nomes: Record<string, string> = {
    pix: "Pix",
    card: "Cartão",
    cash: "Dinheiro",
    other: "Outro",
  };

  return nomes[valor] ?? valor;
}

const EMOJI_SORRISO_TOKEN = "__EMOJI_SORRISO__";

export default function ClienteDetalhesPage() {
  const params = useParams();
  const clienteId = Number(params.id);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [docesReferencia, setDocesReferencia] = useState<DoceReferencia[]>([]);
  const [categoriasReferencia, setCategoriasReferencia] = useState<CategoriaReferencia[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [modoEditar, setModoEditar] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [filtroHistorico, setFiltroHistorico] =
    useState<FiltroHistorico>("todos");

  const [marcandoPagoId, setMarcandoPagoId] = useState<number | null>(null);

  const [vendaCancelando, setVendaCancelando] = useState<Venda | null>(null);
  const [cancelandoVendaId, setCancelandoVendaId] =
    useState<number | null>(null);

  const [menuVendaId, setMenuVendaId] = useState<number | null>(null);

  async function carregarTudo() {
    setCarregando(true);
    setErro("");

    const clienteResposta = await supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        phone_normalized,
        notes,
        created_at,
        updated_at
      `)
      .eq("id", clienteId)
      .single();

    if (clienteResposta.error || !clienteResposta.data) {
      console.error(clienteResposta.error);
      setErro("Não foi possível carregar o cliente.");
      setCarregando(false);
      return;
    }

    const convertido: Cliente = {
      id: Number(clienteResposta.data.id),
      name: String(clienteResposta.data.name),
      phone: clienteResposta.data.phone
        ? String(clienteResposta.data.phone)
        : null,
      phone_normalized: clienteResposta.data.phone_normalized
        ? String(clienteResposta.data.phone_normalized)
        : null,
      notes: clienteResposta.data.notes
        ? String(clienteResposta.data.notes)
        : null,
      created_at: String(clienteResposta.data.created_at),
      updated_at: String(clienteResposta.data.updated_at),
    };

    const vendasResposta = await supabase
      .from("sales")
      .select(`
        id,
        customer_id,
        sale_date,
        subtotal,
        discount_amount,
        total,
        amount_paid,
        payment_status,
        payment_method,
        notes,
        canceled_at
      `)
      .eq("customer_id", clienteId)
      .order("sale_date", { ascending: false })
      .order("id", { ascending: false });

    if (vendasResposta.error) {
      console.error(vendasResposta.error);
      setErro(
        "O cliente foi encontrado, mas não foi possível carregar o histórico de vendas."
      );
      setCarregando(false);
      return;
    }

    const vendasConvertidas: Venda[] = (vendasResposta.data ?? []).map(
      (item) => ({
        id: Number(item.id),
        customer_id:
          item.customer_id === null ? null : Number(item.customer_id),
        sale_date: String(item.sale_date),
        subtotal: Number(item.subtotal ?? item.total ?? 0),
        discount_amount: Number(item.discount_amount ?? 0),
        total: Number(item.total ?? 0),
        amount_paid: Number(item.amount_paid ?? 0),
        payment_status: String(item.payment_status) as Venda["payment_status"],
        payment_method: item.payment_method
          ? String(item.payment_method)
          : null,
        notes: item.notes ? String(item.notes) : null,
        canceled_at: item.canceled_at ? String(item.canceled_at) : null,
      })
    );

    let itensConvertidos: ItemVenda[] = [];

    if (vendasConvertidas.length > 0) {
      const ids = vendasConvertidas.map((venda) => venda.id);

      const itensResposta = await supabase
        .from("sale_items")
        .select(`
          id,
          sale_id,
          item_name,
          quantity,
          unit_price,
          subtotal,
          sweet_id,
          customer_name,
          customer_details
        `)
        .in("sale_id", ids)
        .order("id", { ascending: true });

      if (itensResposta.error) {
        console.error(itensResposta.error);
        setErro("Não foi possível carregar os itens das compras.");
        setCarregando(false);
        return;
      }

      itensConvertidos = (itensResposta.data ?? []).map((item) => ({
        id: Number(item.id),
        sale_id: Number(item.sale_id),
        item_name: String(item.item_name),
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? 0),
        subtotal: Number(item.subtotal ?? 0),
        sweet_id: item.sweet_id === null ? null : Number(item.sweet_id),
        customer_name: item.customer_name
          ? String(item.customer_name)
          : null,
        customer_details: Array.isArray(item.customer_details)
          ? item.customer_details
              .map((detalhe: unknown) => {
                if (
                  detalhe &&
                  typeof detalhe === "object" &&
                  "label" in detalhe &&
                  "value" in detalhe
                ) {
                  const convertido = detalhe as {
                    label?: unknown;
                    value?: unknown;
                  };

                  return {
                    label: String(convertido.label ?? ""),
                    value: String(convertido.value ?? ""),
                  };
                }

                return null;
              })
              .filter(
                (
                  detalhe
                ): detalhe is ItemVendaDetalhe =>
                  Boolean(detalhe?.label && detalhe?.value)
              )
          : [],
      }));
    }

    setCliente(convertido);
    setNome(convertido.name);
    setTelefone(convertido.phone ?? "");
    setObservacao(convertido.notes ?? "");

    setVendas(vendasConvertidas);
    setItensVenda(itensConvertidos);

    const sweetIds = Array.from(
      new Set(
        itensConvertidos
          .map((item) => item.sweet_id)
          .filter((id): id is number => id !== null)
      )
    );

    if (sweetIds.length > 0) {
      const [docesResp, categoriasResp] = await Promise.all([
        supabase
          .from("sweets")
          .select("id, name, category_id")
          .in("id", sweetIds),
        supabase
          .from("sweet_categories")
          .select("id, name"),
      ]);

      if (!docesResp.error) {
        setDocesReferencia(
          (docesResp.data ?? []).map((item) => ({
            id: Number(item.id),
            name: String(item.name),
            category_id: Number(item.category_id),
          }))
        );
      }

      if (!categoriasResp.error) {
        setCategoriasReferencia(
          (categoriasResp.data ?? []).map((item) => ({
            id: Number(item.id),
            name: String(item.name),
          }))
        );
      }
    } else {
      setDocesReferencia([]);
      setCategoriasReferencia([]);
    }

    setCarregando(false);
  }

  useEffect(() => {
    if (clienteId) carregarTudo();
  }, [clienteId]);

  const vendasAtivas = useMemo(
    () => vendas.filter((venda) => venda.payment_status !== "canceled"),
    [vendas]
  );

  const totalGasto = useMemo(
    () => vendasAtivas.reduce((soma, venda) => soma + venda.total, 0),
    [vendasAtivas]
  );

  const gastoMes = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    return vendasAtivas.reduce((soma, venda) => {
      const [ano, mes] = venda.sale_date.split("-").map(Number);

      if (ano === anoAtual && mes === mesAtual) {
        return soma + venda.total;
      }

      return soma;
    }, 0);
  }, [vendasAtivas]);

  const pendente = useMemo(
    () =>
      vendasAtivas.reduce(
        (soma, venda) =>
          soma + Math.max(0, venda.total - venda.amount_paid),
        0
      ),
    [vendasAtivas]
  );

  const quantidadePedidos = vendasAtivas.length;

  const vendasFiltradas = useMemo(() => {
    if (filtroHistorico === "pendentes") {
      return vendas.filter(
        (venda) =>
          venda.payment_status !== "canceled" &&
          Math.max(0, venda.total - venda.amount_paid) > 0
      );
    }

    if (filtroHistorico === "pagos") {
      return vendas.filter(
        (venda) =>
          venda.payment_status !== "canceled" &&
          Math.max(0, venda.total - venda.amount_paid) <= 0
      );
    }

    return vendas;
  }, [vendas, filtroHistorico]);

  const whatsappLink = useMemo(() => {
    if (!cliente?.phone_normalized) return null;

    let numero = cliente.phone_normalized;

    if (numero.length === 10 || numero.length === 11) {
      numero = `55${numero}`;
    }

    return `https://wa.me/${numero}`;
  }, [cliente]);

  function itensDaVenda(vendaId: number) {
    return itensVenda.filter((item) => item.sale_id === vendaId);
  }

  function singularizarCategoria(nome: string) {
    const limpo = nome.trim();

    if (limpo.toLowerCase() === "palhas") {
      return "Palha";
    }

    if (limpo.endsWith("s") && limpo.length > 3) {
      return limpo.slice(0, -1);
    }

    return limpo;
  }

  function nomeItemParaCliente(item: ItemVenda) {
    if (item.customer_name?.trim()) {
      return item.customer_name.trim();
    }

    if (item.sweet_id !== null) {
      const doce = docesReferencia.find((itemDoce) => itemDoce.id === item.sweet_id);

      if (doce) {
        const categoria = categoriasReferencia.find(
          (itemCategoria) => itemCategoria.id === doce.category_id
        );

        if (categoria) {
          return `${singularizarCategoria(categoria.name)} ${doce.name}`;
        }
      }
    }

    return item.item_name;
  }

  function adicionarItemNaMensagem(
    linhas: string[],
    item: ItemVenda,
    incluirValor = false
  ) {
    const quantidade = Number.isInteger(item.quantity)
      ? item.quantity.toFixed(0)
      : item.quantity.toLocaleString("pt-BR");

    const nome = nomeItemParaCliente(item);

    linhas.push(
      incluirValor
        ? `${quantidade}x ${nome} — ${dinheiro(item.subtotal)}`
        : `${quantidade}x ${nome}`
    );

    if (item.customer_details.length > 0) {
      item.customer_details.forEach((detalhe) => {
        linhas.push(`${detalhe.label}: ${detalhe.value}`);
      });
    }
  }

  function montarMensagemCobranca(venda: Venda) {
    if (!cliente) return "";

    const itens = itensDaVenda(venda.id);
    const valorPendente = Math.max(0, venda.total - venda.amount_paid);

    const linhas: string[] = [
      `Oi, ${cliente.name}! Tudo bem?`,
      "",
      `Passando para lembrar do seu pedido feito em ${formatarData(
        venda.sale_date
      )}:`,
    ];

    if (itens.length > 0) {
      linhas.push("");

      itens.forEach((item, index) => {
        adicionarItemNaMensagem(linhas, item, true);

        if (
          item.customer_details.length > 0 &&
          index < itens.length - 1
        ) {
          linhas.push("");
        }
      });
    }

    linhas.push("");

    if (venda.discount_amount > 0) {
      linhas.push(`Subtotal: ${dinheiro(venda.subtotal)}`);
      linhas.push(`Desconto: - ${dinheiro(venda.discount_amount)}`);
    }

    linhas.push(`Total: ${dinheiro(venda.total)}`);

    if (venda.amount_paid > 0 && valorPendente > 0) {
      linhas.push(`Já pago: ${dinheiro(venda.amount_paid)}`);
      linhas.push(`Falta pagar: ${dinheiro(valorPendente)}`);
    }

    linhas.push("");
    linhas.push(
      `Quando puder, me avise sobre o pagamento. Se preferir, posso te passar as informações para pagamento via Pix ou cartão.`
    );

    return linhas.join("\n");
  }

  function abrirWhatsAppCobranca(venda: Venda) {
    if (!cliente?.phone_normalized) {
      setErro(
        "Este cliente não possui telefone cadastrado para abrir o WhatsApp."
      );
      return;
    }

    let numero = cliente.phone_normalized;

    if (numero.length === 10 || numero.length === 11) {
      numero = `55${numero}`;
    }

    const mensagem = encodeURIComponent(montarMensagemCobranca(venda)).replaceAll(
      encodeURIComponent(EMOJI_SORRISO_TOKEN),
      "%F0%9F%98%8A"
    );

    window.open(
      `https://wa.me/${numero}?text=${mensagem}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function marcarComoPago(venda: Venda) {
    setMarcandoPagoId(venda.id);
    setErro("");
    setSucesso("");

    const { error } = await supabase
      .from("sales")
      .update({
        amount_paid: venda.total,
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", venda.id);

    if (error) {
      console.error(error);
      setErro("Não foi possível marcar o pagamento como recebido.");
      setMarcandoPagoId(null);
      return;
    }

    setSucesso("Pagamento marcado como recebido.");
    setMarcandoPagoId(null);
    await carregarTudo();
  }

  async function cancelarVenda() {
    if (!vendaCancelando) return;

    setCancelandoVendaId(vendaCancelando.id);
    setErro("");
    setSucesso("");

    const { error } = await supabase.rpc(
      "cancel_sale_and_restore_stock",
      {
        p_sale_id: vendaCancelando.id,
      }
    );

    if (error) {
      console.error(error);
      setErro(
        "Não foi possível cancelar a venda. Confira se o SQL de cancelamento foi executado no Supabase."
      );
      setCancelandoVendaId(null);
      return;
    }

    setVendaCancelando(null);
    setCancelandoVendaId(null);
    setSucesso("Venda cancelada e estoque devolvido.");
    await carregarTudo();
  }

  async function salvarEdicao() {
    if (!cliente) return;

    setErro("");
    setSucesso("");

    if (!nome.trim()) {
      setErro("Digite o nome do cliente.");
      return;
    }

    const telefoneNormalizado = normalizarTelefone(telefone);

    if (telefone.trim() && telefoneNormalizado.length < 10) {
      setErro("Informe um telefone válido ou deixe o campo vazio.");
      return;
    }

    if (telefoneNormalizado) {
      const { data: duplicado, error: buscaError } = await supabase
        .from("customers")
        .select("id, name")
        .eq("phone_normalized", telefoneNormalizado)
        .neq("id", cliente.id)
        .maybeSingle();

      if (buscaError) {
        console.error(buscaError);
        setErro("Não foi possível validar o telefone.");
        return;
      }

      if (duplicado) {
        setErro(
          `Este telefone já está cadastrado para ${duplicado.name}.`
        );
        return;
      }
    }

    setSalvando(true);

    const { error } = await supabase
      .from("customers")
      .update({
        name: nome.trim(),
        phone: telefone.trim() || null,
        notes: observacao.trim() || null,
      })
      .eq("id", cliente.id);

    if (error) {
      console.error(error);
      setErro("Não foi possível salvar as alterações.");
      setSalvando(false);
      return;
    }

    setSalvando(false);
    setModoEditar(false);
    setSucesso("Cliente atualizado.");
    await carregarTudo();
  }

  if (carregando) {
    return (
      <main className="compras-page">
        <div className="page-shell">
          <div className="empty-purchases">
            <strong>Carregando cliente...</strong>
          </div>
        </div>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="compras-page">
        <div className="page-shell">
          <Link href="/clientes" className="back-button">
            ←
          </Link>

          <div className="empty-purchases">
            <strong>Cliente não encontrado</strong>
            {erro && <p>{erro}</p>}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="compras-page">
      <div className="page-shell">
        <header className="page-header">
          <Link href="/clientes" className="back-button">
            ←
          </Link>

          <div>
            <span className="page-kicker">CLIENTE</span>
            <h1>{cliente.name}</h1>
            <p>{formatarTelefone(cliente.phone)}</p>
          </div>
        </header>

        {sucesso && (
          <div className="sweet-production-success">
            <strong>✓ {sucesso}</strong>
          </div>
        )}

        {erro && !modoEditar && (
          <div className="form-error">{erro}</div>
        )}

        <section className="customer-detail-summary">
          <div className="customer-summary-card">
            <span>Este mês</span>
            <strong>{dinheiro(gastoMes)}</strong>
            <small>em compras</small>
          </div>

          <div className="customer-summary-card">
            <span>Total</span>
            <strong>{dinheiro(totalGasto)}</strong>
            <small>
              {quantidadePedidos}{" "}
              {quantidadePedidos === 1 ? "pedido" : "pedidos"}
            </small>
          </div>

          <div className="customer-summary-card customer-summary-card-pending">
            <span>Pendente</span>
            <strong>{dinheiro(pendente)}</strong>
            <small>{pendente > 0 ? "a receber" : "tudo pago"}</small>
          </div>
        </section>

        <section className="customer-detail-profile">
          <div className="customer-detail-profile-header">
            <div>
              <span className="section-kicker">CADASTRO</span>
              <h2>Dados do cliente</h2>
            </div>

            {!modoEditar && (
              <button
                type="button"
                className="customer-detail-edit-button"
                onClick={() => {
                  setErro("");
                  setSucesso("");
                  setModoEditar(true);
                }}
              >
                Editar
              </button>
            )}
          </div>

          {!modoEditar ? (
            <div className="customer-detail-fields">
              <div>
                <span>Nome</span>
                <strong>{cliente.name}</strong>
              </div>

              <div>
                <span>Telefone</span>
                <strong>{formatarTelefone(cliente.phone)}</strong>
              </div>

              <div>
                <span>Cliente desde</span>
                <strong>{formatarData(cliente.created_at.slice(0, 10))}</strong>
              </div>

              {cliente.notes && (
                <div className="customer-detail-notes">
                  <span>Observação</span>
                  <strong>{cliente.notes}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="customer-detail-edit-form">
              <div className="form-group">
                <label>Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Telefone</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={telefone}
                  onChange={(event) => setTelefone(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Observação</label>
                <textarea
                  rows={3}
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                />
              </div>

              {erro && <div className="form-error">{erro}</div>}

              <div className="inventory-edit-actions">
                <button
                  type="button"
                  className="delete-modal-cancel"
                  onClick={() => {
                    setModoEditar(false);
                    setErro("");
                    setNome(cliente.name);
                    setTelefone(cliente.phone ?? "");
                    setObservacao(cliente.notes ?? "");
                  }}
                  disabled={salvando}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="inventory-save-button"
                  onClick={salvarEdicao}
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          )}

          {whatsappLink && !modoEditar && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="customer-whatsapp-button"
            >
              Abrir no WhatsApp
            </a>
          )}
        </section>

        <section className="customer-history-section">
          <div className="customer-history-header">
            <div>
              <span className="section-kicker">HISTÓRICO</span>
              <h2>Compras do cliente</h2>
              <p>
                Pedidos, valores e situação do pagamento.
              </p>
            </div>

            <div className="customer-history-filters">
              <button
                type="button"
                className={filtroHistorico === "todos" ? "active" : ""}
                onClick={() => setFiltroHistorico("todos")}
              >
                Todos
              </button>

              <button
                type="button"
                className={filtroHistorico === "pendentes" ? "active" : ""}
                onClick={() => setFiltroHistorico("pendentes")}
              >
                Pendentes
              </button>

              <button
                type="button"
                className={filtroHistorico === "pagos" ? "active" : ""}
                onClick={() => setFiltroHistorico("pagos")}
              >
                Pagos
              </button>
            </div>
          </div>

          {vendasFiltradas.length === 0 ? (
            <div className="empty-purchases">
              <strong>
                {filtroHistorico === "todos"
                  ? "Nenhuma compra registrada"
                  : filtroHistorico === "pendentes"
                    ? "Nenhuma compra pendente"
                    : "Nenhuma compra paga"}
              </strong>

              <p>
                {vendas.length === 0
                  ? "Quando uma venda for registrada, ela aparecerá aqui."
                  : "Não existem compras neste filtro."}
              </p>
            </div>
          ) : (
            <div className="customer-history-list">
              {vendasFiltradas.map((venda) => {
                const itens = itensDaVenda(venda.id);
                const valorPendente = Math.max(
                  0,
                  venda.total - venda.amount_paid
                );
                const cancelada = venda.payment_status === "canceled";
                const pago = !cancelada && valorPendente <= 0;

                return (
                  <article key={venda.id} className="customer-history-card">
                    <div className="customer-history-card-top">
                      <div>
                        <span className="customer-history-date">
                          {formatarData(venda.sale_date)}
                        </span>

                        <strong>
                          Pedido #{venda.id}
                        </strong>
                      </div>

                      <div className="customer-history-card-top-actions">
                        <span
                          className={
                            cancelada
                              ? "customer-history-status canceled"
                              : pago
                                ? "customer-history-status paid"
                                : "customer-history-status pending"
                          }
                        >
                          {cancelada
                            ? "Cancelada"
                            : pago
                              ? "Pago"
                              : venda.amount_paid > 0
                                ? "Parcial"
                                : "Pendente"}
                        </span>

                        {!cancelada && (
                          <div className="customer-sale-menu-wrapper">
                            <button
                              type="button"
                              className="customer-sale-menu-button"
                              aria-label={`Opções do pedido ${venda.id}`}
                              onClick={() =>
                                setMenuVendaId(
                                  menuVendaId === venda.id
                                    ? null
                                    : venda.id
                                )
                              }
                            >
                              ⋮
                            </button>

                            {menuVendaId === venda.id && (
                              <div className="customer-sale-menu">
                                <button
                                  type="button"
                                  className="customer-sale-menu-cancel"
                                  onClick={() => {
                                    setMenuVendaId(null);
                                    setErro("");
                                    setSucesso("");
                                    setVendaCancelando(venda);
                                  }}
                                >
                                  Cancelar venda
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="customer-history-products">
                      {itens.length === 0 ? (
                        <small>Itens não encontrados.</small>
                      ) : (
                        itens.map((item) => (
                          <div key={item.id}>
                            <div>
                              <span>
                                {Number.isInteger(item.quantity)
                                  ? item.quantity.toFixed(0)
                                  : item.quantity.toLocaleString("pt-BR")}
                                x {nomeItemParaCliente(item)}
                              </span>

                              {item.customer_details.length > 0 && (
                                <small className="customer-history-item-details">
                                  {item.customer_details
                                    .map(
                                      (detalhe) =>
                                        `${detalhe.label}: ${detalhe.value}`
                                    )
                                    .join(" • ")}
                                </small>
                              )}
                            </div>

                            <strong>{dinheiro(item.subtotal)}</strong>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="customer-history-values">
                      {venda.discount_amount > 0 && (
                        <>
                          <div>
                            <span>Subtotal</span>
                            <strong>{dinheiro(venda.subtotal)}</strong>
                          </div>

                          <div>
                            <span>Desconto</span>
                            <strong>- {dinheiro(venda.discount_amount)}</strong>
                          </div>
                        </>
                      )}

                      <div>
                        <span>Total</span>
                        <strong>{dinheiro(venda.total)}</strong>
                      </div>

                      {venda.amount_paid > 0 && (
                        <div>
                          <span>Pago</span>
                          <strong>{dinheiro(venda.amount_paid)}</strong>
                        </div>
                      )}

                      {!cancelada && !pago && venda.amount_paid > 0 && (
                        <div className="pending">
                          <span>Falta pagar</span>
                          <strong>{dinheiro(valorPendente)}</strong>
                        </div>
                      )}
                    </div>

                    <div className="customer-history-meta">
                      <span>
                        {cancelada
                          ? "Venda cancelada"
                          : `Pagamento: ${nomeFormaPagamento(venda.payment_method)}`}
                      </span>

                      {venda.notes && <span>{venda.notes}</span>}
                    </div>

                    {!cancelada && !pago && (
                      <div className="customer-history-actions">
                        <button
                          type="button"
                          className="customer-whatsapp-action"
                          onClick={() => abrirWhatsAppCobranca(venda)}
                          disabled={!cliente.phone_normalized}
                        >
                          Enviar cobrança no WhatsApp
                        </button>

                        <button
                          type="button"
                          className="customer-paid-action"
                          onClick={() => marcarComoPago(venda)}
                          disabled={marcandoPagoId === venda.id}
                        >
                          {marcandoPagoId === venda.id
                            ? "Salvando..."
                            : "Marcar como pago"}
                        </button>
                      </div>
                    )}

                    {!cancelada && !pago && !cliente.phone_normalized && (
                      <small className="customer-pending-no-phone">
                        Cadastre um telefone para enviar a cobrança pelo
                        WhatsApp.
                      </small>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {vendaCancelando && (
        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (!cancelandoVendaId) {
              setVendaCancelando(null);
              setErro("");
            }
          }}
        >
          <div
            className="inventory-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Cancelar venda?</h2>

            <p>
              Pedido <strong>#{vendaCancelando.id}</strong> de{" "}
              <strong>{dinheiro(vendaCancelando.total)}</strong>.
            </p>

            <div className="sweet-delete-warning">
              <strong>
                {vendaCancelando.payment_status === "paid"
                  ? "Esta venda já está marcada como paga"
                  : "O pedido não será apagado"}
              </strong>
              <span>
                {vendaCancelando.payment_status === "paid"
                  ? "Ao cancelar, ela sairá dos totais financeiros e o estoque usado na venda será devolvido."
                  : "Ela ficará marcada como cancelada, deixará de contar nos totais financeiros e o estoque usado na venda será devolvido."}
              </span>
            </div>

            {erro && <div className="form-error">{erro}</div>}

            <div className="inventory-edit-actions">
              <button
                type="button"
                className="delete-modal-cancel"
                onClick={() => {
                  setVendaCancelando(null);
                  setErro("");
                }}
                disabled={cancelandoVendaId === vendaCancelando.id}
              >
                Voltar
              </button>

              <button
                type="button"
                className="sweet-delete-confirm-button"
                onClick={cancelarVenda}
                disabled={cancelandoVendaId === vendaCancelando.id}
              >
                {cancelandoVendaId === vendaCancelando.id
                  ? "Cancelando..."
                  : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

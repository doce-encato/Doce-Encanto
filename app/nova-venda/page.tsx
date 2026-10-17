"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: number;
  name: string;
  phone: string | null;
  phone_normalized: string | null;
};

type DetalheCliente = {
  label: string;
  value: string;
};

type ProdutoVenda = {
  key: string;
  type: "sweet" | "custom";
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number | null;
  customerName: string;
  customerDetails: DetalheCliente[];
};

type ItemCarrinho = ProdutoVenda & {
  quantity: number;
};

type Pagamento = "pending" | "paid" | "partial";
type TipoDesconto = "amount" | "percent";

type VendaFinalizada = {
  saleId: number;
  cliente: Cliente | null;
  itens: ItemCarrinho[];
  subtotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  paymentStatus: Pagamento;
};

function normalizarTelefone(valor: string) {
  return valor.replace(/\D/g, "");
}

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function hojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarData(valor: string) {
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function numeroDecimal(valor: string) {
  const limpo = valor.trim().replace(/\s/g, "");

  if (!limpo) return 0;

  if (limpo.includes(",")) {
    return Number(limpo.replace(/\./g, "").replace(",", "."));
  }

  return Number(limpo);
}

function nomeCategoriaParaCliente(valor: string) {
  const nome = valor.trim();

  if (nome.length > 3 && nome.toLowerCase().endsWith("s")) {
    return nome.slice(0, -1);
  }

  return nome;
}

export default function NovaVendaPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<ProdutoVenda[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const [clienteSelecionado, setClienteSelecionado] =
    useState<Cliente | null>(null);
  const [buscaCliente, setBuscaCliente] = useState("");

  const [buscaProduto, setBuscaProduto] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [mostrarMaisProdutos, setMostrarMaisProdutos] = useState(false);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);

  const [dataVenda, setDataVenda] = useState(hojeISO());

  // Pendente primeiro e como padrão.
  const [pagamento, setPagamento] = useState<Pagamento>("pending");
  const [valorParcial, setValorParcial] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");

  const [tipoDesconto, setTipoDesconto] =
    useState<TipoDesconto>("amount");
  const [valorDesconto, setValorDesconto] = useState("");

  const [observacao, setObservacao] = useState("");

  const [mostrarNovoCliente, setMostrarNovoCliente] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [salvandoCliente, setSalvandoCliente] = useState(false);

  const [vendaFinalizada, setVendaFinalizada] =
    useState<VendaFinalizada | null>(null);

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    const [
      clientesResp,
      docesResp,
      personalizadosResp,
      escolhasResp,
      opcoesResp,
      partesResp,
      categoriasResp,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name, phone, phone_normalized")
        .order("name", { ascending: true }),

      supabase
        .from("sweets")
        .select("id, name, category_id, quantity, sale_price, is_customizable")
        .eq("is_customizable", false)
        .order("name", { ascending: true }),

      supabase
        .from("sweet_custom_creations")
        .select("id, sweet_id, name, sale_price")
        .eq("is_archived", false)
        .order("name", { ascending: true }),

      supabase
        .from("sweet_custom_creation_choices")
        .select("creation_id, option_id"),

      supabase
        .from("sweet_part_options")
        .select("id, part_id, name, quantity"),

      supabase
        .from("sweet_parts")
        .select("id, name"),

      supabase
        .from("sweet_categories")
        .select("id, name"),
    ]);

    const respostas = [
      clientesResp,
      docesResp,
      personalizadosResp,
      escolhasResp,
      opcoesResp,
      partesResp,
      categoriasResp,
    ];

    const respostaComErro = respostas.find((resposta) => resposta.error);

    if (respostaComErro?.error) {
      console.error(respostaComErro.error);
      setErro("Não foi possível carregar os dados da venda.");
      setCarregando(false);
      return;
    }

    const categoriasMap = new Map<number, string>(
      (categoriasResp.data ?? []).map((item) => [
        Number(item.id),
        String(item.name),
      ])
    );

    const docesPorId = new Map<
      number,
      { category_id: number; name: string }
    >(
      (docesResp.data ?? []).map((item) => [
        Number(item.id),
        {
          category_id: Number(item.category_id),
          name: String(item.name),
        },
      ])
    );

    const { data: docesBasePersonalizados, error: docesBaseError } =
      await supabase
        .from("sweets")
        .select("id, category_id, name")
        .eq("is_customizable", true);

    if (docesBaseError) {
      console.error(docesBaseError);
      setErro("Não foi possível carregar os personalizados.");
      setCarregando(false);
      return;
    }

    (docesBasePersonalizados ?? []).forEach((item) => {
      docesPorId.set(Number(item.id), {
        category_id: Number(item.category_id),
        name: String(item.name),
      });
    });

    const opcoesMap = new Map<
      number,
      { part_id: number; name: string; quantity: number }
    >(
      (opcoesResp.data ?? []).map((item) => [
        Number(item.id),
        {
          part_id: Number(item.part_id),
          name: String(item.name),
          quantity: Number(item.quantity ?? 0),
        },
      ])
    );

    const partesMap = new Map<number, string>(
      (partesResp.data ?? []).map((item) => [
        Number(item.id),
        String(item.name),
      ])
    );

    const escolhasPorCriacao = new Map<number, number[]>();

    (escolhasResp.data ?? []).forEach((item) => {
      const criacaoId = Number(item.creation_id);
      const optionId = Number(item.option_id);
      const atual = escolhasPorCriacao.get(criacaoId) ?? [];

      atual.push(optionId);
      escolhasPorCriacao.set(criacaoId, atual);
    });

    const clientesConvertidos: Cliente[] = (clientesResp.data ?? []).map(
      (item) => ({
        id: Number(item.id),
        name: String(item.name),
        phone: item.phone ? String(item.phone) : null,
        phone_normalized: item.phone_normalized
          ? String(item.phone_normalized)
          : null,
      })
    );

    const produtosNormais: ProdutoVenda[] = (docesResp.data ?? []).map(
      (item) => ({
        key: `sweet-${item.id}`,
        type: "sweet",
        id: Number(item.id),
        name: String(item.name),
        category:
          categoriasMap.get(Number(item.category_id)) ?? "Sem categoria",
        price: Number(item.sale_price ?? 0),
        stock: Number(item.quantity ?? 0),
        customerName: `${nomeCategoriaParaCliente(
          categoriasMap.get(Number(item.category_id)) ?? "Doce"
        )} ${String(item.name)}`.trim(),
        customerDetails: [],
      })
    );

    const produtosPersonalizados: ProdutoVenda[] =
      (personalizadosResp.data ?? []).map((item) => {
        const base = docesPorId.get(Number(item.sweet_id));
        const escolhaIds = escolhasPorCriacao.get(Number(item.id)) ?? [];

        const opcoesEscolhidas = escolhaIds
          .map((optionId) => opcoesMap.get(optionId))
          .filter(
            (opcao): opcao is {
              part_id: number;
              name: string;
              quantity: number;
            } => Boolean(opcao)
          );

        const quantidades = opcoesEscolhidas
          .map((opcao) => opcao.quantity)
          .filter((valor) => Number.isFinite(valor));

        const detalhesPorParte = new Map<number, string[]>();

        opcoesEscolhidas.forEach((opcao) => {
          const atual = detalhesPorParte.get(opcao.part_id) ?? [];
          atual.push(opcao.name);
          detalhesPorParte.set(opcao.part_id, atual);
        });

        const customerDetails: DetalheCliente[] = Array.from(
          detalhesPorParte.entries()
        ).map(([partId, nomes]) => ({
          label: partesMap.get(partId) ?? "Opção",
          value: nomes.join(" + "),
        }));

        const categoriaDoProduto = base
          ? categoriasMap.get(base.category_id) ?? "Doce"
          : "Doce";

        return {
          key: `custom-${item.id}`,
          type: "custom",
          id: Number(item.id),
          name: String(item.name),
          category: categoriaDoProduto,
          price: Number(item.sale_price ?? 0),
          stock:
            quantidades.length > 0 ? Math.min(...quantidades) : null,
          customerName: `${nomeCategoriaParaCliente(
            categoriaDoProduto
          )} personalizado`,
          customerDetails,
        };
      });

    setClientes(clientesConvertidos);
    setProdutos([...produtosNormais, ...produtosPersonalizados]);
    setCarregando(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();

    if (!termo) {
      return clientes.slice(0, 5);
    }

    return clientes
      .filter((cliente) =>
        cliente.name.toLowerCase().includes(termo)
      )
      .slice(0, 8);
  }, [clientes, buscaCliente]);

  const categorias = useMemo(() => {
    const nomes = Array.from(
      new Set(produtos.map((produto) => produto.category))
    );

    return ["Todos", ...nomes.sort((a, b) => a.localeCompare(b, "pt-BR"))];
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.trim().toLowerCase();

    return produtos.filter((produto) => {
      const bateCategoria =
        categoria === "Todos" || produto.category === categoria;

      const bateBusca =
        !termo ||
        produto.name.toLowerCase().includes(termo) ||
        produto.category.toLowerCase().includes(termo);

      return bateCategoria && bateBusca;
    });
  }, [produtos, buscaProduto, categoria]);

  const produtosVisiveis = useMemo(() => {
    // Quando há busca, mostra todos os resultados encontrados.
    if (buscaProduto.trim()) return produtosFiltrados;

    return mostrarMaisProdutos
      ? produtosFiltrados
      : produtosFiltrados.slice(0, 6);
  }, [produtosFiltrados, mostrarMaisProdutos, buscaProduto]);

  useEffect(() => {
    setMostrarMaisProdutos(false);
  }, [categoria, buscaProduto]);

  const subtotal = useMemo(
    () =>
      carrinho.reduce(
        (soma, item) => soma + item.price * item.quantity,
        0
      ),
    [carrinho]
  );

  const descontoInformado = useMemo(() => {
    const numero = numeroDecimal(valorDesconto);
    return Number.isFinite(numero) ? Math.max(0, numero) : 0;
  }, [valorDesconto]);

  const descontoAplicado = useMemo(() => {
    if (subtotal <= 0) return 0;

    if (tipoDesconto === "percent") {
      const percentual = Math.min(descontoInformado, 100);
      return Math.min(subtotal, subtotal * (percentual / 100));
    }

    return Math.min(descontoInformado, subtotal);
  }, [subtotal, tipoDesconto, descontoInformado]);

  const total = Math.max(0, subtotal - descontoAplicado);

  const valorPago = useMemo(() => {
    if (pagamento === "paid") return total;
    if (pagamento === "pending") return 0;

    const convertido = numeroDecimal(valorParcial);

    if (!Number.isFinite(convertido)) return 0;

    return Math.max(0, Math.min(convertido, total));
  }, [pagamento, valorParcial, total]);

  const valorPendente = Math.max(0, total - valorPago);

  function quantidadeNoCarrinho(produto: ProdutoVenda) {
    return (
      carrinho.find((item) => item.key === produto.key)?.quantity ?? 0
    );
  }

  function adicionarProduto(produto: ProdutoVenda) {
    setCarrinho((atual) => {
      const existente = atual.find((item) => item.key === produto.key);

      if (existente) {
        return atual.map((item) =>
          item.key === produto.key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...atual, { ...produto, quantity: 1 }];
    });
  }

  function alterarQuantidade(key: string, diferenca: number) {
    setCarrinho((atual) =>
      atual
        .map((item) =>
          item.key === key
            ? { ...item, quantity: item.quantity + diferenca }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  async function cadastrarClienteRapido() {
    setErro("");

    if (!novoNome.trim()) {
      setErro("Digite o nome do cliente.");
      return;
    }

    const telefoneNormalizado = normalizarTelefone(novoTelefone);

    if (novoTelefone.trim() && telefoneNormalizado.length < 10) {
      setErro("Informe um telefone válido ou deixe o campo vazio.");
      return;
    }

    if (telefoneNormalizado) {
      const existente = clientes.find(
        (cliente) => cliente.phone_normalized === telefoneNormalizado
      );

      if (existente) {
        setClienteSelecionado(existente);
        setBuscaCliente(existente.name);
        setMostrarNovoCliente(false);
        setNovoNome("");
        setNovoTelefone("");
        setAviso(
          `Esse telefone já era de ${existente.name}. Usei o cadastro existente.`
        );
        return;
      }
    }

    setSalvandoCliente(true);

    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: novoNome.trim(),
        phone: novoTelefone.trim() || null,
      })
      .select("id, name, phone, phone_normalized")
      .single();

    if (error || !data) {
      console.error(error);
      setErro("Não foi possível cadastrar o cliente.");
      setSalvandoCliente(false);
      return;
    }

    const novo: Cliente = {
      id: Number(data.id),
      name: String(data.name),
      phone: data.phone ? String(data.phone) : null,
      phone_normalized: data.phone_normalized
        ? String(data.phone_normalized)
        : null,
    };

    setClientes((atual) =>
      [...atual, novo].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      )
    );

    setClienteSelecionado(novo);
    setBuscaCliente(novo.name);
    setNovoNome("");
    setNovoTelefone("");
    setMostrarNovoCliente(false);
    setSalvandoCliente(false);
    setAviso("Cliente cadastrado e selecionado.");
  }

  async function finalizarVenda() {
    setErro("");
    setAviso("");

    if (carrinho.length === 0) {
      setErro("Adicione pelo menos um produto.");
      return;
    }

    if (tipoDesconto === "percent" && descontoInformado > 100) {
      setErro("O desconto em porcentagem não pode ser maior que 100%.");
      return;
    }

    if (pagamento === "partial") {
      if (valorPago <= 0 || valorPago >= total) {
        setErro(
          "No pagamento parcial, informe um valor maior que zero e menor que o total."
        );
        return;
      }
    }

    setSalvando(true);

    const itensRpc = carrinho.map((item) => ({
      type: item.type,
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      customer_name: item.customerName,
      customer_details: item.customerDetails,
    }));

    const { data, error } = await supabase.rpc("create_sale_with_stock", {
      p_customer_id: clienteSelecionado?.id ?? null,
      p_sale_date: dataVenda,
      p_amount_paid: valorPago,
      p_payment_method:
        pagamento === "pending" ? null : formaPagamento || null,
      p_notes: observacao.trim() || null,
      p_items: itensRpc,
      p_discount_type:
        descontoAplicado > 0 ? tipoDesconto : null,
      p_discount_value:
        descontoAplicado > 0 ? descontoInformado : 0,
    });

    if (error) {
      console.error(error);
      setErro("Não foi possível finalizar a venda.");
      setSalvando(false);
      return;
    }

    const retorno = Array.isArray(data) ? data[0] : data;
    const saleId = Number(retorno?.sale_id ?? 0);
    const warnings = Array.isArray(retorno?.stock_warnings)
      ? retorno.stock_warnings
      : [];

    // Salva um retrato do texto que deve aparecer para o cliente.
    // Assim, se o personalizado for editado depois, vendas antigas
    // continuam mostrando exatamente o que foi vendido naquele dia.
    if (saleId > 0) {
      const { data: itensSalvos, error: itensSalvosError } = await supabase
        .from("sale_items")
        .select("id, sweet_id, custom_creation_id")
        .eq("sale_id", saleId);

      if (itensSalvosError) {
        console.error(itensSalvosError);
      } else {
        await Promise.all(
          (itensSalvos ?? []).map((itemSalvo) => {
            const produto = carrinho.find((item) =>
              item.type === "sweet"
                ? Number(itemSalvo.sweet_id) === item.id
                : Number(itemSalvo.custom_creation_id) === item.id
            );

            if (!produto) return Promise.resolve();

            return supabase
              .from("sale_items")
              .update({
                customer_name: produto.customerName,
                customer_details: produto.customerDetails,
              })
              .eq("id", itemSalvo.id);
          })
        );
      }
    }

    setVendaFinalizada({
      saleId,
      cliente: clienteSelecionado,
      itens: carrinho,
      subtotal,
      discountAmount: descontoAplicado,
      total,
      amountPaid: valorPago,
      paymentStatus: pagamento,
    });

    if (warnings.length > 0) {
      setAviso(
        `Venda salva. Atenção: ${warnings
          .map((item: { item?: string }) => item.item)
          .filter(Boolean)
          .join(", ")} ficou com estoque zerado.`
      );
    } else {
      setAviso("Venda finalizada com sucesso.");
    }

    setSalvando(false);
    await carregarDados();
  }

  function montarMensagemResumo(venda: VendaFinalizada) {
    const linhas: string[] = [];

    linhas.push(`Oi, ${venda.cliente?.name ?? "tudo bem"}! Tudo bem?`);
    linhas.push("");
    linhas.push(`Seu pedido de ${formatarData(dataVenda)} ficou assim:`);
    linhas.push("");

    venda.itens.forEach((item, index) => {
      linhas.push(
        `${item.quantity}x ${item.customerName} — ${dinheiro(
          item.price * item.quantity
        )}`
      );

      item.customerDetails.forEach((detalhe) => {
        linhas.push(`${detalhe.label}: ${detalhe.value}`);
      });

      if (item.customerDetails.length > 0 && index < venda.itens.length - 1) {
        linhas.push("");
      }
    });

    linhas.push("");

    if (venda.discountAmount > 0) {
      linhas.push(`Subtotal: ${dinheiro(venda.subtotal)}`);
      linhas.push(`Desconto: - ${dinheiro(venda.discountAmount)}`);
    }

    linhas.push(`Total: ${dinheiro(venda.total)}`);

    if (venda.amountPaid > 0 && venda.amountPaid < venda.total) {
      linhas.push(`Já pago: ${dinheiro(venda.amountPaid)}`);
      linhas.push(
        `Falta pagar: ${dinheiro(venda.total - venda.amountPaid)}`
      );
    }

    linhas.push("");

    if (venda.amountPaid <= 0) {
      linhas.push(
        "Você gostaria de fazer o pagamento via Pix ou cartão?"
      );
    } else if (venda.amountPaid < venda.total) {
      linhas.push(
        "Se preferir, posso te passar as informações para pagamento via Pix ou cartão."
      );
    } else {
      linhas.push("Pagamento recebido. Muito obrigada!");
    }

    return linhas.join("\n");
  }

  function enviarResumoWhatsApp() {
    if (!vendaFinalizada?.cliente?.phone_normalized) {
      setErro(
        "Esse cliente não possui telefone cadastrado para abrir o WhatsApp."
      );
      return;
    }

    let numero = vendaFinalizada.cliente.phone_normalized;

    if (numero.length === 10 || numero.length === 11) {
      numero = `55${numero}`;
    }

    const mensagem = encodeURIComponent(
      montarMensagemResumo(vendaFinalizada)
    );

    window.open(
      `https://wa.me/${numero}?text=${mensagem}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function novaVenda() {
    setCarrinho([]);
    setClienteSelecionado(null);
    setBuscaCliente("");
    setBuscaProduto("");
    setCategoria("Todos");
    setMostrarMaisProdutos(false);
    setDataVenda(hojeISO());
    setPagamento("pending");
    setValorParcial("");
    setFormaPagamento("pix");
    setTipoDesconto("amount");
    setValorDesconto("");
    setObservacao("");
    setVendaFinalizada(null);
    setErro("");
    setAviso("");
  }

  if (carregando && produtos.length === 0) {
    return (
      <main className="compras-page">
        <div className="page-shell">
          <div className="empty-purchases">
            <strong>Carregando nova venda...</strong>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="compras-page">
      <div className="page-shell sale-page-shell">
        <header className="page-header">
          <Link href="/" className="back-button">
            ←
          </Link>

          <div>
            <span className="page-kicker">VENDAS</span>
            <h1>Nova venda</h1>
            <p>Escolha o cliente, os produtos e finalize o pagamento.</p>
          </div>
        </header>

        {erro && <div className="form-error">{erro}</div>}

        {aviso && (
          <div className="sweet-production-success">
            <strong>✓ {aviso}</strong>
          </div>
        )}

        {vendaFinalizada ? (
          <section className="sale-success-card">
            <span className="section-kicker">VENDA FINALIZADA</span>
            <h2>Pedido #{vendaFinalizada.saleId}</h2>

            <div className="sale-success-total">
              <span>Total</span>
              <strong>{dinheiro(vendaFinalizada.total)}</strong>
            </div>

            <div className="sale-success-actions">
              {vendaFinalizada.cliente?.phone_normalized && (
                <button
                  type="button"
                  className="sale-whatsapp-button"
                  onClick={enviarResumoWhatsApp}
                >
                  Enviar resumo no WhatsApp
                </button>
              )}

              <button
                type="button"
                className="inventory-add-button"
                onClick={novaVenda}
              >
                + Nova venda
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="sale-section">
              <div className="sale-section-title">
                <div>
                  <span className="section-kicker">1. CLIENTE</span>
                  <h2>Quem está comprando?</h2>
                </div>

                <button
                  type="button"
                  className="sale-small-button"
                  onClick={() => {
                    setErro("");
                    setMostrarNovoCliente(true);
                  }}
                >
                  + Novo cliente
                </button>
              </div>

              {clienteSelecionado ? (
                <div className="sale-selected-customer">
                  <div>
                    <strong>{clienteSelecionado.name}</strong>
                    <span>
                      {clienteSelecionado.phone ?? "Sem telefone cadastrado"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setClienteSelecionado(null);
                      setBuscaCliente("");
                    }}
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <>
                  <div className="customer-search sale-customer-search">
                    <span>⌕</span>

                    <input
                      type="text"
                      value={buscaCliente}
                      onChange={(event) => setBuscaCliente(event.target.value)}
                      placeholder="Buscar cliente pelo nome..."
                    />
                  </div>

                  <div className="sale-customer-results">
                    {clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => {
                          setClienteSelecionado(cliente);
                          setBuscaCliente(cliente.name);
                        }}
                      >
                        <strong>{cliente.name}</strong>
                        <span>{cliente.phone ?? "Sem telefone"}</span>
                      </button>
                    ))}
                  </div>

                  {!buscaCliente && clientes.length > 5 && (
                    <small className="sale-list-hint">
                      Mostrando 5 clientes. Use a busca para encontrar outro.
                    </small>
                  )}
                </>
              )}
            </section>

            <section className="sale-section">
              <div className="sale-section-title">
                <div>
                  <span className="section-kicker">2. PRODUTOS</span>
                  <h2>Adicionar ao pedido</h2>
                </div>

                <span className="sale-item-count">
                  {carrinho.reduce((soma, item) => soma + item.quantity, 0)} itens
                </span>
              </div>

              <div className="customer-search">
                <span>⌕</span>

                <input
                  type="text"
                  value={buscaProduto}
                  onChange={(event) => setBuscaProduto(event.target.value)}
                  placeholder="Buscar doce..."
                />
              </div>

              <div className="sale-category-chips">
                {categorias.map((nomeCategoria) => (
                  <button
                    key={nomeCategoria}
                    type="button"
                    className={
                      categoria === nomeCategoria ? "active" : ""
                    }
                    onClick={() => setCategoria(nomeCategoria)}
                  >
                    {nomeCategoria}
                  </button>
                ))}
              </div>

              <div className="sale-product-list">
                {produtosVisiveis.length === 0 ? (
                  <div className="empty-purchases">
                    <strong>Nenhum produto encontrado</strong>
                  </div>
                ) : (
                  produtosVisiveis.map((produto) => {
                    const quantidade = quantidadeNoCarrinho(produto);

                    return (
                      <article key={produto.key} className="sale-product-card">
                        <div>
                          <span>{produto.category}</span>
                          <strong>{produto.name}</strong>

                          <small>
                            {produto.stock === null
                              ? "Estoque conforme componentes"
                              : `Disponível: ${produto.stock}`}
                          </small>
                        </div>

                        <div className="sale-product-right">
                          <strong>{dinheiro(produto.price)}</strong>

                          {quantidade === 0 ? (
                            <button
                              type="button"
                              onClick={() => adicionarProduto(produto)}
                            >
                              + Adicionar
                            </button>
                          ) : (
                            <div className="sale-quantity-control">
                              <button
                                type="button"
                                aria-label={`Diminuir ${produto.name}`}
                                onClick={() =>
                                  alterarQuantidade(produto.key, -1)
                                }
                              >
                                −
                              </button>

                              <strong>{quantidade}</strong>

                              <button
                                type="button"
                                aria-label={`Aumentar ${produto.name}`}
                                onClick={() =>
                                  alterarQuantidade(produto.key, 1)
                                }
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              {!buscaProduto &&
                produtosFiltrados.length > 6 && (
                  <button
                    type="button"
                    className="sale-show-more-button"
                    onClick={() =>
                      setMostrarMaisProdutos((atual) => !atual)
                    }
                  >
                    {mostrarMaisProdutos
                      ? "Mostrar menos"
                      : `Ver mais produtos (${produtosFiltrados.length - 6})`}
                  </button>
                )}
            </section>

            <section className="sale-section">
              <div className="sale-section-title">
                <div>
                  <span className="section-kicker">3. RESUMO</span>
                  <h2>Conferir venda</h2>
                </div>
              </div>

              {carrinho.length === 0 ? (
                <div className="empty-purchases">
                  <strong>Nenhum item adicionado</strong>
                  <p>Escolha os produtos acima para montar o pedido.</p>
                </div>
              ) : (
                <div className="sale-cart">
                  {carrinho.map((item) => (
                    <div key={item.key} className="sale-cart-item">
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {item.quantity} × {dinheiro(item.price)}
                        </span>
                      </div>

                      <strong>
                        {dinheiro(item.price * item.quantity)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="sale-discount-box">
                <div className="sale-discount-header">
                  <div>
                    <span className="section-kicker">DESCONTO</span>
                    <strong>Teve desconto?</strong>
                  </div>

                  <div className="sale-discount-type">
                    <button
                      type="button"
                      className={tipoDesconto === "amount" ? "active" : ""}
                      onClick={() => setTipoDesconto("amount")}
                    >
                      R$
                    </button>

                    <button
                      type="button"
                      className={tipoDesconto === "percent" ? "active" : ""}
                      onClick={() => setTipoDesconto("percent")}
                    >
                      %
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    {tipoDesconto === "amount"
                      ? "Valor do desconto"
                      : "Porcentagem do desconto"}
                  </label>

                  <div className="sale-discount-input">
                    <span>
                      {tipoDesconto === "amount" ? "R$" : "%"}
                    </span>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={valorDesconto}
                      onChange={(event) =>
                        setValorDesconto(event.target.value)
                      }
                      placeholder={
                        tipoDesconto === "amount" ? "0,00" : "0"
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="sale-totals-box">
                <div>
                  <span>Subtotal</span>
                  <strong>{dinheiro(subtotal)}</strong>
                </div>

                {descontoAplicado > 0 && (
                  <div className="discount">
                    <span>Desconto</span>
                    <strong>- {dinheiro(descontoAplicado)}</strong>
                  </div>
                )}

                <div className="grand-total">
                  <span>Total</span>
                  <strong>{dinheiro(total)}</strong>
                </div>
              </div>

              <div className="sale-form-grid">
                <div className="form-group">
                  <label>Data da venda</label>

                  <input
                    type="date"
                    value={dataVenda}
                    onChange={(event) => setDataVenda(event.target.value)}
                  />
                </div>

                <div className="form-group sale-payment-field">
                  <label>Situação do pagamento</label>

                  <div className="sale-payment-options sale-payment-options-large">
                    <button
                      type="button"
                      className={pagamento === "pending" ? "active" : ""}
                      onClick={() => setPagamento("pending")}
                    >
                      <strong>Pendente</strong>
                      <span>Ainda não pagou</span>
                    </button>

                    <button
                      type="button"
                      className={pagamento === "paid" ? "active" : ""}
                      onClick={() => setPagamento("paid")}
                    >
                      <strong>Pago</strong>
                      <span>Valor quitado</span>
                    </button>

                    <button
                      type="button"
                      className={pagamento === "partial" ? "active" : ""}
                      onClick={() => setPagamento("partial")}
                    >
                      <strong>Parcial</strong>
                      <span>Pagou uma parte</span>
                    </button>
                  </div>
                </div>

                {pagamento === "partial" && (
                  <div className="form-group">
                    <label>Quanto já foi pago?</label>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={valorParcial}
                      onChange={(event) =>
                        setValorParcial(event.target.value)
                      }
                      placeholder="0,00"
                    />
                  </div>
                )}

                {pagamento !== "pending" && (
                  <div className="form-group">
                    <label>Forma de pagamento</label>

                    <select
                      value={formaPagamento}
                      onChange={(event) =>
                        setFormaPagamento(event.target.value)
                      }
                    >
                      <option value="pix">Pix</option>
                      <option value="card">Cartão</option>
                      <option value="cash">Dinheiro</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                )}

                <div className="form-group sale-notes-field">
                  <label>Observação</label>

                  <textarea
                    rows={3}
                    value={observacao}
                    onChange={(event) =>
                      setObservacao(event.target.value)
                    }
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="sale-payment-summary">
                <div>
                  <span>Pago</span>
                  <strong>{dinheiro(valorPago)}</strong>
                </div>

                <div>
                  <span>Pendente</span>
                  <strong>{dinheiro(valorPendente)}</strong>
                </div>
              </div>

              <button
                type="button"
                className="sale-finish-button"
                onClick={finalizarVenda}
                disabled={salvando || carrinho.length === 0}
              >
                {salvando
                  ? "Finalizando..."
                  : `Finalizar venda — ${dinheiro(total)}`}
              </button>
            </section>
          </>
        )}
      </div>

      {mostrarNovoCliente && (
        <div
          className="sweet-modal-overlay"
          onClick={() => {
            if (!salvandoCliente) {
              setMostrarNovoCliente(false);
              setErro("");
            }
          }}
        >
          <div
            className="sweet-modal-box customer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="sweet-modal-close"
              onClick={() => {
                if (!salvandoCliente) {
                  setMostrarNovoCliente(false);
                  setErro("");
                }
              }}
            >
              ×
            </button>

            <span className="page-kicker">NOVO CLIENTE</span>
            <h2>Cadastro rápido</h2>

            <div className="form-group">
              <label>Nome</label>

              <input
                type="text"
                value={novoNome}
                onChange={(event) => setNovoNome(event.target.value)}
                placeholder="Ex.: Maria Silva"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Telefone</label>

              <input
                type="tel"
                inputMode="tel"
                value={novoTelefone}
                onChange={(event) =>
                  setNovoTelefone(event.target.value)
                }
                placeholder="Ex.: (11) 99999-9999"
              />
            </div>

            {erro && <div className="form-error">{erro}</div>}

            <button
              type="button"
              className="inventory-save-button"
              onClick={cadastrarClienteRapido}
              disabled={salvandoCliente}
            >
              {salvandoCliente ? "Cadastrando..." : "Cadastrar e usar"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  total: number;
  amount_paid: number;
  payment_status:
    | "paid"
    | "pending"
    | "partial"
    | "canceled";
  canceled_at: string | null;
};

type ItemVenda = {
  sale_id: number;
  item_name: string;
  quantity: number;
};

type ResumoCliente = {
  total: number;
  esteMes: number;
  pendente: number;
};

type ClientePendente = {
  cliente: Cliente;
  vendas: Venda[];
  valorPendente: number;
  quantidadePedidos: number;
};

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

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor: string) {
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [busca, setBusca] = useState("");

  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteExcluindo, setClienteExcluindo] = useState<Cliente | null>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [marcandoPagoId, setMarcandoPagoId] = useState<number | null>(null);

  const [mostrarPendentes, setMostrarPendentes] = useState(false);

  async function carregarTudo() {
    setCarregando(true);
    setErro("");

    const [clientesResposta, vendasResposta, itensResposta] = await Promise.all([
      supabase
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
        .order("name", { ascending: true }),

        

     supabase
  .from("sales")
  .select(`
    id,
    customer_id,
    sale_date,
    total,
    amount_paid,
    payment_status,
    canceled_at
  `)
  .order("sale_date", { ascending: false }),

      supabase
        .from("sale_items")
        .select(`
          sale_id,
          item_name,
          quantity
        `),
    ]);

    if (clientesResposta.error) {
      console.error(clientesResposta.error);
      setErro("Não foi possível carregar os clientes.");
      setCarregando(false);
      return;
    }

    if (vendasResposta.error) {
      console.error(vendasResposta.error);
      setErro(
        "Os clientes foram encontrados, mas a base de vendas ainda não está disponível. Rode o SQL de vendas primeiro."
      );
      setCarregando(false);
      return;
    }

    if (itensResposta.error) {
      console.error(itensResposta.error);
      setErro("Não foi possível carregar os itens das vendas.");
      setCarregando(false);
      return;
    }

   setClientes(
  (clientesResposta.data ?? []).map((item) => ({
    id: Number(item.id),
    name: String(item.name),
    phone: item.phone ? String(item.phone) : null,
    phone_normalized: item.phone_normalized
      ? String(item.phone_normalized)
      : null,
    notes: item.notes ? String(item.notes) : null,
    created_at: String(item.created_at),
    updated_at: String(item.updated_at),
  }))
);

setVendas(
  (vendasResposta.data ?? []).map((item) => ({
    id: Number(item.id),

    customer_id:
      item.customer_id === null
        ? null
        : Number(item.customer_id),

    sale_date:
      String(item.sale_date),

    total:
      Number(item.total ?? 0),

    amount_paid:
      Number(item.amount_paid ?? 0),

    payment_status:
      String(
        item.payment_status
      ) as Venda["payment_status"],

    canceled_at:
      item.canceled_at
        ? String(item.canceled_at)
        : null,
  }))
);

setItensVenda(
  (itensResposta.data ?? []).map((item) => ({
    sale_id: Number(item.sale_id),
    item_name: String(item.item_name),
    quantity: Number(item.quantity ?? 0),
  }))
);

setCarregando(false);
}

useEffect(() => {
  carregarTudo();
}, []);

const vendasAtivas = useMemo(
  () =>
    vendas.filter(
      (venda) =>
        venda.payment_status !== "canceled" &&
        !venda.canceled_at
    ),
  [vendas]
);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return clientes;

    const termoTelefone = normalizarTelefone(termo);

    return clientes.filter((cliente) => {
      const bateNome = cliente.name.toLowerCase().includes(termo);

      const bateTelefone =
        termoTelefone.length > 0 &&
        (cliente.phone_normalized ?? "").includes(termoTelefone);

      return bateNome || bateTelefone;
    });
  }, [clientes, busca]);

  const resumoPorCliente = useMemo(() => {
    const mapa = new Map<number, ResumoCliente>();

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth() + 1;

    clientes.forEach((cliente) => {
      mapa.set(cliente.id, {
        total: 0,
        esteMes: 0,
        pendente: 0,
      });
    });

    vendasAtivas.forEach((venda) => {
      if (!venda.customer_id) return;

      const atual = mapa.get(venda.customer_id);
      if (!atual) return;

      atual.total += venda.total;

      const [ano, mes] = venda.sale_date.split("-").map(Number);

      if (ano === anoAtual && mes === mesAtual) {
        atual.esteMes += venda.total;
      }

      atual.pendente += Math.max(0, venda.total - venda.amount_paid);
    });

    return mapa;
  }, [clientes, vendasAtivas]);
const valorPago = useMemo(() => {
  return vendasAtivas.reduce(
      (soma, venda) => soma + Math.min(venda.amount_paid, venda.total),
      0
    );
  }, [vendasAtivas]);

  const valorPendente = useMemo(() => {
    return vendasAtivas.reduce(
      (soma, venda) => soma + Math.max(0, venda.total - venda.amount_paid),
      0
    );
  }, [vendasAtivas]);

  const clientesPendentes = useMemo<ClientePendente[]>(() => {
    return clientes
      .map((cliente) => {
        const vendasDoCliente = vendasAtivas.filter(
          (venda) =>
            venda.customer_id === cliente.id &&
            Math.max(0, venda.total - venda.amount_paid) > 0
        );

        const pendente = vendasDoCliente.reduce(
          (soma, venda) =>
            soma + Math.max(0, venda.total - venda.amount_paid),
          0
        );

        return {
          cliente,
          vendas: vendasDoCliente,
          valorPendente: pendente,
          quantidadePedidos: vendasDoCliente.length,
        };
      })
      .filter((item) => item.valorPendente > 0)
      .sort((a, b) => b.valorPendente - a.valorPendente);
  }, [clientes, vendasAtivas]);

  function limparFormulario() {
    setNome("");
    setTelefone("");
    setObservacao("");
    setErro("");
  }

  function abrirNovoCliente() {
    setSucesso("");
    setClienteEditando(null);
    limparFormulario();
    setMostrarNovo(true);
  }

  function fecharFormulario() {
    if (salvando) return;

    setMostrarNovo(false);
    setClienteEditando(null);
    limparFormulario();
  }

  function abrirEdicao(cliente: Cliente) {
    setSucesso("");
    setErro("");
    setClienteEditando(cliente);
    setNome(cliente.name);
    setTelefone(cliente.phone ?? "");
    setObservacao(cliente.notes ?? "");
    setMostrarNovo(true);
  }

  async function salvarCliente() {
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
      const clienteDuplicado = clientes.find(
        (cliente) =>
          cliente.phone_normalized === telefoneNormalizado &&
          cliente.id !== clienteEditando?.id
      );

      if (clienteDuplicado) {
        setErro(
          `Este telefone já está cadastrado para ${clienteDuplicado.name}.`
        );
        return;
      }
    }

    setSalvando(true);

    if (clienteEditando) {
      const { error } = await supabase
        .from("customers")
        .update({
          name: nome.trim(),
          phone: telefone.trim() || null,
          notes: observacao.trim() || null,
        })
        .eq("id", clienteEditando.id);

      if (error) {
        console.error(error);
        setErro("Não foi possível editar o cliente.");
        setSalvando(false);
        return;
      }

      setSucesso("Cliente atualizado.");
    } else {
      const { error } = await supabase
        .from("customers")
        .insert({
          name: nome.trim(),
          phone: telefone.trim() || null,
          notes: observacao.trim() || null,
        });

      if (error) {
        console.error(error);

        if (String(error.message).toLowerCase().includes("duplicate")) {
          setErro("Já existe um cliente com este telefone.");
        } else {
          setErro("Não foi possível cadastrar o cliente.");
        }

        setSalvando(false);
        return;
      }

      setSucesso("Cliente cadastrado.");
    }

    setSalvando(false);
    setMostrarNovo(false);
    setClienteEditando(null);
    limparFormulario();

    await carregarTudo();
  }

  async function excluirCliente() {
    if (!clienteExcluindo) return;

    setExcluindo(true);
    setErro("");
    setSucesso("");

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", clienteExcluindo.id);

    if (error) {
      console.error(error);
      setErro(
        "Não foi possível excluir o cliente. Se ele já tiver vendas, o histórico deve ser preservado."
      );
      setExcluindo(false);
      return;
    }

    setClienteExcluindo(null);
    setExcluindo(false);
    setSucesso("Cliente excluído.");

    await carregarTudo();
  }

  function itensDaVenda(vendaId: number) {
    return itensVenda.filter((item) => item.sale_id === vendaId);
  }

  function montarMensagemCobranca(item: ClientePendente) {
    const linhas: string[] = [];

    linhas.push(`Oi, ${item.cliente.name}! Tudo bem? 😊`);
    linhas.push("");

    if (item.vendas.length === 1) {
      const venda = item.vendas[0];
      const itens = itensDaVenda(venda.id);

      linhas.push(
        `Passando para lembrar do pedido feito em ${formatarData(
          venda.sale_date
        )}:`
      );

      if (itens.length > 0) {
        linhas.push("");

        itens.forEach((produto) => {
          const quantidadeFormatada = Number.isInteger(produto.quantity)
            ? produto.quantity.toFixed(0)
            : produto.quantity.toLocaleString("pt-BR");

          linhas.push(`${quantidadeFormatada}x ${produto.item_name}`);
        });
      }

      linhas.push("");
      linhas.push(`Valor do pedido: ${dinheiro(venda.total)}`);

      if (venda.amount_paid > 0) {
        linhas.push(`Valor já pago: ${dinheiro(venda.amount_paid)}`);
      }

      linhas.push(
        `Valor pendente: ${dinheiro(
          Math.max(0, venda.total - venda.amount_paid)
        )}`
      );
    } else {
      linhas.push(
        `Você tem ${item.quantidadePedidos} pedidos com valores pendentes.`
      );
      linhas.push("");

      item.vendas.forEach((venda) => {
        linhas.push(
          `${formatarData(venda.sale_date)} — ${dinheiro(
            Math.max(0, venda.total - venda.amount_paid)
          )}`
        );
      });

      linhas.push("");
      linhas.push(`Total pendente: ${dinheiro(item.valorPendente)}`);
    }

    linhas.push("");
    linhas.push(
      "Quando puder, me avise sobre o pagamento. Se preferir, posso te passar as informações para pagamento via Pix ou cartão. 😊"
    );

    return linhas.join("\n");
  }

  function abrirWhatsAppCobranca(item: ClientePendente) {
    if (!item.cliente.phone_normalized) {
      setErro(
        `${item.cliente.name} não possui telefone cadastrado para abrir o WhatsApp.`
      );
      return;
    }

    let numero = item.cliente.phone_normalized;

    if (numero.length === 10 || numero.length === 11) {
      numero = `55${numero}`;
    }

    const mensagem = encodeURIComponent(montarMensagemCobranca(item));

    window.open(
      `https://wa.me/${numero}?text=${mensagem}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function marcarVendaComoPaga(venda: Venda) {
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

  return (
    <main className="compras-page">
      <div className="page-shell">
        <header className="page-header">
          <Link href="/" className="back-button">
            ←
          </Link>

          <div>
            <span className="page-kicker">CLIENTES</span>
            <h1>Clientes</h1>
            <p>Cadastre e encontre seus clientes rapidamente.</p>
          </div>
        </header>

        <section className="customer-summary-grid">
          <div className="customer-summary-card">
            <span>Clientes</span>
            <strong>{clientes.length}</strong>
            <small>cadastrados</small>
          </div>

          <div className="customer-summary-card">
            <span>Pago</span>
            <strong>{dinheiro(valorPago)}</strong>
            <small>valor recebido</small>
          </div>

          <button
            type="button"
            className="customer-summary-card customer-summary-card-clickable customer-summary-card-pending"
            onClick={() => {
              setErro("");
              setMostrarPendentes(true);
            }}
          >
            <span>Pendente</span>
            <strong>{dinheiro(valorPendente)}</strong>
            <small>toque para ver →</small>
          </button>
        </section>

        <div className="customer-toolbar">
          <button
            type="button"
            className="inventory-add-button"
            onClick={abrirNovoCliente}
          >
            + Novo cliente
          </button>

          <div className="customer-search">
            <span>⌕</span>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome..."
            />

            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {sucesso && (
          <div className="sweet-production-success">
            <strong>✓ {sucesso}</strong>
          </div>
        )}

        {erro && !mostrarNovo && !clienteExcluindo && !mostrarPendentes && (
          <div className="form-error">{erro}</div>
        )}

        <section className="customer-list-section">
          <div className="customer-list-title">
            <div>
              <span className="section-kicker">TODOS</span>
              <h2>Lista de clientes</h2>
            </div>

            <span>
              {clientesFiltrados.length}{" "}
              {clientesFiltrados.length === 1 ? "cliente" : "clientes"}
            </span>
          </div>

          {carregando ? (
            <div className="empty-purchases">
              <strong>Carregando clientes...</strong>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="empty-purchases">
              <strong>
                {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </strong>

              <p>
                {busca
                  ? "Tente buscar por outro nome."
                  : "Cadastre o primeiro cliente para começar."}
              </p>
            </div>
          ) : (
            <div className="customer-list">
              {clientesFiltrados.map((cliente) => {
                const resumo = resumoPorCliente.get(cliente.id) ?? {
                  total: 0,
                  esteMes: 0,
                  pendente: 0,
                };

                return (
                  <article key={cliente.id} className="customer-card">
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="customer-card-main customer-card-link"
                    >
                      <div className="customer-avatar">
                        {cliente.name.trim().charAt(0).toUpperCase()}
                      </div>

                      <div className="customer-card-info">
                        <strong>{cliente.name}</strong>

                        <span>{formatarTelefone(cliente.phone)}</span>

                        {cliente.notes && <small>{cliente.notes}</small>}
                      </div>

                      <span className="customer-card-open-arrow">›</span>
                    </Link>

                    <div className="customer-card-financial">
                      <div>
                        <span>Este mês</span>
                        <strong>{dinheiro(resumo.esteMes)}</strong>
                      </div>

                      <div>
                        <span>Total</span>
                        <strong>{dinheiro(resumo.total)}</strong>
                      </div>

                      {resumo.pendente > 0 ? (
                        <span className="customer-pending-badge">
                          Pendente {dinheiro(resumo.pendente)}
                        </span>
                      ) : (
                        <span className="customer-paid-badge">Tudo pago</span>
                      )}
                    </div>

                    <div className="customer-card-actions">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(cliente)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() => {
                          setErro("");
                          setClienteExcluindo(cliente);
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* NOVO / EDITAR CLIENTE */}
      {mostrarNovo && (
        <div className="sweet-modal-overlay" onClick={fecharFormulario}>
          <div
            className="sweet-modal-box customer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="sweet-modal-close"
              onClick={fecharFormulario}
            >
              ×
            </button>

            <span className="page-kicker">
              {clienteEditando ? "EDITAR CLIENTE" : "NOVO CLIENTE"}
            </span>

            <h2>
              {clienteEditando ? clienteEditando.name : "Cadastrar cliente"}
            </h2>

            <div className="form-group">
              <label>Nome</label>

              <input
                type="text"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex.: Maria Silva"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Telefone</label>

              <input
                type="tel"
                inputMode="tel"
                value={telefone}
                onChange={(event) => setTelefone(event.target.value)}
                placeholder="Ex.: (11) 99999-9999"
              />

              <small>
                O telefone ajuda a evitar clientes duplicados e pode ser usado
                para contato pelo WhatsApp.
              </small>
            </div>

            <div className="form-group">
              <label>Observação</label>

              <textarea
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                placeholder="Ex.: Prefere contato pelo WhatsApp"
                rows={3}
              />
            </div>

            {erro && <div className="form-error">{erro}</div>}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={fecharFormulario}
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="inventory-save-button"
                onClick={salvarCliente}
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : clienteEditando
                    ? "Salvar alterações"
                    : "Cadastrar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PENDENTES */}
      {mostrarPendentes && (
        <div
          className="sweet-modal-overlay"
          onClick={() => {
            setMostrarPendentes(false);
            setErro("");
          }}
        >
          <div
            className="sweet-modal-box customer-pending-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="sweet-modal-close"
              onClick={() => {
                setMostrarPendentes(false);
                setErro("");
              }}
            >
              ×
            </button>

            <span className="page-kicker">A RECEBER</span>
            <h2>Pagamentos pendentes</h2>

            <div className="customer-pending-total">
              <span>Total pendente</span>
              <strong>{dinheiro(valorPendente)}</strong>
            </div>

            {erro && <div className="form-error">{erro}</div>}

            {clientesPendentes.length === 0 ? (
              <div className="empty-purchases">
                <strong>Nenhum pagamento pendente</strong>
                <p>Quando houver vendas pendentes, elas aparecerão aqui.</p>
              </div>
            ) : (
              <div className="customer-pending-list">
                {clientesPendentes.map((item) => (
                  <article
                    key={item.cliente.id}
                    className="customer-pending-item"
                  >
                    <div className="customer-pending-item-top">
                      <div>
                        <strong>{item.cliente.name}</strong>
                        <span>
                          {item.quantidadePedidos}{" "}
                          {item.quantidadePedidos === 1
                            ? "pedido pendente"
                            : "pedidos pendentes"}
                        </span>
                      </div>

                      <strong className="customer-pending-value">
                        {dinheiro(item.valorPendente)}
                      </strong>
                    </div>

                    {item.vendas.length === 1 && (
                      <div className="customer-pending-order-preview">
                        <span>
                          Pedido de {formatarData(item.vendas[0].sale_date)}
                        </span>

                        {itensDaVenda(item.vendas[0].id)
                          .slice(0, 3)
                          .map((produto, index) => (
                            <small key={`${produto.sale_id}-${index}`}>
                              {Number.isInteger(produto.quantity)
                                ? produto.quantity.toFixed(0)
                                : produto.quantity.toLocaleString("pt-BR")}
                              x {produto.item_name}
                            </small>
                          ))}
                      </div>
                    )}

                    <div className="customer-pending-actions">
                      <button
                        type="button"
                        className="customer-whatsapp-action"
                        onClick={() => abrirWhatsAppCobranca(item)}
                        disabled={!item.cliente.phone_normalized}
                      >
                        WhatsApp
                      </button>

                      {item.vendas.length === 1 ? (
                        <button
                          type="button"
                          className="customer-paid-action"
                          onClick={() => marcarVendaComoPaga(item.vendas[0])}
                          disabled={marcandoPagoId === item.vendas[0].id}
                        >
                          {marcandoPagoId === item.vendas[0].id
                            ? "Salvando..."
                            : "Marcar como pago"}
                        </button>
                      ) : (
                        <Link
                          href={`/clientes/${item.cliente.id}`}
                          className="customer-pending-details-link"
                        >
                          Ver detalhes
                        </Link>
                      )}
                    </div>

                    {!item.cliente.phone_normalized && (
                      <small className="customer-pending-no-phone">
                        Cadastre um telefone para enviar a cobrança pelo
                        WhatsApp.
                      </small>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXCLUIR */}
      {clienteExcluindo && (
        <div className="delete-modal-overlay">
          <div className="inventory-modal">
            <h2>Excluir cliente?</h2>

            <p>
              Você está prestes a excluir{" "}
              <strong>{clienteExcluindo.name}</strong>.
            </p>

            <div className="sweet-delete-warning">
              <strong>Atenção</strong>
              <span>
                Clientes com vendas não podem ser apagados, porque o histórico
                precisa ser preservado.
              </span>
            </div>

            {erro && <div className="form-error">{erro}</div>}

            <div className="inventory-edit-actions">
              <button
                type="button"
                className="delete-modal-cancel"
                onClick={() => {
                  setClienteExcluindo(null);
                  setErro("");
                }}
                disabled={excluindo}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="sweet-delete-confirm-button"
                onClick={excluirCliente}
                disabled={excluindo}
              >
                {excluindo ? "Excluindo..." : "Excluir cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

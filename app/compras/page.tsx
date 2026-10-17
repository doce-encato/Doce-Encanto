"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Compra = {
  id: number;
  store_name: string;
  purchase_date: string;
  type: "quick" | "detailed";
  total: number;
  notes: string | null;
  created_at: string;
};

const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatarDinheiro(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default function ComprasPage() {
  const hoje = new Date();

  const mesInicial =
    `${hoje.getFullYear()}-${String(
      hoje.getMonth() + 1
    ).padStart(2, "0")}`;

  const [compras, setCompras] = useState<Compra[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [mesSelecionado, setMesSelecionado] =
    useState(mesInicial);

  const [modoGerenciar, setModoGerenciar] =
    useState(false);

  const [selecionadas, setSelecionadas] =
    useState<number[]>([]);

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [excluindo, setExcluindo] =
    useState(false);


  async function carregarCompras() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("purchases")
      .select("*")
      .order("purchase_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setCarregando(false);
      return;
    }

    setCompras((data as Compra[]) ?? []);
    setCarregando(false);
  }


  useEffect(() => {
    carregarCompras();
  }, []);


  /*
   * Compras somente do mês escolhido
   */
  const comprasDoMes = useMemo(() => {
    return compras.filter((compra) =>
      compra.purchase_date.startsWith(
        mesSelecionado
      )
    );
  }, [compras, mesSelecionado]);


  /*
   * Total gasto no mês escolhido
   */
  const gastoMes = useMemo(() => {
    return comprasDoMes.reduce(
      (total, compra) =>
        total + Number(compra.total),
      0
    );
  }, [comprasDoMes]);


  /*
   * Última compra daquele mês
   */
  const ultimaCompra =
    comprasDoMes.length > 0
      ? comprasDoMes[0]
      : null;


  /*
   * Meses disponíveis no histórico
   */
  const mesesDisponiveis = useMemo(() => {
    const meses = new Set<string>();

    /*
     * Mantém o mês atual disponível
     * mesmo que ainda não tenha compras.
     */
    meses.add(mesInicial);

    compras.forEach((compra) => {
      meses.add(
        compra.purchase_date.substring(0, 7)
      );
    });

    return Array.from(meses).sort(
      (a, b) => b.localeCompare(a)
    );
  }, [compras, mesInicial]);


  function nomeDoMes(valor: string) {
    const [ano, mes] =
      valor.split("-").map(Number);

    return `${nomesMeses[mes - 1]} de ${ano}`;
  }


  function alternarSelecao(id: number) {
    setSelecionadas((atual) => {
      if (atual.includes(id)) {
        return atual.filter(
          (item) => item !== id
        );
      }

      return [...atual, id];
    });
  }


  function selecionarTodas() {
    const idsDoMes =
      comprasDoMes.map(
        (compra) => compra.id
      );

    const todasSelecionadas =
      idsDoMes.length > 0 &&
      idsDoMes.every((id) =>
        selecionadas.includes(id)
      );

    if (todasSelecionadas) {
      setSelecionadas([]);
    } else {
      setSelecionadas(idsDoMes);
    }
  }


  function cancelarGerenciamento() {
    setModoGerenciar(false);
    setSelecionadas([]);
  }


  async function excluirSelecionadas() {
    if (selecionadas.length === 0) {
      return;
    }

    setExcluindo(true);

    const { error } = await supabase
      .from("purchases")
      .delete()
      .in("id", selecionadas);

    if (error) {
      console.error(error);

      setExcluindo(false);

      alert(
        "Não foi possível excluir as compras."
      );

      return;
    }

    setMostrarModal(false);
    setExcluindo(false);
    setSelecionadas([]);
    setModoGerenciar(false);

    await carregarCompras();
  }


  /*
   * Ao trocar o mês, sai do modo gerenciamento
   */
  function trocarMes(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    setMesSelecionado(event.target.value);
    setSelecionadas([]);
    setModoGerenciar(false);
  }


  const todasSelecionadas =
    comprasDoMes.length > 0 &&
    comprasDoMes.every((compra) =>
      selecionadas.includes(compra.id)
    );


  return (
    <main className="compras-page">
      <div className="page-shell">

        {/* CABEÇALHO */}
        <header className="page-header">

          <Link
            href="/"
            className="back-button"
          >
            ←
          </Link>

          <div>
            <span className="page-kicker">
              CONTROLE DA LOJA
            </span>

            <h1>
              Compras
            </h1>

            <p>
              Acompanhe quanto foi gasto e
              registre novas compras.
            </p>
          </div>

        </header>


        {/* RESUMO */}
        <section className="purchase-summary">

          <div className="summary-card summary-card-pink">

            <span className="summary-label">
              Gasto no período
            </span>

            <strong>
              {formatarDinheiro(gastoMes)}
            </strong>

            <small>
              {nomeDoMes(mesSelecionado)}
            </small>

          </div>


          <div className="summary-card summary-card-cream">

            <span className="summary-label">
              Última compra
            </span>

            <strong>
              {ultimaCompra
                ? formatarDinheiro(
                    ultimaCompra.total
                  )
                : "R$ 0,00"}
            </strong>

            <small>
              {ultimaCompra
                ? `${formatarData(
                    ultimaCompra.purchase_date
                  )} · ${ultimaCompra.store_name}`
                : "Nenhuma compra neste mês"}
            </small>

          </div>

        </section>


        {/* NOVA COMPRA */}
        <Link
          href="/compras/nova"
          className="new-purchase-button"
        >
          <span className="new-purchase-plus">
            +
          </span>

          <div>
            <strong>
              Nova compra
            </strong>

            <small>
              Registrar uma nova compra
            </small>
          </div>

          <span className="button-arrow">
            ›
          </span>
        </Link>


        {/* HISTÓRICO */}
        <section className="history-section">

          <div className="history-heading">

            <div>
              <span className="page-kicker">
                HISTÓRICO
              </span>

              <h2>
                Compras recentes
              </h2>
            </div>


            <div className="history-controls">

  <select
    className="month-selector"
    value={mesSelecionado}
    onChange={trocarMes}
  >
    {mesesDisponiveis.map(
      (mes) => (
        <option
          key={mes}
          value={mes}
        >
          {nomeDoMes(mes)}
        </option>
      )
    )}
  </select>


  {!modoGerenciar && comprasDoMes.length > 0 && (
    <button
      type="button"
      className="manage-purchases-button"
      onClick={() =>
        setModoGerenciar(true)
      }
    >
      Gerenciar compras
    </button>
  )}

</div>

          </div>


        {/* GERENCIAMENTO */}
        {comprasDoMes.length > 0 && (

          <div className="purchase-management-bar">

            {!modoGerenciar ? (

              <span>
                {comprasDoMes.length}
                {comprasDoMes.length === 1
                  ? " compra"
                  : " compras"}
              </span>

            ) : (

              <>
                <label className="select-all-purchases">

                  <input
                    type="checkbox"
                    checked={todasSelecionadas}
                    onChange={selecionarTodas}
                  />

                  Selecionar todas
                </label>


                <button
                  type="button"
                  className="cancel-management-button"
                  onClick={cancelarGerenciamento}
                >
                  Cancelar
                </button>
              </>

            )}

          </div>

        )}


          {/* CARREGANDO */}
          {carregando ? (

            <div className="empty-purchases">
              <strong>
                Carregando compras...
              </strong>
            </div>

          ) : comprasDoMes.length === 0 ? (

            /* SEM COMPRAS */
            <div className="empty-purchases">

              <span>
                🛒
              </span>

              <strong>
                Nenhuma compra neste mês
              </strong>

              <p>
                Não existem compras registradas em{" "}
                {nomeDoMes(mesSelecionado)}.
              </p>

            </div>

          ) : (

            /* LISTA */
            <div className="purchase-list">

              {comprasDoMes.map((compra) => {

                const dataFormatada =
                  formatarData(
                    compra.purchase_date
                  );

                const dia =
                  dataFormatada.substring(0, 2);

                const mes =
                  dataFormatada.substring(3, 5);

                const selecionada =
                  selecionadas.includes(
                    compra.id
                  );


                const conteudo = (
                  <>
                    {modoGerenciar && (
                      <div className="purchase-checkbox">

                        <input
                          type="checkbox"
                          checked={selecionada}
                          onChange={() =>
                            alternarSelecao(
                              compra.id
                            )
                          }
                        />

                      </div>
                    )}


                    <div className="purchase-date">

                      <span>
                        {dia}
                      </span>

                      <small>
                        {mes}
                      </small>

                    </div>


                    <div className="purchase-info">

                      <strong>
                        {compra.store_name}
                      </strong>

                      <div className="purchase-meta">

                        <span>
                          {dataFormatada}
                        </span>

                        <span className="meta-dot">
                          •
                        </span>

                        <span>
                          {compra.type ===
                          "detailed"
                            ? "Detalhada"
                            : "Rápida"}
                        </span>

                      </div>

                    </div>


                    <div className="purchase-value">

                      <strong>
                        {formatarDinheiro(
                          compra.total
                        )}
                      </strong>

                      {!modoGerenciar && (
                        <span>
                          ›
                        </span>
                      )}

                    </div>
                  </>
                );


                if (modoGerenciar) {
                  return (
                    <div
                      key={compra.id}
                      className={`purchase-item ${
                        selecionada
                          ? "purchase-item-selected"
                          : ""
                      }`}
                      onClick={() =>
                        alternarSelecao(
                          compra.id
                        )
                      }
                    >
                      {conteudo}
                    </div>
                  );
                }


                return (
                  <Link
                    href={`/compras/${compra.id}`}
                    key={compra.id}
                    className="purchase-item"
                  >
                    {conteudo}
                  </Link>
                );

              })}

            </div>

          )}


          {/* BOTÃO INFERIOR DE EXCLUSÃO */}
          {modoGerenciar && (
            <div className="bulk-delete-area">

              <button
                type="button"
                className="bulk-delete-button"
                disabled={
                  selecionadas.length === 0
                }
                onClick={() =>
                  setMostrarModal(true)
                }
              >
                {selecionadas.length === 0
                  ? "Selecione as compras"
                  : `Excluir ${
                      selecionadas.length
                    } ${
                      selecionadas.length === 1
                        ? "compra"
                        : "compras"
                    }`}
              </button>

            </div>
          )}

        </section>

      </div>


      {/* MODAL DE CONFIRMAÇÃO */}
      {mostrarModal && (

        <div className="delete-modal-overlay">

          <div className="delete-modal">

            <div className="delete-modal-icon">
              !
            </div>

            <h2>
              Excluir compras?
            </h2>

            <p>
              Você está prestes a excluir{" "}
              <strong>
                {selecionadas.length}
              </strong>{" "}
              {selecionadas.length === 1
                ? "compra"
                : "compras"}.
            </p>

            <p>
              Essa ação não pode ser desfeita.
            </p>


            <div className="delete-modal-actions">

              <button
                type="button"
                className="delete-modal-cancel"
                onClick={() =>
                  setMostrarModal(false)
                }
                disabled={excluindo}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="delete-modal-confirm"
                onClick={
                  excluirSelecionadas
                }
                disabled={excluindo}
              >
                {excluindo
                  ? "Excluindo..."
                  : "Sim, excluir"}
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}
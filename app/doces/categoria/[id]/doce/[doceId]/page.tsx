"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";


type Categoria = {
  id: number;
  name: string;
};


type Doce = {
  id: number;
  category_id: number;
  name: string;
  quantity: number;
  minimum_quantity: number;
  sale_price: number;
  is_customizable: boolean;
};


type Lote = {
  id: number;
  sweet_id: number;
  batch_code: string | null;
  quantity: number;
  produced_at: string;
  expires_at: string | null;
  alert_days_before: number;
};


function formatarPreco(
  valor: number
) {
  return Number(
    valor || 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}


export default function DocePage() {

  const params =
    useParams();


  const categoriaId =
    Number(
      params.id
    );


  const doceId =
    Number(
      params.doceId
    );


  const [
    categoria,
    setCategoria,
  ] =
    useState<Categoria | null>(
      null
    );


  const [
    doce,
    setDoce,
  ] =
    useState<Doce | null>(
      null
    );


  const [
    lotes,
    setLotes,
  ] =
    useState<Lote[]>([]);


  const [
    carregando,
    setCarregando,
  ] =
    useState(true);


  const [
    erro,
    setErro,
  ] =
    useState("");


  /*
  ===========================================
  NOVO LOTE
  ===========================================
  */

  const [
    mostrarNovoLote,
    setMostrarNovoLote,
  ] =
    useState(false);


  const [
    salvandoLote,
    setSalvandoLote,
  ] =
    useState(false);


  const [
    quantidadeLote,
    setQuantidadeLote,
  ] =
    useState("");


  const [
    codigoLote,
    setCodigoLote,
  ] =
    useState("");


  const [
    dataProducao,
    setDataProducao,
  ] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );


  const [
    dataVencimento,
    setDataVencimento,
  ] =
    useState("");


  const [
    diasAlerta,
    setDiasAlerta,
  ] =
    useState("2");


  /*
  ===========================================
  EDITAR LOTE
  ===========================================
  */

  const [
    loteEditando,
    setLoteEditando,
  ] =
    useState<Lote | null>(
      null
    );


  const [
    quantidadeEditando,
    setQuantidadeEditando,
  ] =
    useState("");


  const [
    codigoEditando,
    setCodigoEditando,
  ] =
    useState("");


  const [
    producaoEditando,
    setProducaoEditando,
  ] =
    useState("");


  const [
    vencimentoEditando,
    setVencimentoEditando,
  ] =
    useState("");


  const [
    alertaEditando,
    setAlertaEditando,
  ] =
    useState("2");


  /*
  ===========================================
  EXCLUIR LOTE
  ===========================================
  */

  const [
    loteExcluindo,
    setLoteExcluindo,
  ] =
    useState<Lote | null>(
      null
    );


  const [
    excluindoLote,
    setExcluindoLote,
  ] =
    useState(false);


  /*
  ===========================================
  AUXILIARES
  ===========================================
  */

  function formatarData(
    data: string | null
  ) {

    if (!data) {
      return "—";
    }


    const [
      ano,
      mes,
      dia,
    ] =
      data.split("-");


    return `${dia}/${mes}/${ano}`;
  }


  function diferencaEmDias(
    dataFinal: string
  ) {

    const hoje =
      new Date();


    hoje.setHours(
      0,
      0,
      0,
      0
    );


    const [
      ano,
      mes,
      dia,
    ] =
      dataFinal
        .split("-")
        .map(Number);


    const vencimento =
      new Date(
        ano,
        mes - 1,
        dia
      );


    vencimento.setHours(
      0,
      0,
      0,
      0
    );


    const diferenca =
      vencimento.getTime() -
      hoje.getTime();


    return Math.ceil(
      diferenca /
      (
        1000 *
        60 *
        60 *
        24
      )
    );
  }


  function situacaoLote(
    lote: Lote
  ) {

    if (
      !lote.expires_at
    ) {

      return {
        tipo:
          "normal",

        texto:
          "Sem vencimento",
      };
    }


    const dias =
      diferencaEmDias(
        lote.expires_at
      );


    if (
      dias < 0
    ) {

      return {
        tipo:
          "vencido",

        texto:
          "Vencido",
      };
    }


    if (
      dias === 0
    ) {

      return {
        tipo:
          "vencido",

        texto:
          "Vence hoje",
      };
    }


    if (
      dias <=
      Number(
        lote.alert_days_before
      )
    ) {

      return {
        tipo:
          "alerta",

        texto:
          dias === 1
            ? "Vence amanhã"
            : `Vence em ${dias} dias`,
      };
    }


    return {
      tipo:
        "normal",

      texto:
        `Vence em ${dias} dias`,
    };
  }


  /*
  ===========================================
  CARREGAR
  ===========================================
  */

  async function carregarPagina() {

    setCarregando(
      true
    );

    setErro(
      ""
    );


    const {
      data:
        categoriaData,

      error:
        categoriaError,
    } =
      await supabase
        .from(
          "sweet_categories"
        )
        .select(
          "id, name"
        )
        .eq(
          "id",
          categoriaId
        )
        .single();


    if (
      categoriaError ||
      !categoriaData
    ) {

      console.error(
        categoriaError
      );


      setErro(
        "Não foi possível carregar a categoria."
      );


      setCarregando(
        false
      );

      return;
    }


    setCategoria({
      id:
        Number(
          categoriaData.id
        ),

      name:
        String(
          categoriaData.name
        ),
    });


    const {
      data:
        doceData,

      error:
        doceError,
    } =
      await supabase
        .from(
          "sweets"
        )
        .select(`
          id,
          category_id,
          name,
          quantity,
          minimum_quantity,
          sale_price,
          is_customizable
        `)
        .eq(
          "id",
          doceId
        )
        .eq(
          "category_id",
          categoriaId
        )
        .single();


    if (
      doceError ||
      !doceData
    ) {

      console.error(
        doceError
      );


      setErro(
        "Não foi possível carregar o doce."
      );


      setCarregando(
        false
      );

      return;
    }


    setDoce({
      id:
        Number(
          doceData.id
        ),

      category_id:
        Number(
          doceData.category_id
        ),

      name:
        String(
          doceData.name
        ),

      quantity:
        Number(
          doceData.quantity ??
          0
        ),

      minimum_quantity:
        Number(
          doceData.minimum_quantity ??
          0
        ),

      sale_price:
        Number(
          doceData.sale_price ??
          0
        ),

      is_customizable:
        Boolean(
          doceData.is_customizable
        ),
    });


    const {
      data:
        lotesData,

      error:
        lotesError,
    } =
      await supabase
        .from(
          "sweet_batches"
        )
        .select(`
          id,
          sweet_id,
          batch_code,
          quantity,
          produced_at,
          expires_at,
          alert_days_before
        `)
        .eq(
          "sweet_id",
          doceId
        )
        .gt(
          "quantity",
          0
        )
        .order(
          "expires_at",
          {
            ascending:
              true,

            nullsFirst:
              false,
          }
        );


    if (
      lotesError
    ) {

      console.error(
        lotesError
      );

      setLotes(
        []
      );

    } else {

      setLotes(
        (
          lotesData ??
          []
        ).map(
          (
            item
          ) => ({
            id:
              Number(
                item.id
              ),

            sweet_id:
              Number(
                item.sweet_id
              ),

            batch_code:
              item.batch_code
                ? String(
                    item.batch_code
                  )
                : null,

            quantity:
              Number(
                item.quantity
              ),

            produced_at:
              String(
                item.produced_at
              ),

            expires_at:
              item.expires_at
                ? String(
                    item.expires_at
                  )
                : null,

            alert_days_before:
              Number(
                item.alert_days_before ??
                2
              ),
          })
        )
      );
    }


    setCarregando(
      false
    );
  }


  useEffect(
    () => {

      if (
        categoriaId &&
        doceId
      ) {

        carregarPagina();
      }

    },
    [
      categoriaId,
      doceId,
    ]
  );


  /*
  ===========================================
  ESTOQUE
  ===========================================
  */

  const estoqueTotal =
    useMemo(
      () => {

        return lotes.reduce(
          (
            total,
            lote
          ) =>
            total +
            Number(
              lote.quantity
            ),
          0
        );

      },
      [
        lotes,
      ]
    );


  const pertoDeVencer =
    useMemo(
      () => {

        return lotes.reduce(
          (
            total,
            lote
          ) => {

            if (
              !lote.expires_at
            ) {
              return total;
            }


            const dias =
              diferencaEmDias(
                lote.expires_at
              );


            if (
              dias >= 0 &&
              dias <=
                Number(
                  lote.alert_days_before
                )
            ) {

              return (
                total +
                Number(
                  lote.quantity
                )
              );
            }


            return total;
          },
          0
        );

      },
      [
        lotes,
      ]
    );


  async function sincronizarEstoque() {

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "sweet_batches"
        )
        .select(
          "quantity"
        )
        .eq(
          "sweet_id",
          doceId
        )
        .gt(
          "quantity",
          0
        );


    if (
      error
    ) {

      console.error(
        error
      );

      return;
    }


    const total =
      (
        data ??
        []
      ).reduce(
        (
          soma,
          lote
        ) =>
          soma +
          Number(
            lote.quantity ??
            0
          ),
        0
      );


    const {
      error:
        atualizarError,
    } =
      await supabase
        .from(
          "sweets"
        )
        .update({
          quantity:
            total,
        })
        .eq(
          "id",
          doceId
        );


    if (
      atualizarError
    ) {

      console.error(
        atualizarError
      );
    }
  }


  /*
  ===========================================
  NOVO LOTE
  ===========================================
  */

  function limparNovoLote() {

    setQuantidadeLote(
      ""
    );

    setCodigoLote(
      ""
    );

    setDataProducao(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setDataVencimento(
      ""
    );

    setDiasAlerta(
      "2"
    );

    setErro(
      ""
    );
  }


  async function salvarNovoLote() {

    setErro(
      ""
    );


    const quantidade =
      Number(
        quantidadeLote.replace(
          ",",
          "."
        )
      );


    const alerta =
      Number(
        diasAlerta
      );


    if (
      !quantidade ||
      quantidade <= 0
    ) {

      setErro(
        "Informe uma quantidade válida."
      );

      return;
    }


    if (
      !dataProducao
    ) {

      setErro(
        "Informe a data de produção."
      );

      return;
    }


    if (
      !dataVencimento
    ) {

      setErro(
        "Informe a data de vencimento."
      );

      return;
    }


    if (
      dataVencimento <
      dataProducao
    ) {

      setErro(
        "O vencimento não pode ser anterior à produção."
      );

      return;
    }


    if (
      Number.isNaN(
        alerta
      ) ||
      alerta < 0
    ) {

      setErro(
        "Informe um alerta válido."
      );

      return;
    }


    setSalvandoLote(
      true
    );


    const {
      error,
    } =
      await supabase
        .from(
          "sweet_batches"
        )
        .insert({
          sweet_id:
            doceId,

          quantity:
            quantidade,

          produced_at:
            dataProducao,

          expires_at:
            dataVencimento,

          batch_code:
            codigoLote.trim() ||
            null,

          alert_days_before:
            alerta,
        });


    if (
      error
    ) {

      console.error(
        error
      );


      setErro(
        "Não foi possível cadastrar o lote."
      );


      setSalvandoLote(
        false
      );

      return;
    }


    await sincronizarEstoque();


    setMostrarNovoLote(
      false
    );

    limparNovoLote();

    setSalvandoLote(
      false
    );


    await carregarPagina();
  }


  /*
  ===========================================
  EDITAR LOTE
  ===========================================
  */

  function abrirEdicaoLote(
    lote: Lote
  ) {

    setErro(
      ""
    );


    setLoteEditando(
      lote
    );


    setQuantidadeEditando(
      String(
        lote.quantity
      )
    );


    setCodigoEditando(
      lote.batch_code ??
      ""
    );


    setProducaoEditando(
      lote.produced_at
    );


    setVencimentoEditando(
      lote.expires_at ??
      ""
    );


    setAlertaEditando(
      String(
        lote.alert_days_before
      )
    );
  }


  function fecharEdicaoLote() {

    setLoteEditando(
      null
    );

    setErro(
      ""
    );
  }


  async function salvarEdicaoLote() {

    if (
      !loteEditando
    ) {
      return;
    }


    setErro(
      ""
    );


    const quantidade =
      Number(
        quantidadeEditando.replace(
          ",",
          "."
        )
      );


    const alerta =
      Number(
        alertaEditando
      );


    if (
      !quantidade ||
      quantidade <= 0
    ) {

      setErro(
        "Informe uma quantidade válida."
      );

      return;
    }


    if (
      !producaoEditando ||
      !vencimentoEditando
    ) {

      setErro(
        "Informe as datas de produção e vencimento."
      );

      return;
    }


    if (
      vencimentoEditando <
      producaoEditando
    ) {

      setErro(
        "O vencimento não pode ser anterior à produção."
      );

      return;
    }


    if (
      Number.isNaN(
        alerta
      ) ||
      alerta < 0
    ) {

      setErro(
        "Informe um alerta válido."
      );

      return;
    }


    setSalvandoLote(
      true
    );


    const {
      error,
    } =
      await supabase
        .from(
          "sweet_batches"
        )
        .update({
          quantity:
            quantidade,

          batch_code:
            codigoEditando.trim() ||
            null,

          produced_at:
            producaoEditando,

          expires_at:
            vencimentoEditando,

          alert_days_before:
            alerta,
        })
        .eq(
          "id",
          loteEditando.id
        );


    if (
      error
    ) {

      console.error(
        error
      );


      setErro(
        "Não foi possível editar o lote."
      );


      setSalvandoLote(
        false
      );

      return;
    }


    await sincronizarEstoque();


    setLoteEditando(
      null
    );

    setSalvandoLote(
      false
    );


    await carregarPagina();
  }


  /*
  ===========================================
  EXCLUIR LOTE
  ===========================================
  */

  async function excluirLote() {

    if (
      !loteExcluindo
    ) {
      return;
    }


    setExcluindoLote(
      true
    );

    setErro(
      ""
    );


    const {
      error,
    } =
      await supabase
        .from(
          "sweet_batches"
        )
        .delete()
        .eq(
          "id",
          loteExcluindo.id
        );


    if (
      error
    ) {

      console.error(
        error
      );


      setErro(
        "Não foi possível excluir o lote."
      );


      setExcluindoLote(
        false
      );

      return;
    }


    await sincronizarEstoque();


    setLoteExcluindo(
      null
    );

    setExcluindoLote(
      false
    );


    await carregarPagina();
  }


  /*
  ===========================================
  LOADING
  ===========================================
  */

  if (
    carregando
  ) {

    return (

      <main className="compras-page">

        <div className="page-shell">

          <div className="empty-purchases">

            <strong>
              Carregando...
            </strong>

          </div>

        </div>

      </main>
    );
  }


  if (
    !categoria ||
    !doce
  ) {

    return (

      <main className="compras-page">

        <div className="page-shell">

          <Link
            href={`/doces/categoria/${categoriaId}`}
            className="back-button"
          >
            ←
          </Link>


          <div className="empty-purchases">

            <strong>
              Doce não encontrado
            </strong>

          </div>

        </div>

      </main>
    );
  }


  /*
  ===========================================
  TELA
  ===========================================
  */

  return (

    <main className="compras-page">

      <div className="page-shell">


        <header className="page-header">

          <Link
            href={`/doces/categoria/${categoriaId}`}
            className="back-button"
          >
            ←
          </Link>


          <div>

            <span className="page-kicker">
              {categoria.name}
            </span>


            <h1>
              {doce.name}
            </h1>


            <p>
              Receita, estoque e produção deste doce.
            </p>

          </div>

        </header>


        {/* RESUMO */}

        <section className="sweet-flavor-summary">

          <div>

            <span>
              Estoque total
            </span>


            <strong>

              {estoqueTotal.toLocaleString(
                "pt-BR",
                {
                  maximumFractionDigits:
                    0,
                }
              )}{" "}
              un

            </strong>

          </div>


          <div
            className={
              pertoDeVencer > 0
                ? "sweet-flavor-warning"
                : ""
            }
          >

            <span>
              Perto de vencer
            </span>


            <strong>

              {pertoDeVencer.toLocaleString(
                "pt-BR",
                {
                  maximumFractionDigits:
                    0,
                }
              )}{" "}
              un

            </strong>

          </div>


          <div>

            <span>
              Estoque mínimo
            </span>


            <strong>

              {doce.minimum_quantity.toLocaleString(
                "pt-BR",
                {
                  maximumFractionDigits:
                    0,
                }
              )}{" "}
              un

            </strong>

          </div>

        </section>


        {/* PREÇO */}

        <section className="sweet-flavor-price-card">

          <div>

            <span>
              Preço de venda
            </span>


            <strong>
              {formatarPreco(
                doce.sale_price
              )}
            </strong>

          </div>

          <span className="sweet-flavor-price-help">
            Valor por unidade
          </span>

        </section>


        {/* RECEITA */}

        <section className="sweet-flavor-actions sweet-flavor-actions-single">

          <Link
            href={`/doces/categoria/${categoriaId}/doce/${doceId}/receita`}
            className="sweet-action-card"
          >

            <div className="sweet-action-icon">
              📋
            </div>


            <div>

              <strong>
                Receita
              </strong>


              <span>
                Ingredientes e rendimento
              </span>

            </div>

          </Link>

        </section>


        {/* LOTES */}

        <section className="sweet-batches-section">

          <div className="sweet-batches-header">

            <div>

              <span className="section-kicker">
                ESTOQUE
              </span>


              <h2>
                Lotes
              </h2>

            </div>


            <button
              type="button"
              className="sweet-new-batch-button"
              onClick={
                () => {

                  limparNovoLote();

                  setMostrarNovoLote(
                    true
                  );
                }
              }
            >
              + Novo lote
            </button>

          </div>


          {erro &&
            !mostrarNovoLote &&
            !loteEditando &&
            !loteExcluindo && (

              <div className="form-error">
                {erro}
              </div>

          )}


          {lotes.length === 0 ? (

            <div className="sweet-empty-batches">

              <strong>
                Nenhum lote cadastrado
              </strong>


              <span>
                Cadastre o primeiro lote deste doce.
              </span>

            </div>

          ) : (

            <div className="sweet-batch-list">

              {lotes.map(
                (
                  lote,
                  indice
                ) => {

                  const situacao =
                    situacaoLote(
                      lote
                    );


                  return (

                    <article
                      key={
                        lote.id
                      }
                      className={`sweet-batch-card sweet-batch-${situacao.tipo}`}
                    >

                      <div className="sweet-batch-top">

                        <div>

                          <span>

                            {lote.batch_code
                              ? lote.batch_code
                              : `Lote ${String(
                                  lotes.length -
                                  indice
                                ).padStart(
                                  3,
                                  "0"
                                )}`}

                          </span>


                          <strong>

                            {lote.quantity.toLocaleString(
                              "pt-BR",
                              {
                                maximumFractionDigits:
                                  0,
                              }
                            )}{" "}
                            unidades

                          </strong>

                        </div>


                        <div className="sweet-batch-top-actions">

                          <span
                            className={`sweet-batch-status sweet-batch-status-${situacao.tipo}`}
                          >
                            {situacao.texto}
                          </span>


                          <button
                            type="button"
                            className="sweet-batch-edit-button"
                            onClick={
                              () =>
                                abrirEdicaoLote(
                                  lote
                                )
                            }
                          >
                            Editar
                          </button>

                        </div>

                      </div>


                      <div className="sweet-batch-dates">

                        <div>

                          <span>
                            Produção
                          </span>


                          <strong>
                            {formatarData(
                              lote.produced_at
                            )}
                          </strong>

                        </div>


                        <div>

                          <span>
                            Vencimento
                          </span>


                          <strong>
                            {formatarData(
                              lote.expires_at
                            )}
                          </strong>

                        </div>

                      </div>


                      <div className="sweet-batch-footer">

                        <div className="sweet-batch-alert">

                          🔔 Avisar{" "}

                          <strong>
                            {lote.alert_days_before}
                          </strong>{" "}

                          {lote.alert_days_before === 1
                            ? "dia"
                            : "dias"}{" "}

                          antes

                        </div>


                        <button
                          type="button"
                          className="sweet-batch-delete-button"
                          onClick={
                            () => {

                              setErro(
                                ""
                              );

                              setLoteExcluindo(
                                lote
                              );
                            }
                          }
                        >
                          Excluir
                        </button>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          )}

        </section>


        {/* =====================================
            MODAL NOVO LOTE
        ====================================== */}

        {mostrarNovoLote && (

          <div
            className="sweet-modal-overlay"
            onClick={
              () => {

                if (
                  !salvandoLote
                ) {

                  setMostrarNovoLote(
                    false
                  );

                  limparNovoLote();
                }
              }
            }
          >

            <div
              className="sweet-modal-box"
              onClick={
                (
                  evento
                ) =>
                  evento.stopPropagation()
              }
            >

              <button
                type="button"
                className="sweet-modal-close"
                onClick={
                  () => {

                    setMostrarNovoLote(
                      false
                    );

                    limparNovoLote();
                  }
                }
              >
                ×
              </button>


              <span className="page-kicker">
                {doce.name}
              </span>


              <h2>
                Novo lote
              </h2>


              <div className="form-group">

                <label>
                  Quantidade produzida
                </label>


                <div className="input-with-unit">

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      quantidadeLote
                    }
                    onChange={
                      (
                        evento
                      ) =>
                        setQuantidadeLote(
                          evento.target.value
                        )
                    }
                    placeholder="Ex.: 20"
                  />


                  <span>
                    un
                  </span>

                </div>

              </div>


              <div className="form-group">

                <label>
                  Número ou nome do lote
                </label>


                <input
                  type="text"
                  value={
                    codigoLote
                  }
                  onChange={
                    (
                      evento
                    ) =>
                      setCodigoLote(
                        evento.target.value
                      )
                  }
                  placeholder="Ex.: Lote 003"
                />


                <small>
                  Opcional
                </small>

              </div>


              <div className="sweet-date-grid">

                <div className="form-group">

                  <label>
                    Data de produção
                  </label>


                  <input
                    type="date"
                    value={
                      dataProducao
                    }
                    onChange={
                      (
                        evento
                      ) =>
                        setDataProducao(
                          evento.target.value
                        )
                    }
                  />

                </div>


                <div className="form-group">

                  <label>
                    Data de vencimento
                  </label>


                  <input
                    type="date"
                    value={
                      dataVencimento
                    }
                    onChange={
                      (
                        evento
                      ) =>
                        setDataVencimento(
                          evento.target.value
                        )
                    }
                  />

                </div>

              </div>


              <div className="form-group">

                <label>
                  Avisar quantos dias antes do
                </label>


                <div className="sweet-alert-shortcuts">

                  {[2, 7, 30, 180].map(
                    (
                      dias
                    ) => (

                      <button
                        key={
                          dias
                        }
                        type="button"
                        className={
                          Number(
                            diasAlerta
                          ) === dias
                            ? "active"
                            : ""
                        }
                        onClick={
                          () =>
                            setDiasAlerta(
                              String(
                                dias
                              )
                            )
                        }
                      >

                        {dias === 180
                          ? "6 meses"
                          : `${dias} dias`}

                      </button>

                    )
                  )}

                </div>


                <div className="input-with-unit">

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      diasAlerta
                    }
                    onChange={
                      (
                        evento
                      ) =>
                        setDiasAlerta(
                          evento.target.value
                        )
                    }
                  />


                  <span>
                    dias
                  </span>

                </div>

              </div>


              {erro && (

                <div className="form-error">
                  {erro}
                </div>

              )}


              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    () => {

                      setMostrarNovoLote(
                        false
                      );

                      limparNovoLote();
                    }
                  }
                  disabled={
                    salvandoLote
                  }
                >
                  Cancelar
                </button>


                <button
                  type="button"
                  className="sweet-new-batch-button"
                  disabled={
                    salvandoLote
                  }
                  onClick={
                    salvarNovoLote
                  }
                >

                  {salvandoLote
                    ? "Salvando..."
                    : "Cadastrar lote"}

                </button>

              </div>

            </div>

          </div>

        )}


        {/* =====================================
            MODAL EDITAR LOTE
        ====================================== */}

        {loteEditando && (

          <div
            className="sweet-modal-overlay"
            onClick={
              () => {

                if (
                  !salvandoLote
                ) {

                  fecharEdicaoLote();
                }
              }
            }
          >

            <div
              className="sweet-modal-box"
              onClick={
                (
                  evento
                ) =>
                  evento.stopPropagation()
              }
            >

              <button
                type="button"
                className="sweet-modal-close"
                onClick={
                  fecharEdicaoLote
                }
              >
                ×
              </button>


              <span className="page-kicker">
                {doce.name}
              </span>


              <h2>
                Editar lote
              </h2>


              <div className="form-group">

                <label>
                  Quantidade
                </label>


                <div className="input-with-unit">

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      quantidadeEditando
                    }
                    onChange={
                      (
                        evento
                      ) =>
                        setQuantidadeEditando(
                          evento.target.value
                        )
                    }
                  />


                  <span>
                    un
                  </span>

                </div>

              </div>


              <div className="form-group">

                <label>
                  Número ou nome do lote
                </label>


                <input
                  type="text"
                  value={
                    codigoEditando
                  }
                  onChange={
                    (
                      evento
                    ) =>
                      setCodigoEditando(
                        evento.target.value
                      )
                  }
                />

              </div>


              <div className="sweet-date-grid">

                <div className="form-group">

                  <label>
                    Produção
                  </label>


                  <input
                    type="date"
                    value={
                      producaoEditando
                    }
                    onChange={
                      (
                        evento
                      ) =>
                        setProducaoEditando(
                          evento.target.value
                        )
                    }
                  />

                </div>


                <div className="form-group">

                  <label>
                    Vencimento
                  </label>


                  <input
                    type="date"
                    value={
                      vencimentoEditando
                    }
                    onChange={
                      (
                        evento
                      ) =>
                        setVencimentoEditando(
                          evento.target.value
                        )
                    }
                  />

                </div>

              </div>


              <div className="form-group">

                <label>
                  Avisar quantos dias antes?
                </label>


                <div className="sweet-alert-shortcuts">

                  {[2, 7, 30, 180].map(
                    (
                      dias
                    ) => (

                      <button
                        key={
                          dias
                        }
                        type="button"
                        className={
                          Number(
                            alertaEditando
                          ) === dias
                            ? "active"
                            : ""
                        }
                        onClick={
                          () =>
                            setAlertaEditando(
                              String(
                                dias
                              )
                            )
                        }
                      >

                        {dias === 180
                          ? "6 meses"
                          : `${dias} dias`}

                      </button>

                    )
                  )}

                </div>


                <div className="input-with-unit">

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      alertaEditando
                    }
                    onChange={
                      (
                        evento
                      ) =>
                        setAlertaEditando(
                          evento.target.value
                        )
                    }
                  />


                  <span>
                    dias
                  </span>

                </div>

              </div>


              {erro && (

                <div className="form-error">
                  {erro}
                </div>

              )}


              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    fecharEdicaoLote
                  }
                  disabled={
                    salvandoLote
                  }
                >
                  Cancelar
                </button>


                <button
                  type="button"
                  className="sweet-new-batch-button"
                  onClick={
                    salvarEdicaoLote
                  }
                  disabled={
                    salvandoLote
                  }
                >

                  {salvandoLote
                    ? "Salvando..."
                    : "Salvar alterações"}

                </button>

              </div>

            </div>

          </div>

        )}


        {/* =====================================
            MODAL EXCLUIR LOTE
        ====================================== */}

        {loteExcluindo && (

          <div
            className="delete-modal-overlay"
            onClick={
              () => {

                if (
                  !excluindoLote
                ) {

                  setLoteExcluindo(
                    null
                  );

                  setErro(
                    ""
                  );
                }
              }
            }
          >

            <div
              className="inventory-modal"
              onClick={
                (
                  evento
                ) =>
                  evento.stopPropagation()
              }
            >

              <h2>
                Excluir lote?
              </h2>


              <p>
                Você está prestes a excluir{" "}

                <strong>

                  {loteExcluindo.batch_code ||
                    "este lote"}

                </strong>.

              </p>


              <div className="sweet-delete-warning">

                <strong>
                  Atenção
                </strong>


                <span>
                  As unidades deste lote deixarão de fazer parte do estoque do doce.
                </span>

              </div>


              {erro && (

                <div className="form-error">
                  {erro}
                </div>

              )}


              <div className="inventory-edit-actions">

                <button
                  type="button"
                  className="delete-modal-cancel"
                  onClick={
                    () => {

                      setLoteExcluindo(
                        null
                      );

                      setErro(
                        ""
                      );
                    }
                  }
                  disabled={
                    excluindoLote
                  }
                >
                  Cancelar
                </button>


                <button
                  type="button"
                  className="sweet-delete-confirm-button"
                  onClick={
                    excluirLote
                  }
                  disabled={
                    excluindoLote
                  }
                >

                  {excluindoLote
                    ? "Excluindo..."
                    : "Excluir lote"}

                </button>

              </div>

            </div>

          </div>

        )}


      </div>

    </main>
  );
}
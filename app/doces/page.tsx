"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";


type Categoria = {
  id: number;
  name: string;
  quantidadeSabores: number;
};

export default function DocesPage() {

  const [
    categorias,
    setCategorias,
  ] =
    useState<Categoria[]>([]);


  const [
    totalDoces,
    setTotalDoces,
  ] =
    useState(0);


  const [
    totalUnidades,
    setTotalUnidades,
  ] =
    useState(0);


  const [
    pertoDeVencer,
    setPertoDeVencer,
  ] =
    useState(0);


  const [
    carregando,
    setCarregando,
  ] =
    useState(true);


  const [
    mostrarNovaCategoria,
    setMostrarNovaCategoria,
  ] =
    useState(false);


  const [
    nomeCategoria,
    setNomeCategoria,
  ] =
    useState("");


  const [
    salvando,
    setSalvando,
  ] =
    useState(false);


  const [
    erro,
    setErro,
  ] =
    useState("");


  /*
  ===========================================
  MENU DA CATEGORIA
  ===========================================
  */

  const [
    menuCategoriaId,
    setMenuCategoriaId,
  ] =
    useState<number | null>(
      null
    );


  /*
  ===========================================
  EDITAR CATEGORIA
  ===========================================
  */

  const [
    categoriaEditando,
    setCategoriaEditando,
  ] =
    useState<Categoria | null>(
      null
    );


  const [
    nomeCategoriaEditando,
    setNomeCategoriaEditando,
  ] =
    useState("");


  /*
  ===========================================
  EXCLUIR CATEGORIA
  ===========================================
  */

  const [
    categoriaExcluindo,
    setCategoriaExcluindo,
  ] =
    useState<Categoria | null>(
      null
    );


  const [
    excluindo,
    setExcluindo,
  ] =
    useState(false);


  /*
  ===========================================
  CARREGAR PÁGINA
  ===========================================
  */

  async function carregarCategorias() {

    setCarregando(true);

    setErro("");


const {
  data,
  error,
} = await supabase
  .from("sweet_categories")
  .select("id, name")
  .order("name");


    if (error) {

      console.error(
        error
      );

      setErro(
        "Não foi possível carregar as categorias."
      );

      setCarregando(
        false
      );

      return;
    }
    /*
    ===========================================
    TOTAL DE DOCES E UNIDADES
    ===========================================
    */

    const {
      data: docesData,
      error: docesError,
    } =
      await supabase
        .from(
          "sweets"
        )
.select(
  "id, category_id, quantity, is_customizable"
);

    if (docesError) {

      console.error(
        docesError
      );

    }


    const doces =
      docesData ?? [];

      const saboresNormais = doces.filter(
  (doce) => !Boolean(doce.is_customizable)
);

setTotalDoces(
  saboresNormais.length
);

const categoriasConvertidas: Categoria[] =
  (data ?? []).map((categoria) => ({
    id: Number(categoria.id),
    name: String(categoria.name),

    quantidadeSabores: saboresNormais.filter(
      (doce) =>
        Number(doce.category_id) ===
        Number(categoria.id)
    ).length,
  }));

setCategorias(categoriasConvertidas);


    setTotalUnidades(
      doces.reduce(
        (
          total,
          doce
        ) =>
          total +
          Number(
            doce.quantity ?? 0
          ),
        0
      )
    );


/*
===========================================
PERTO DE VENCER
respeita o alerta de cada lote
===========================================
*/

const {
  data: lotesData,
  error: lotesError,
} =
  await supabase
    .from("sweet_batches")
    .select(`
      quantity,
      expires_at,
      alert_days_before
    `)
    .gt(
      "quantity",
      0
    );

if (lotesError) {

  console.error(
    lotesError
  );

  setPertoDeVencer(
    0
  );

} else {

  const hoje =
    new Date();

  const hojeUTC =
    Date.UTC(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate()
    );

  const totalPertoDeVencer =
    (lotesData ?? [])
      .reduce(
        (
          total,
          lote
        ) => {

          if (
            !lote.expires_at
          ) {
            return total;
          }

          const [
            ano,
            mes,
            dia
          ] =
            String(
              lote.expires_at
            )
              .split("-")
              .map(Number);

          const vencimentoUTC =
            Date.UTC(
              ano,
              mes - 1,
              dia
            );

          const dias =
            Math.floor(
              (
                vencimentoUTC -
                hojeUTC
              ) /
              (
                1000 *
                60 *
                60 *
                24
              )
            );

          const diasAlerta =
            Number(
              lote.alert_days_before ??
              0
            );

          if (
            dias >= 0 &&
            dias <= diasAlerta
          ) {

            return (
              total +
              Number(
                lote.quantity ??
                0
              )
            );
          }

          return total;
        },
        0
      );

  setPertoDeVencer(
    totalPertoDeVencer
  );
}


    setCarregando(
      false
    );
  }


  useEffect(
    () => {

      carregarCategorias();

    },
    []
  );


  /*
  ===========================================
  CRIAR CATEGORIA
  ===========================================
  */

  async function salvarCategoria() {

    setErro("");


    if (
      !nomeCategoria.trim()
    ) {

      setErro(
        "Digite o nome da categoria."
      );

      return;
    }


    setSalvando(
      true
    );


    const {
      error,
    } =
      await supabase
        .from(
          "sweet_categories"
        )
        .insert({
          name:
            nomeCategoria.trim(),
        });


    if (error) {

      console.error(
        error
      );

      setErro(
        "Não foi possível criar a categoria."
      );

      setSalvando(
        false
      );

      return;
    }


    setNomeCategoria(
      ""
    );

    setMostrarNovaCategoria(
      false
    );

    setSalvando(
      false
    );


    await carregarCategorias();
  }


  /*
  ===========================================
  ABRIR EDIÇÃO
  ===========================================
  */

  function abrirEdicao(
    categoria: Categoria
  ) {

    setMenuCategoriaId(
      null
    );

    setErro(
      ""
    );

    setCategoriaEditando(
      categoria
    );

    setNomeCategoriaEditando(
      categoria.name
    );
  }


  /*
  ===========================================
  SALVAR EDIÇÃO
  ===========================================
  */

  async function salvarEdicaoCategoria() {

    if (
      !categoriaEditando
    ) {
      return;
    }


    setErro(
      ""
    );


    if (
      !nomeCategoriaEditando.trim()
    ) {

      setErro(
        "Digite o nome da categoria."
      );

      return;
    }


    setSalvando(
      true
    );


    const {
      error,
    } =
      await supabase
        .from(
          "sweet_categories"
        )
        .update({
          name:
            nomeCategoriaEditando.trim(),
        })
        .eq(
          "id",
          categoriaEditando.id
        );


    if (error) {

      console.error(
        error
      );

      setErro(
        "Não foi possível editar a categoria."
      );

      setSalvando(
        false
      );

      return;
    }


    setCategoriaEditando(
      null
    );

    setNomeCategoriaEditando(
      ""
    );

    setSalvando(
      false
    );


    await carregarCategorias();
  }


  /*
  ===========================================
  ABRIR EXCLUSÃO
  ===========================================
  */

  function abrirExclusao(
    categoria: Categoria
  ) {

    setMenuCategoriaId(
      null
    );

    setErro(
      ""
    );

    setCategoriaExcluindo(
      categoria
    );
  }


  /*
  ===========================================
  EXCLUIR CATEGORIA
  ===========================================
  */

  async function excluirCategoria() {

    if (
      !categoriaExcluindo
    ) {
      return;
    }


    setExcluindo(
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
          "sweet_categories"
        )
        .delete()
        .eq(
          "id",
          categoriaExcluindo.id
        );


    if (error) {

      console.error(
        error
      );

      setErro(
        "Não foi possível excluir a categoria."
      );

      setExcluindo(
        false
      );

      return;
    }


    setCategoriaExcluindo(
      null
    );

    setExcluindo(
      false
    );


    await carregarCategorias();
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
            href="/"
            className="back-button"
          >
            ←
          </Link>


          <div>

            <span className="page-kicker">
              PRODUÇÃO
            </span>


            <h1>
              Doces
            </h1>


            <p>
              Organize seus doces
              por categoria.
            </p>

          </div>

        </header>


        {/* RESUMO */}

        <section className="sweet-summary">

          <div className="sweet-summary-card">

            <strong>
              {totalDoces}
            </strong>

            <span>
              Tipos de doces
            </span>

          </div>


          <div className="sweet-summary-card">

            <strong>

              {totalUnidades.toLocaleString(
                "pt-BR",
                {
                  maximumFractionDigits:
                    0,
                }
              )}

            </strong>

            <span>
              Unidades prontas
            </span>

          </div>


          <div
            className={`sweet-summary-card ${
              pertoDeVencer > 0
                ? "sweet-summary-warning"
                : ""
            }`}
          >

            <strong>

              {pertoDeVencer.toLocaleString(
                "pt-BR",
                {
                  maximumFractionDigits:
                    0,
                }
              )}

            </strong>

            <span>
              Perto de vencer
            </span>

          </div>

        </section>


        {/* NOVA CATEGORIA */}

        <button
          type="button"
          className="inventory-add-button"
          onClick={
            () => {

              setErro(
                ""
              );

              setMostrarNovaCategoria(
                true
              );
            }
          }
        >
          + Nova categoria
        </button>


        {/* LISTA */}

        <section
          style={{
            marginTop:
              "24px",
          }}
        >

          {carregando ? (

            <div className="empty-purchases">

              <strong>
                Carregando...
              </strong>

            </div>

          ) : categorias.length === 0 ? (

            <div className="empty-purchases">

              <strong>
                Nenhuma categoria ainda
              </strong>


              <p>
                Crie a primeira categoria
                para começar.
              </p>

            </div>

          ) : (

            <div className="sweet-category-list">

              {categorias.map(
                (
                  categoria
                ) => {

const quantidadeDoces =
  categoria.quantidadeSabores;

                  return (

                    <div
                      key={
                        categoria.id
                      }
                      className="sweet-category-card sweet-category-card-editable"
                    >

                      <Link
                        href={`/doces/categoria/${categoria.id}`}
                        className="sweet-category-main"
                      >

                        <div>

                          <strong>
                            {categoria.name}
                          </strong>


                          <span>

                            {quantidadeDoces}{" "}

                            {quantidadeDoces === 1
                              ? "sabor"
                              : "sabores"}

                          </span>

                        </div>


                        <span className="sweet-category-arrow">
                          ›
                        </span>

                      </Link>


                      <div className="sweet-category-menu-wrapper">

                        <button
                          type="button"
                          className="sweet-category-menu-button"
                          aria-label={`Opções da categoria ${categoria.name}`}
                          onClick={
                            (
                              evento
                            ) => {

                              evento.stopPropagation();


                              setMenuCategoriaId(
                                menuCategoriaId ===
                                  categoria.id
                                  ? null
                                  : categoria.id
                              );
                            }
                          }
                        >
                          ⋮
                        </button>


                        {menuCategoriaId ===
                          categoria.id && (

                          <div className="sweet-category-menu">

                            <button
                              type="button"
                              onClick={
                                () =>
                                  abrirEdicao(
                                    categoria
                                  )
                              }
                            >
                              Editar
                            </button>


                            <button
                              type="button"
                              className="sweet-category-menu-delete"
                              onClick={
                                () =>
                                  abrirExclusao(
                                    categoria
                                  )
                              }
                            >
                              Excluir
                            </button>

                          </div>

                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

      </div>


      {/* ======================================
          MODAL NOVA CATEGORIA
      ====================================== */}

      {mostrarNovaCategoria && (

        <div
          className="delete-modal-overlay"
          onClick={
            () => {

              if (
                !salvando
              ) {

                setMostrarNovaCategoria(
                  false
                );

                setNomeCategoria(
                  ""
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
              Nova categoria
            </h2>


            <p>
              Exemplo: Palhas,
              Trufas, Bombons ou
              Doces no pote.
            </p>


            <div className="form-group">

              <label>
                Nome da categoria
              </label>


              <input
                type="text"
                placeholder="Ex: Palhas"
                value={
                  nomeCategoria
                }
                onChange={
                  (
                    event
                  ) =>
                    setNomeCategoria(
                      event.target.value
                    )
                }
                autoFocus
              />

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

                    setMostrarNovaCategoria(
                      false
                    );

                    setNomeCategoria(
                      ""
                    );

                    setErro(
                      ""
                    );
                  }
                }
                disabled={
                  salvando
                }
              >
                Cancelar
              </button>


              <button
                type="button"
                className="inventory-save-button"
                onClick={
                  salvarCategoria
                }
                disabled={
                  salvando
                }
              >

                {salvando
                  ? "Salvando..."
                  : "Criar categoria"}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================
          MODAL EDITAR CATEGORIA
      ====================================== */}

      {categoriaEditando && (

        <div
          className="delete-modal-overlay"
          onClick={
            () => {

              if (
                !salvando
              ) {

                setCategoriaEditando(
                  null
                );

                setNomeCategoriaEditando(
                  ""
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
              Editar categoria
            </h2>


            <p>
              Corrija ou altere
              o nome da categoria.
            </p>


            <div className="form-group">

              <label>
                Nome da categoria
              </label>


              <input
                type="text"
                value={
                  nomeCategoriaEditando
                }
                onChange={
                  (
                    evento
                  ) =>
                    setNomeCategoriaEditando(
                      evento.target.value
                    )
                }
                autoFocus
              />

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

                    setCategoriaEditando(
                      null
                    );

                    setNomeCategoriaEditando(
                      ""
                    );

                    setErro(
                      ""
                    );
                  }
                }
                disabled={
                  salvando
                }
              >
                Cancelar
              </button>


              <button
                type="button"
                className="inventory-save-button"
                onClick={
                  salvarEdicaoCategoria
                }
                disabled={
                  salvando
                }
              >

                {salvando
                  ? "Salvando..."
                  : "Salvar alterações"}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================
          MODAL EXCLUIR CATEGORIA
      ====================================== */}

      {categoriaExcluindo && (

        <div
          className="delete-modal-overlay"
          onClick={
            () => {

              if (
                !excluindo
              ) {

                setCategoriaExcluindo(
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
              Excluir categoria?
            </h2>


            <p>

              Você está prestes a
              excluir{" "}

              <strong>
                {categoriaExcluindo.name}
              </strong>.

            </p>


{categoriaExcluindo.quantidadeSabores > 0 && (
  <div className="sweet-delete-warning">
    <strong>Atenção</strong>

    <span>
      Esta categoria possui{" "}
      {categoriaExcluindo.quantidadeSabores}{" "}
      {categoriaExcluindo.quantidadeSabores === 1
        ? "sabor cadastrado"
        : "sabores cadastrados"}.
      {" "}
      Ao excluir a categoria,
      os itens vinculados a ela
      também poderão ser removidos.
    </span>
  </div>
)}


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

                    setCategoriaExcluindo(
                      null
                    );

                    setErro(
                      ""
                    );
                  }
                }
                disabled={
                  excluindo
                }
              >
                Cancelar
              </button>


              <button
                type="button"
                className="sweet-delete-confirm-button"
                onClick={
                  excluirCategoria
                }
                disabled={
                  excluindo
                }
              >

                {excluindo
                  ? "Excluindo..."
                  : "Excluir categoria"}

              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}
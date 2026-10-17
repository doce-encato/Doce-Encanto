"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

type CriacaoPersonalizada = {
  id: number;
  sweet_id: number;
  name: string;
  sale_price: number;
  is_archived: boolean;
};

function numeroDoCampo(valor: string) {
  const normalizado = valor
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number(normalizado);

  return Number.isFinite(numero)
    ? numero
    : NaN;
}

function formatarPreco(valor: number) {
  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function diferencaEmDias(
  dataFinal: string
) {
  const hoje = new Date();

  const hojeUTC = Date.UTC(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate()
  );

  const [ano, mes, dia] =
    dataFinal
      .split("-")
      .map(Number);

  const finalUTC = Date.UTC(
    ano,
    mes - 1,
    dia
  );

  return Math.floor(
    (finalUTC - hojeUTC) /
      (1000 * 60 * 60 * 24)
  );
}

export default function CategoriaDocesPage() {
  const params = useParams();
  const router = useRouter();

  const categoriaId =
    Number(params.id);

  const [
    categoria,
    setCategoria,
  ] =
    useState<Categoria | null>(
      null
    );

  const [
    doces,
    setDoces,
  ] =
    useState<Doce[]>([]);

  const [
    criacoesPersonalizadas,
    setCriacoesPersonalizadas,
  ] =
    useState<CriacaoPersonalizada[]>([]);

  const [
    criacoesArquivadas,
    setCriacoesArquivadas,
  ] =
    useState<CriacaoPersonalizada[]>([]);

  const [
    mostrarArquivadas,
    setMostrarArquivadas,
  ] =
    useState(false);

  const [
    arquivandoCriacaoId,
    setArquivandoCriacaoId,
  ] =
    useState<number | null>(null);

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

  const [
    mostrarNovoDoce,
    setMostrarNovoDoce,
  ] =
    useState(false);

  const [
    nomeDoce,
    setNomeDoce,
  ] =
    useState("");

  const [
    precoDoce,
    setPrecoDoce,
  ] =
    useState("");

  const [
    estoqueMinimo,
    setEstoqueMinimo,
  ] =
    useState("0");

  const [
    salvando,
    setSalvando,
  ] =
    useState(false);

  const [
    menuDoceId,
    setMenuDoceId,
  ] =
    useState<number | null>(
      null
    );

  const [
    menuCriacaoId,
    setMenuCriacaoId,
  ] =
    useState<number | null>(
      null
    );

  const [
    criacaoExcluindo,
    setCriacaoExcluindo,
  ] =
    useState<CriacaoPersonalizada | null>(
      null
    );

  const [
    excluindoCriacao,
    setExcluindoCriacao,
  ] =
    useState(false);

  const [
    doceEditando,
    setDoceEditando,
  ] =
    useState<Doce | null>(
      null
    );

  const [
    nomeDoceEditando,
    setNomeDoceEditando,
  ] =
    useState("");

  const [
    precoDoceEditando,
    setPrecoDoceEditando,
  ] =
    useState("");

  const [
    estoqueMinimoEditando,
    setEstoqueMinimoEditando,
  ] =
    useState("0");

  const [
    doceExcluindo,
    setDoceExcluindo,
  ] =
    useState<Doce | null>(
      null
    );

  const [
    excluindo,
    setExcluindo,
  ] =
    useState(false);

  const [
    pertoDeVencer,
    setPertoDeVencer,
  ] =
    useState(0);

  const docesNormais =
    useMemo(
      () =>
        doces.filter(
          (doce) =>
            !doce.is_customizable
        ),
      [doces]
    );

  const monteSeu =
    useMemo(
      () =>
        doces.find(
          (doce) =>
            doce.is_customizable
        ) ?? null,
      [doces]
    );

  const totalUnidades =
    useMemo(
      () =>
        docesNormais.reduce(
          (
            total,
            doce
          ) =>
            total +
            Number(
              doce.quantity || 0
            ),
          0
        ),
      [docesNormais]
    );

  async function garantirMonteSeu() {
    const {
      data: existente,
      error: buscaError,
    } =
      await supabase
        .from("sweets")
        .select("id")
        .eq(
          "category_id",
          categoriaId
        )
        .eq(
          "is_customizable",
          true
        )
        .maybeSingle();

    if (buscaError) {
      console.error(
        buscaError
      );

      return;
    }

    if (existente) {
      return;
    }

    const {
      error: insertError,
    } =
      await supabase
        .from("sweets")
        .insert({
          category_id:
            categoriaId,

          name:
            "Monte o seu",

          quantity:
            0,

          minimum_quantity:
            0,

          sale_price:
            0,

          is_customizable:
            true,
        });

    if (insertError) {
      console.error(
        insertError
      );
    }
  }

  async function carregarPagina() {
    setCarregando(true);

    setErro("");

    const {
      data: categoriaData,
      error: categoriaError,
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

      setCarregando(false);

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

    await garantirMonteSeu();

    const {
      data: docesData,
      error: docesError,
    } =
      await supabase
        .from("sweets")
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
          "category_id",
          categoriaId
        )
        .order(
          "is_customizable",
          {
            ascending: true,
          }
        )
        .order(
          "name",
          {
            ascending: true,
          }
        );

    if (docesError) {
      console.error(
        docesError
      );

      setErro(
        "Não foi possível carregar os doces."
      );

      setCarregando(false);

      return;
    }

    const docesConvertidos: Doce[] =
      (docesData ?? []).map(
        (item) => ({
          id:
            Number(item.id),

          category_id:
            Number(
              item.category_id
            ),

          name:
            String(item.name),

          quantity:
            Number(
              item.quantity ?? 0
            ),

          minimum_quantity:
            Number(
              item.minimum_quantity ??
                0
            ),

          sale_price:
            Number(
              item.sale_price ?? 0
            ),

          is_customizable:
            Boolean(
              item.is_customizable
            ),
        })
      );

    setDoces(
      docesConvertidos
    );

    const personalizavel =
      docesConvertidos.find(
        (item) =>
          item.is_customizable
      ) ?? null;

    if (personalizavel) {
      const {
        data: criacoesData,
        error: criacoesError,
      } =
        await supabase
          .from(
            "sweet_custom_creations"
          )
          .select(
            "id, sweet_id, name, sale_price, is_archived"
          )
          .eq(
            "sweet_id",
            personalizavel.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (criacoesError) {
        console.error(
          criacoesError
        );

        setCriacoesPersonalizadas(
          []
        );
      } else {
        const criacoesConvertidas: CriacaoPersonalizada[] =
          (criacoesData ?? []).map(
            (item) => ({
              id:
                Number(
                  item.id
                ),

              sweet_id:
                Number(
                  item.sweet_id
                ),

              name:
                String(
                  item.name
                ),

              sale_price:
                Number(
                  item.sale_price ?? 0
                ),

              is_archived:
                Boolean(
                  item.is_archived
                ),
            })
          );

        setCriacoesPersonalizadas(
          criacoesConvertidas.filter(
            (item) => !item.is_archived
          )
        );

        setCriacoesArquivadas(
          criacoesConvertidas.filter(
            (item) => item.is_archived
          )
        );
      }
    } else {
      setCriacoesPersonalizadas(
        []
      );

      setCriacoesArquivadas(
        []
      );
    }

    const idsDosDoces =
      docesConvertidos.map(
        (item) =>
          item.id
      );

    if (
      idsDosDoces.length === 0
    ) {
      setPertoDeVencer(
        0
      );

      setCarregando(
        false
      );

      return;
    }

    const {
      data: lotesData,
      error: lotesError,
    } =
      await supabase
        .from(
          "sweet_batches"
        )
        .select(`
          quantity,
          expires_at,
          alert_days_before,
          sweet_id
        `)
        .in(
          "sweet_id",
          idsDosDoces
        )
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
      const totalAlerta =
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

              const dias =
                diferencaEmDias(
                  String(
                    lote.expires_at
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
        totalAlerta
      );
    }

    setCarregando(
      false
    );
  }

  useEffect(
    () => {
      if (categoriaId) {
        carregarPagina();
      }
    },
    [categoriaId]
  );

  function fecharNovoDoce() {
    setMostrarNovoDoce(
      false
    );

    setNomeDoce(
      ""
    );

    setPrecoDoce(
      ""
    );

    setEstoqueMinimo(
      "0"
    );

    setErro(
      ""
    );
  }

  async function salvarNovoDoce() {
    setErro("");

    if (
      !nomeDoce.trim()
    ) {
      setErro(
        "Digite o nome do doce."
      );

      return;
    }

    const preco =
      numeroDoCampo(
        precoDoce
      );

    if (
      Number.isNaN(
        preco
      ) ||
      preco < 0
    ) {
      setErro(
        "Informe um preço válido."
      );

      return;
    }

    const minimo =
      Number(
        estoqueMinimo
      );

    if (
      estoqueMinimo ===
        "" ||
      Number.isNaN(
        minimo
      ) ||
      minimo < 0
    ) {
      setErro(
        "Informe um estoque mínimo válido."
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
        .from("sweets")
        .insert({
          category_id:
            categoriaId,

          name:
            nomeDoce.trim(),

          quantity:
            0,

          minimum_quantity:
            minimo,

          sale_price:
            preco,

          is_customizable:
            false,
        });

    if (error) {
      console.error(
        error
      );

      setErro(
        "Não foi possível cadastrar o doce."
      );

      setSalvando(
        false
      );

      return;
    }

    fecharNovoDoce();

    setSalvando(
      false
    );

    await carregarPagina();
  }

  function abrirEdicao(
    doce: Doce
  ) {
    setMenuDoceId(
      null
    );

    setErro(
      ""
    );

    setDoceEditando(
      doce
    );

    setNomeDoceEditando(
      doce.name
    );

    setPrecoDoceEditando(
      Number(
        doce.sale_price
      )
        .toFixed(2)
        .replace(
          ".",
          ","
        )
    );

    setEstoqueMinimoEditando(
      String(
        doce.minimum_quantity
      )
    );
  }

  function fecharEdicao() {
    setDoceEditando(
      null
    );

    setNomeDoceEditando(
      ""
    );

    setPrecoDoceEditando(
      ""
    );

    setEstoqueMinimoEditando(
      "0"
    );

    setErro(
      ""
    );
  }

  async function salvarEdicaoDoce() {
    if (
      !doceEditando
    ) {
      return;
    }

    setErro("");

    if (
      !nomeDoceEditando.trim()
    ) {
      setErro(
        "Digite o nome do doce."
      );

      return;
    }

    const preco =
      numeroDoCampo(
        precoDoceEditando
      );

    if (
      Number.isNaN(
        preco
      ) ||
      preco < 0
    ) {
      setErro(
        "Informe um preço válido."
      );

      return;
    }

    const minimo =
      Number(
        estoqueMinimoEditando
      );

    if (
      estoqueMinimoEditando ===
        "" ||
      Number.isNaN(
        minimo
      ) ||
      minimo < 0
    ) {
      setErro(
        "Informe um estoque mínimo válido."
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
        .from("sweets")
        .update({
          name:
            nomeDoceEditando.trim(),

          sale_price:
            preco,

          minimum_quantity:
            doceEditando
              .is_customizable
              ? 0
              : minimo,
        })
        .eq(
          "id",
          doceEditando.id
        );

    if (error) {
      console.error(
        error
      );

      setErro(
        "Não foi possível editar o doce."
      );

      setSalvando(
        false
      );

      return;
    }

    fecharEdicao();

    setSalvando(
      false
    );

    await carregarPagina();
  }

  function abrirExclusao(
    doce: Doce
  ) {
    setMenuDoceId(
      null
    );

    setErro(
      ""
    );

    setDoceExcluindo(
      doce
    );
  }

  async function excluirDoce() {
    if (
      !doceExcluindo
    ) {
      return;
    }

    if (
      doceExcluindo.is_customizable
    ) {
      setErro(
        'O item "Monte o seu" é padrão da categoria e não pode ser excluído.'
      );

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
        .from("sweets")
        .delete()
        .eq(
          "id",
          doceExcluindo.id
        );

    if (error) {
      console.error(
        error
      );

      setErro(
        "Não foi possível excluir o doce."
      );

      setExcluindo(
        false
      );

      return;
    }

    setDoceExcluindo(
      null
    );

    setExcluindo(
      false
    );

    await carregarPagina();
  }

  async function arquivarCriacaoPersonalizada(
    criacao: CriacaoPersonalizada
  ) {
    setArquivandoCriacaoId(criacao.id);
    setErro("");
    setMenuCriacaoId(null);

    const { error } = await supabase
      .from("sweet_custom_creations")
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", criacao.id);

    if (error) {
      console.error(error);
      setErro("Não foi possível arquivar o personalizado.");
      setArquivandoCriacaoId(null);
      return;
    }

    setArquivandoCriacaoId(null);
    await carregarPagina();
  }

  async function restaurarCriacaoPersonalizada(
    criacao: CriacaoPersonalizada
  ) {
    setArquivandoCriacaoId(criacao.id);
    setErro("");

    const { error } = await supabase
      .from("sweet_custom_creations")
      .update({
        is_archived: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", criacao.id);

    if (error) {
      console.error(error);
      setErro("Não foi possível restaurar o personalizado.");
      setArquivandoCriacaoId(null);
      return;
    }

    setArquivandoCriacaoId(null);
    await carregarPagina();
  }

  async function excluirCriacaoPersonalizada() {
    if (!criacaoExcluindo) {
      return;
    }

    setExcluindoCriacao(true);
    setErro("");

    const { error } = await supabase
      .from("sweet_custom_creations")
      .delete()
      .eq("id", criacaoExcluindo.id);

    if (error) {
      console.error(error);
      setErro("Não foi possível excluir o personalizado.");
      setExcluindoCriacao(false);
      return;
    }

    setCriacaoExcluindo(null);
    setMenuCriacaoId(null);
    setExcluindoCriacao(false);

    await carregarPagina();
  }

  if (carregando) {
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

  if (!categoria) {
    return (
      <main className="compras-page">
        <div className="page-shell">
          <Link
            href="/doces"
            className="back-button"
          >
            ←
          </Link>

          <div className="empty-purchases">
            <strong>
              Categoria não encontrada
            </strong>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="compras-page">
      <div className="page-shell">

        <header className="page-header">
          <Link
            href="/doces"
            className="back-button"
          >
            ←
          </Link>

          <div>
            <span className="page-kicker">
              DOCES
            </span>

            <h1>
              {categoria.name}
            </h1>

            <p>
              Gerencie os doces desta categoria.
            </p>
          </div>
        </header>

        <section className="sweet-category-summary">

          <div>
            <strong>
              {docesNormais.length + criacoesPersonalizadas.length}
            </strong>

            <span>
              {docesNormais.length + criacoesPersonalizadas.length === 1
                ? "doce cadastrado"
                : "doces cadastrados"}
            </span>
          </div>

          <div>
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
              unidades prontas
            </span>
          </div>

          <div
            className={
              pertoDeVencer > 0
                ? "sweet-summary-warning"
                : ""
            }
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
              perto de vencer
            </span>
          </div>

        </section>

        <button
          type="button"
          className="inventory-add-button"
          onClick={() => {
            setErro("");

            setNomeDoce("");

            setPrecoDoce("");

            setEstoqueMinimo(
              "0"
            );

            setMostrarNovoDoce(
              true
            );
          }}
        >
          + Novo doce
        </button>

        <section
          style={{
            marginTop:
              "24px",
          }}
        >

          {erro &&
            !mostrarNovoDoce &&
            !doceEditando &&
            !doceExcluindo && (
              <div className="form-error">
                {erro}
              </div>
            )}

          {docesNormais.length === 0 &&
          criacoesPersonalizadas.length === 0 ? (

            <div className="empty-purchases">

              <strong>
                Nenhum doce cadastrado
              </strong>

              <p>
                Adicione o primeiro doce
                desta categoria.
              </p>

            </div>

          ) : (

            <div className="sweet-product-list">

              {docesNormais.map(
                (doce) => {

                  const estoqueBaixo =
                    Number(
                      doce.quantity
                    ) <=
                    Number(
                      doce.minimum_quantity
                    );

                  return (
                    <div
                      key={
                        `doce-${doce.id}`
                      }
                      className="sweet-product-card sweet-product-card-editable"
                    >

                      <Link
                        href={`/doces/categoria/${categoriaId}/doce/${doce.id}`}
                        className="sweet-product-main"
                      >

                        <div className="sweet-product-info">

                          <strong>
                            {doce.name}
                          </strong>

                          <span className="sweet-product-price">
                            {formatarPreco(
                              doce.sale_price
                            )}
                          </span>

                          <span>
                            Estoque:{" "}
                            {Number(
                              doce.quantity
                            ).toLocaleString(
                              "pt-BR",
                              {
                                maximumFractionDigits:
                                  0,
                              }
                            )}{" "}
                            un
                          </span>

                        </div>

                        <div className="sweet-product-right">

                          {estoqueBaixo && (
                            <span className="sweet-stock-low">
                              Estoque baixo
                            </span>
                          )}

                          <span className="sweet-category-arrow">
                            ›
                          </span>

                        </div>

                      </Link>

                      <div className="sweet-product-menu-wrapper">

                        <button
                          type="button"
                          className="sweet-product-menu-button"
                          aria-label={`Opções de ${doce.name}`}
                          onClick={() =>
                            setMenuDoceId(
                              menuDoceId === doce.id
                                ? null
                                : doce.id
                            )
                          }
                        >
                          ⋮
                        </button>

                        {menuDoceId === doce.id && (
                          <div className="sweet-product-menu">

                            <button
                              type="button"
                              onClick={() =>
                                abrirEdicao(
                                  doce
                                )
                              }
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className="sweet-product-menu-delete"
                              onClick={() =>
                                abrirExclusao(
                                  doce
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

              {criacoesPersonalizadas.map(
                (criacao) => (

                  <div
                    key={
                      `personalizado-${criacao.id}`
                    }
                    className="sweet-product-card sweet-product-card-editable sweet-created-custom-card"
                  >

                    <div
                      className="sweet-product-main"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!monteSeu) return;

                        router.push(
                          `/doces/categoria/${categoriaId}/personalizado/${monteSeu.id}`
                        );
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          monteSeu
                        ) {
                          router.push(
                            `/doces/categoria/${categoriaId}/personalizado/${monteSeu.id}`
                          );
                        }
                      }}
                    >

                      <div className="sweet-product-info">

                        <div className="sweet-created-custom-title">
                          <strong>
                            {criacao.name}
                          </strong>

                          <span>
                            ✨ Personalizado
                          </span>
                        </div>

                        <span className="sweet-product-price">
                          {formatarPreco(
                            criacao.sale_price
                          )}
                        </span>

                        <span>
                          Criação personalizada
                        </span>

                      </div>

                      <div className="sweet-product-right">

                        <span className="sweet-category-arrow">
                          ›
                        </span>

                      </div>

                    </div>

                    <div className="sweet-product-menu-wrapper">

                      <button
                        type="button"
                        className="sweet-product-menu-button"
                        aria-label={`Opções de ${criacao.name}`}
                        onClick={(event) => {
                          event.stopPropagation();

                          setMenuCriacaoId(
                            menuCriacaoId === criacao.id
                              ? null
                              : criacao.id
                          );
                        }}
                      >
                        ⋮
                      </button>

                      {menuCriacaoId === criacao.id && (

                        <div
                          className="sweet-product-menu"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuCriacaoId(null);

                              if (!monteSeu) return;

                              router.push(
                                `/doces/categoria/${categoriaId}/personalizado/${monteSeu.id}?edit=${criacao.id}`
                              );
                            }}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              arquivarCriacaoPersonalizada(criacao);
                            }}
                            disabled={
                              arquivandoCriacaoId === criacao.id
                            }
                          >
                            {arquivandoCriacaoId === criacao.id
                              ? "Arquivando..."
                              : "Arquivar"}
                          </button>

                          <button
                            type="button"
                            className="sweet-product-menu-delete"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuCriacaoId(null);
                              setErro("");
                              setCriacaoExcluindo(criacao);
                            }}
                          >
                            Excluir
                          </button>

                        </div>

                      )}

                    </div>

                  </div>

                )
              )}

            </div>

          )}

          {criacoesArquivadas.length > 0 && (

            <div className="sweet-archived-section">

              <button
                type="button"
                className="sweet-archived-toggle"
                onClick={() =>
                  setMostrarArquivadas(
                    !mostrarArquivadas
                  )
                }
              >
                {mostrarArquivadas
                  ? "Ocultar arquivados"
                  : `Ver arquivados (${criacoesArquivadas.length})`}
              </button>

              {mostrarArquivadas && (

                <div className="sweet-archived-list">

                  {criacoesArquivadas.map(
                    (criacao) => (

                      <div
                        key={`arquivado-${criacao.id}`}
                        className="sweet-archived-card"
                      >

                        <div>
                          <strong>
                            {criacao.name}
                          </strong>

                          <span>
                            {formatarPreco(
                              criacao.sale_price
                            )}
                          </span>

                          <small>
                            Arquivado
                          </small>
                        </div>

                        <button
                          type="button"
                          className="sweet-restore-button"
                          onClick={() =>
                            restaurarCriacaoPersonalizada(
                              criacao
                            )
                          }
                          disabled={
                            arquivandoCriacaoId === criacao.id
                          }
                        >
                          {arquivandoCriacaoId === criacao.id
                            ? "Restaurando..."
                            : "Restaurar"}
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          )}

          {monteSeu && (

            <div className="sweet-custom-section">

              <span className="section-kicker">
                PERSONALIZÁVEL
              </span>

              <div className="sweet-custom-card">

                <Link
                  href={`/doces/categoria/${categoriaId}/personalizado/${monteSeu.id}`}
                  className="sweet-custom-main"
                >

                  <div className="sweet-custom-icon">
                    ✨
                  </div>

                  <div className="sweet-custom-info">

                    <strong>
                      {monteSeu.name}
                    </strong>

                    <span>
                      Criar novo personalizado
                    </span>

                    <small>
                      Monte uma opção personalizada desta categoria
                    </small>

                  </div>

                  <span className="sweet-category-arrow">
                    ›
                  </span>

                </Link>

                <div className="sweet-product-menu-wrapper">

                  <button
                    type="button"
                    className="sweet-product-menu-button"
                    aria-label="Opções do produto personalizável"
                    onClick={() =>
                      setMenuDoceId(
                        menuDoceId === monteSeu.id
                          ? null
                          : monteSeu.id
                      )
                    }
                  >
                    ⋮
                  </button>

                  {menuDoceId === monteSeu.id && (

                    <div className="sweet-product-menu">

                      <button
                        type="button"
                        onClick={() =>
                          abrirEdicao(
                            monteSeu
                          )
                        }
                      >
                        Editar nome e preço
                      </button>

                    </div>

                  )}

                </div>

              </div>

            </div>

          )}

        </section>

      </div>

      {mostrarNovoDoce && (

        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (!salvando) {
              fecharNovoDoce();
            }
          }}
        >

          <div
            className="inventory-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <h2>
              Novo doce
            </h2>

            <p>
              Adicione um doce em{" "}
              <strong>
                {categoria.name}
              </strong>.
            </p>

            <div className="form-group">

              <label>
                Nome do doce
              </label>

              <input
                type="text"
                placeholder="Ex.: Tradicional"
                value={
                  nomeDoce
                }
                onChange={(event) =>
                  setNomeDoce(
                    event.target.value
                  )
                }
                autoFocus
              />

            </div>

            <div className="form-group">

              <label>
                Preço de venda
              </label>

              <div className="money-input-row">

                <span>
                  R$
                </span>

                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex.: 8,00"
                  value={
                    precoDoce
                  }
                  onChange={(event) =>
                    setPrecoDoce(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>

            <div className="form-group">

              <label>
                Avisar quando chegar a
              </label>

              <div className="quantity-unit-row">

                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ex.: 5"
                  value={
                    estoqueMinimo
                  }
                  onChange={(event) =>
                    setEstoqueMinimo(
                      event.target.value
                    )
                  }
                />

                <select
                  value="unidade"
                  disabled
                >
                  <option value="unidade">
                    un
                  </option>
                </select>

              </div>

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
                  fecharNovoDoce
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
                  salvarNovoDoce
                }
                disabled={
                  salvando
                }
              >
                {salvando
                  ? "Salvando..."
                  : "Cadastrar doce"}
              </button>

            </div>

          </div>

        </div>

      )}

      {doceEditando && (

        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (!salvando) {
              fecharEdicao();
            }
          }}
        >

          <div
            className="inventory-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <h2>
              {doceEditando.is_customizable
                ? "Editar produto personalizável"
                : "Editar doce"}
            </h2>

            <p>
              Altere o nome e o preço
              quando precisar.
            </p>

            <div className="form-group">

              <label>
                Nome
              </label>

              <input
                type="text"
                value={
                  nomeDoceEditando
                }
                onChange={(event) =>
                  setNomeDoceEditando(
                    event.target.value
                  )
                }
                autoFocus
              />

            </div>

            <div className="form-group">

              <label>
                {doceEditando.is_customizable
                  ? "Preço base"
                  : "Preço de venda"}
              </label>

              <div className="money-input-row">

                <span>
                  R$
                </span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    precoDoceEditando
                  }
                  onChange={(event) =>
                    setPrecoDoceEditando(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>

            {!doceEditando.is_customizable && (

              <div className="form-group">

                <label>
                  Avisar quando chegar a
                </label>

                <div className="quantity-unit-row">

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      estoqueMinimoEditando
                    }
                    onChange={(event) =>
                      setEstoqueMinimoEditando(
                        event.target.value
                      )
                    }
                  />

                  <select
                    value="unidade"
                    disabled
                  >
                    <option value="unidade">
                      un
                    </option>
                  </select>

                </div>

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
                  fecharEdicao
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
                  salvarEdicaoDoce
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

      {criacaoExcluindo && (

        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (!excluindoCriacao) {
              setCriacaoExcluindo(null);
              setErro("");
            }
          }}
        >

          <div
            className="inventory-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <h2>
              Excluir personalizado?
            </h2>

            <p>
              Você está prestes a excluir{" "}
              <strong>
                {criacaoExcluindo.name}
              </strong>.
            </p>

            <div className="sweet-delete-warning">

              <strong>
                O histórico de vendas será preservado
              </strong>

              <span>
                A criação some da lista de produtos, mas vendas antigas continuam registradas com nome, quantidade e preço da época.
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
                onClick={() => {
                  setCriacaoExcluindo(null);
                  setErro("");
                }}
                disabled={excluindoCriacao}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="sweet-delete-confirm-button"
                onClick={excluirCriacaoPersonalizada}
                disabled={excluindoCriacao}
              >
                {excluindoCriacao
                  ? "Excluindo..."
                  : "Excluir personalizado"}
              </button>

            </div>

          </div>

        </div>

      )}

      {doceExcluindo && (

        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (!excluindo) {
              setDoceExcluindo(
                null
              );

              setErro(
                ""
              );
            }
          }}
        >

          <div
            className="inventory-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <h2>
              Excluir doce?
            </h2>

            <p>
              Você está prestes a excluir{" "}
              <strong>
                {doceExcluindo.name}
              </strong>.
            </p>

            <div className="sweet-delete-warning">

              <strong>
                Atenção
              </strong>

              <span>
                Os lotes e outros dados
                vinculados a este doce
                também podem ser
                removidos.
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
                onClick={() => {
                  setDoceExcluindo(
                    null
                  );

                  setErro(
                    ""
                  );
                }}
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
                  excluirDoce
                }
                disabled={
                  excluindo
                }
              >
                {excluindo
                  ? "Excluindo..."
                  : "Excluir doce"}
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}
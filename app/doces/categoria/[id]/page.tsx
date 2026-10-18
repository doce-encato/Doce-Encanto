"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  calcularCustosMediosPonderados,
  normalizarQuantidadeParaBase,
} from "@/lib/custos";

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

type ResumoCustoDoce = {
  custoUnitario: number | null;
  semReceita: boolean;
  custoIncompleto: boolean;
};

type ReceitaCustoCategoria = {
  id: number;
  sweet_id: number;
  yield_quantity: number;
};

type ItemReceitaCustoCategoria = {
  recipe_id: number;
  inventory_item_id: number;
  quantity: number;
  unit: string;
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

  const [
    custosPorDoce,
    setCustosPorDoce,
  ] = useState<Record<number, ResumoCustoDoce>>({});

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

  async function carregarCustosDaCategoria(
    listaDoces: Doce[]
  ) {
    const docesParaCalcular = listaDoces.filter(
      (item) => !item.is_customizable
    );

    if (docesParaCalcular.length === 0) {
      setCustosPorDoce({});
      return;
    }

    const idsDoces = docesParaCalcular.map(
      (item) => item.id
    );

    const resumoInicial: Record<number, ResumoCustoDoce> = {};

    idsDoces.forEach((id) => {
      resumoInicial[id] = {
        custoUnitario: null,
        semReceita: true,
        custoIncompleto: false,
      };
    });

    const {
      data: receitasData,
      error: receitasError,
    } = await supabase
      .from("sweet_recipes")
      .select("id, sweet_id, yield_quantity")
      .in("sweet_id", idsDoces)
      .order("created_at", { ascending: true });

    if (receitasError) {
      console.error(receitasError);
      setCustosPorDoce(resumoInicial);
      return;
    }

    const receitas: ReceitaCustoCategoria[] =
      (receitasData ?? [])
        .filter((receita) => receita.sweet_id != null)
        .map((receita) => ({
          id: Number(receita.id),
          sweet_id: Number(receita.sweet_id),
          yield_quantity: Number(receita.yield_quantity ?? 0),
        }));

    receitas.forEach((receita) => {
      resumoInicial[receita.sweet_id] = {
        custoUnitario: null,
        semReceita: false,
        custoIncompleto: false,
      };
    });

    if (receitas.length === 0) {
      setCustosPorDoce(resumoInicial);
      return;
    }

    const idsReceitas = receitas.map(
      (receita) => receita.id
    );

    const {
      data: itensData,
      error: itensError,
    } = await supabase
      .from("sweet_recipe_items")
      .select("recipe_id, inventory_item_id, quantity, unit")
      .in("recipe_id", idsReceitas);

    if (itensError) {
      console.error(itensError);

      receitas.forEach((receita) => {
        resumoInicial[receita.sweet_id] = {
          custoUnitario: null,
          semReceita: false,
          custoIncompleto: true,
        };
      });

      setCustosPorDoce(resumoInicial);
      return;
    }

    const itensReceita: ItemReceitaCustoCategoria[] =
      (itensData ?? []).map((item) => ({
        recipe_id: Number(item.recipe_id),
        inventory_item_id: Number(item.inventory_item_id),
        quantity: Number(item.quantity ?? 0),
        unit: String(item.unit),
      }));

    const idsEstoque = Array.from(
      new Set(
        itensReceita.map(
          (item) => item.inventory_item_id
        )
      )
    );

    if (idsEstoque.length === 0) {
      receitas.forEach((receita) => {
        resumoInicial[receita.sweet_id] = {
          custoUnitario: null,
          semReceita: false,
          custoIncompleto: true,
        };
      });

      setCustosPorDoce(resumoInicial);
      return;
    }

    const {
      data: estoqueData,
      error: estoqueError,
    } = await supabase
      .from("inventory_items")
      .select("id, unit")
      .in("id", idsEstoque);

    if (estoqueError) {
      console.error(estoqueError);
      setCustosPorDoce(resumoInicial);
      return;
    }

    const unidadesBase = new Map<number, string>(
      (estoqueData ?? []).map((item) => [
        Number(item.id),
        String(item.unit),
      ])
    );

    const {
      data: comprasData,
      error: comprasError,
    } = await supabase
      .from("purchase_items")
      .select("inventory_item_id, quantity, unit, total_price")
      .in("inventory_item_id", idsEstoque);

    if (comprasError) {
      console.error(comprasError);
      setCustosPorDoce(resumoInicial);
      return;
    }

    const custosMedios = calcularCustosMediosPonderados(
      (comprasData ?? []).map((item) => ({
        inventory_item_id:
          item.inventory_item_id == null
            ? null
            : Number(item.inventory_item_id),
        quantity: Number(item.quantity ?? 0),
        unit: String(item.unit),
        total_price: Number(item.total_price ?? 0),
      })),
      unidadesBase
    );

    const receitasPorDoce = new Map<number, ReceitaCustoCategoria[]>();

    receitas.forEach((receita) => {
      const atuais = receitasPorDoce.get(receita.sweet_id) ?? [];
      atuais.push(receita);
      receitasPorDoce.set(receita.sweet_id, atuais);
    });

    const resultado: Record<number, ResumoCustoDoce> = {
      ...resumoInicial,
    };

    docesParaCalcular.forEach((doce) => {
      const receitasDoDoce = receitasPorDoce.get(doce.id) ?? [];

      if (receitasDoDoce.length === 0) {
        resultado[doce.id] = {
          custoUnitario: null,
          semReceita: true,
          custoIncompleto: false,
        };
        return;
      }

      let custoUnitarioTotal = 0;
      let completo = true;

      receitasDoDoce.forEach((receita) => {
        if (receita.yield_quantity <= 0) {
          completo = false;
          return;
        }

        const itensDaReceita = itensReceita.filter(
          (item) => item.recipe_id === receita.id
        );

        if (itensDaReceita.length === 0) {
          completo = false;
          return;
        }

        let custoDaReceita = 0;

        itensDaReceita.forEach((item) => {
          const unidadeBase = unidadesBase.get(
            item.inventory_item_id
          );

          const custoMedio = custosMedios.get(
            item.inventory_item_id
          );

          const quantidadeNormalizada = unidadeBase
            ? normalizarQuantidadeParaBase(
                item.quantity,
                item.unit,
                unidadeBase
              )
            : null;

          if (
            unidadeBase == null ||
            custoMedio == null ||
            quantidadeNormalizada == null
          ) {
            completo = false;
            return;
          }

          custoDaReceita +=
            quantidadeNormalizada * custoMedio;
        });

        if (completo) {
          custoUnitarioTotal +=
            custoDaReceita / receita.yield_quantity;
        }
      });

      resultado[doce.id] = {
        custoUnitario: completo
          ? custoUnitarioTotal
          : null,
        semReceita: false,
        custoIncompleto: !completo,
      };
    });

    setCustosPorDoce(resultado);
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

    await carregarCustosDaCategoria(
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

async function abrirEdicao(
  doce: Doce
) {
  setMenuDoceId(null);
  setErro("");

  /*
   * Busca novamente o doce diretamente no banco.
   *
   * Isso evita usar um valor antigo que possa ter ficado
   * no estado da categoria anterior.
   */
  const {
    data: doceAtualizado,
    error,
  } = await supabase
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
    .eq("id", doce.id)
    .eq("category_id", categoriaId)
    .single();

  if (error || !doceAtualizado) {
    console.error(error);

    setErro(
      "Não foi possível carregar os dados atuais deste doce."
    );

    return;
  }

  const doceDoBanco: Doce = {
    id: Number(doceAtualizado.id),

    category_id:
      Number(doceAtualizado.category_id),

    name:
      String(doceAtualizado.name),

    quantity:
      Number(doceAtualizado.quantity ?? 0),

    minimum_quantity:
      Number(
        doceAtualizado.minimum_quantity ?? 0
      ),

    sale_price:
      Number(doceAtualizado.sale_price ?? 0),

    is_customizable:
      Boolean(doceAtualizado.is_customizable),
  };

  setDoceEditando(
    doceDoBanco
  );

  setNomeDoceEditando(
    doceDoBanco.name
  );

  setPrecoDoceEditando(
    Number(
      doceDoBanco.sale_price
    )
      .toFixed(2)
      .replace(
        ".",
        ","
      )
  );

  setEstoqueMinimoEditando(
    String(
      doceDoBanco.minimum_quantity
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
              {docesNormais.length}
            </strong>

            <span>
              {docesNormais.length === 1
                ? "sabor"
                : "sabores"}
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
          className="sweet-flavors-section"
          style={{
            marginTop:
              "24px",
          }}
        >

          <div className="sweet-flavors-heading">
            <div>
              <span className="section-kicker">SABORES</span>
              <h2>Escolha um sabor</h2>
            </div>
            <small>Toque em um sabor para ver estoque, receita e precificação.</small>
          </div>

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

                  const custoInfo =
                    custosPorDoce[doce.id];

                  const custoUnitario =
                    custoInfo?.custoUnitario ?? null;

                  const margem =
                    custoUnitario != null &&
                    Number(doce.sale_price) > 0
                      ? ((Number(doce.sale_price) - custoUnitario) /
                          Number(doce.sale_price)) *
                        100
                      : null;

                  const valorEstoque =
                    custoUnitario != null
                      ? custoUnitario * Number(doce.quantity || 0)
                      : null;

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

                        <div className="sweet-product-info sweet-product-info-financial">

                          <strong className="sweet-product-name">
                            {doce.name}
                          </strong>

                          <div className="sweet-product-financial-grid">

                            <div>
                              <span>Venda</span>
                              <strong>
                                {formatarPreco(
                                  doce.sale_price
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>Custo</span>
                              <strong>
                                {custoUnitario != null
                                  ? formatarPreco(custoUnitario)
                                  : "—"}
                              </strong>
                            </div>

                            <div>
                              <span>Margem</span>
                              <strong>
                                {margem != null
                                  ? `${margem.toLocaleString(
                                      "pt-BR",
                                      {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 1,
                                      }
                                    )}%`
                                  : "—"}
                              </strong>
                            </div>

                          </div>

                          <div className="sweet-product-stock-line">
                            <span>
                              Estoque:{" "}
                              <strong>
                                {Number(
                                  doce.quantity
                                ).toLocaleString(
                                  "pt-BR",
                                  {
                                    maximumFractionDigits: 0,
                                  }
                                )}{" "}
                                un
                              </strong>
                            </span>

                            {valorEstoque != null && (
                              <small>
                                Valor em estoque:{" "}
                                <strong>
                                  {formatarPreco(valorEstoque)}
                                </strong>
                              </small>
                            )}
                          </div>

                          {custoInfo?.semReceita && (
                            <span className="sweet-product-cost-note">
                              Cadastre a receita para calcular o custo
                            </span>
                          )}

                          {custoInfo?.custoIncompleto && (
                            <span className="sweet-product-cost-note sweet-product-cost-note-warning">
                              Custo pendente: falta histórico de compra ou há ingrediente incompatível
                            </span>
                          )}

                        </div>

<div className="sweet-product-right">
  {estoqueBaixo && (
    <span className="sweet-stock-low">
      Estoque baixo
    </span>
  )}
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

              {criacoesPersonalizadas.length > 0 && (
                <div className="sweet-list-subsection-label">
                  <span>PERSONALIZADOS CRIADOS</span>
                </div>
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
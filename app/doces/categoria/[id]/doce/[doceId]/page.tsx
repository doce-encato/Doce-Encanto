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


type Lote = {
  id: number;
  sweet_id: number;
  batch_code: string | null;
  quantity: number;
  produced_at: string;
  expires_at: string | null;
  alert_days_before: number;
};


type ReceitaCusto = {
  id: number;
  yield_quantity: number;
};

type ReceitaItemCusto = {
  recipe_id: number;
  inventory_item_id: number;
  quantity: number;
  unit: string;
};

type EstoqueCusto = {
  id: number;
  name: string;
  unit: string;
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


  const [
    custoUnitario,
    setCustoUnitario,
  ] = useState<number | null>(null);


  const [
    itensSemCusto,
    setItensSemCusto,
  ] = useState<string[]>([]);


  const [
    quantidadeReceitas,
    setQuantidadeReceitas,
  ] = useState(0);


  const [
    precoVendaInput,
    setPrecoVendaInput,
  ] = useState("");


  const [
    salvandoPreco,
    setSalvandoPreco,
  ] = useState(false);


  const [
    avisoCusto,
    setAvisoCusto,
  ] = useState("");


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

    if (Number(lote.quantity) <= 0) {
      return {
        tipo: "concluido",
        texto: "Concluído",
      };
    }

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


  async function carregarCustosDoDoce() {
    setCustoUnitario(null);
    setItensSemCusto([]);
    setQuantidadeReceitas(0);
    setAvisoCusto("");

    const {
      data: receitasData,
      error: receitasError,
    } = await supabase
      .from("sweet_recipes")
      .select("id, yield_quantity")
      .eq("sweet_id", doceId)
      .order("created_at", { ascending: true });

    if (receitasError) {
      console.error(receitasError);
      setAvisoCusto(
        "Não foi possível calcular o custo das receitas agora."
      );
      return;
    }

    const receitas: ReceitaCusto[] =
      (receitasData ?? []).map((receita) => ({
        id: Number(receita.id),
        yield_quantity: Number(receita.yield_quantity ?? 0),
      }));

    setQuantidadeReceitas(receitas.length);

    if (receitas.length === 0) {
      return;
    }

    const idsReceitas = receitas.map((receita) => receita.id);

    const {
      data: itensData,
      error: itensError,
    } = await supabase
      .from("sweet_recipe_items")
      .select("recipe_id, inventory_item_id, quantity, unit")
      .in("recipe_id", idsReceitas);

    if (itensError) {
      console.error(itensError);
      setAvisoCusto(
        "Não foi possível carregar os ingredientes para calcular o custo."
      );
      return;
    }

    const itensReceita: ReceitaItemCusto[] =
      (itensData ?? []).map((item) => ({
        recipe_id: Number(item.recipe_id),
        inventory_item_id: Number(item.inventory_item_id),
        quantity: Number(item.quantity ?? 0),
        unit: String(item.unit),
      }));

    if (itensReceita.length === 0) {
      return;
    }

    const idsEstoque = Array.from(
      new Set(
        itensReceita.map((item) => item.inventory_item_id)
      )
    );

    const {
      data: estoqueData,
      error: estoqueError,
    } = await supabase
      .from("inventory_items")
      .select("id, name, unit")
      .in("id", idsEstoque);

    if (estoqueError) {
      console.error(estoqueError);
      setAvisoCusto(
        "Não foi possível carregar as matérias-primas para calcular o custo."
      );
      return;
    }

    const estoqueCusto: EstoqueCusto[] =
      (estoqueData ?? []).map((item) => ({
        id: Number(item.id),
        name: String(item.name),
        unit: String(item.unit),
      }));

    const unidadesBase = new Map<number, string>(
      estoqueCusto.map((item) => [item.id, item.unit])
    );

    const nomesEstoque = new Map<number, string>(
      estoqueCusto.map((item) => [item.id, item.name])
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
      setAvisoCusto(
        "Não foi possível consultar o histórico de compras para calcular o custo."
      );
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

    const semCusto = new Set<string>();
    let custoPorUnidadeFinal = 0;
    let calculoCompleto = true;

    receitas.forEach((receita) => {
      if (receita.yield_quantity <= 0) {
        calculoCompleto = false;
        return;
      }

      const itensDaReceita = itensReceita.filter(
        (item) => item.recipe_id === receita.id
      );

      if (itensDaReceita.length === 0) {
        calculoCompleto = false;
        return;
      }

      let custoReceita = 0;
      let receitaCompleta = true;

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
          receitaCompleta = false;
          calculoCompleto = false;
          semCusto.add(
            nomesEstoque.get(item.inventory_item_id) ??
              "Ingrediente sem histórico"
          );
          return;
        }

        custoReceita +=
          quantidadeNormalizada * custoMedio;
      });

      if (receitaCompleta) {
        custoPorUnidadeFinal +=
          custoReceita / receita.yield_quantity;
      }
    });

    setItensSemCusto(Array.from(semCusto));

    if (calculoCompleto) {
      setCustoUnitario(custoPorUnidadeFinal);
    }
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


    setPrecoVendaInput(
      Number(doceData.sale_price ?? 0)
        .toFixed(2)
        .replace(".", ",")
    );


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


    await carregarCustosDoDoce();


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


  const lotesAtivos =
    useMemo(
      () => lotes.filter((lote) => Number(lote.quantity) > 0),
      [lotes]
    );

  const lotesConcluidos =
    useMemo(
      () => lotes.filter((lote) => Number(lote.quantity) <= 0),
      [lotes]
    );

  const precoVendaNumero =
    numeroDoCampo(precoVendaInput);


  // Regra usada no negócio:
  // 1 parte matéria-prima + 1 parte despesas de produção + 1 parte mão de obra.
  const materiaPrimaUnitario =
    custoUnitario;


  const despesasProducaoUnitario =
    custoUnitario;


  const maoDeObraUnitario =
    custoUnitario;


  const custoConsideradoUnitario =
    custoUnitario != null
      ? custoUnitario * 3
      : null;


  const resultadoEstimadoUnitario =
    custoConsideradoUnitario != null &&
    Number.isFinite(precoVendaNumero)
      ? precoVendaNumero - custoConsideradoUnitario
      : null;


  const margemEstimada =
    resultadoEstimadoUnitario != null &&
    precoVendaNumero > 0
      ? (resultadoEstimadoUnitario / precoVendaNumero) * 100
      : null;


  async function salvarPrecoVenda() {
    setErro("");

    const preco =
      numeroDoCampo(precoVendaInput);

    if (
      Number.isNaN(preco) ||
      preco < 0
    ) {
      setErro(
        "Informe um preço de venda válido."
      );
      return;
    }

    setSalvandoPreco(true);

    const { error } = await supabase
      .from("sweets")
      .update({
        sale_price: preco,
      })
      .eq("id", doceId)
      .eq("category_id", categoriaId);

    if (error) {
      console.error(error);
      setErro(
        "Não foi possível salvar o preço de venda."
      );
      setSalvandoPreco(false);
      return;
    }

    setDoce((atual) =>
      atual
        ? {
            ...atual,
            sale_price: preco,
          }
        : atual
    );

    setPrecoVendaInput(
      preco
        .toFixed(2)
        .replace(".", ",")
    );

    setSalvandoPreco(false);
  }


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

      <style>{`
        .sweet-detail-v2-summary {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin: -6px 0 16px;
        }

        .sweet-detail-v2-summary > span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-height: 34px;
          padding: 7px 11px;
          border: 1px solid #eadfd8;
          border-radius: 999px;
          background: rgba(255,255,255,.82);
          color: #806b62;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(104,44,17,.05);
        }

        .sweet-detail-v2-summary strong {
          color: var(--brown);
          font-size: 13px;
          font-weight: 900;
        }

        .sweet-detail-v2-expiring,
        .sweet-detail-v2-expiring strong {
          color: #b85b36 !important;
          border-color: #f0d4c6 !important;
          background: #fff5ef !important;
        }

        .sweet-detail-v2-pricing {
          border: 1px solid #eadfd8;
          background: rgba(255,255,255,.78);
          box-shadow: 0 5px 16px rgba(104,44,17,.06);
        }

        .sweet-detail-v2-recipe { margin-bottom: 16px; }

        .sweet-detail-v2-recipe-button {
          width: 100%;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 11px 16px;
          border: 1px solid #edcbd5;
          border-radius: 16px;
          background: linear-gradient(145deg,#ffe7ed,#fbd8e2);
          color: var(--brown);
          font-size: 15px;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 5px 14px rgba(104,44,17,.07);
        }

        .sweet-detail-v2-recipe-button:active { transform: scale(.99); }

        .sweet-detail-v2-pricing {
          margin-bottom: 18px;
          padding: 18px;
          border-radius: 20px;
        }

        .sweet-detail-v2-heading h2 {
          margin: 2px 0 0;
          color: var(--brown);
          font-size: 24px;
        }

        .sweet-detail-v2-heading p {
          margin: 7px 0 0;
          color: #806b62;
          font-size: 13px;
          line-height: 1.45;
        }

        .sweet-detail-v2-warning {
          margin-top: 16px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          border-radius: 13px;
          background: #fff3df;
          color: #75533f;
          font-size: 12px;
          line-height: 1.4;
        }

        .sweet-detail-v2-cost-box {
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid #eadfd8;
          border-radius: 16px;
          background: #fff;
        }

        .sweet-detail-v2-cost-row,
        .sweet-detail-v2-total-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 14px;
          border-bottom: 1px solid #f0e6e1;
        }

        .sweet-detail-v2-cost-row span,
        .sweet-detail-v2-total-row span {
          color: #6f584f;
          font-size: 13px;
          font-weight: 800;
        }

        .sweet-detail-v2-cost-row strong {
          flex-shrink: 0;
          color: var(--brown);
          font-size: 15px;
        }

        .sweet-detail-v2-material > div,
        .sweet-detail-v2-total-row > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sweet-detail-v2-material small,
        .sweet-detail-v2-total-row small {
          color: #9a8379;
          font-size: 11px;
        }

        .sweet-detail-v2-total-row {
          border-bottom: 0;
          background: #fff4f7;
        }

        .sweet-detail-v2-total-row span {
          color: var(--brown);
          font-size: 14px;
        }

        .sweet-detail-v2-total-row > strong {
          flex-shrink: 0;
          color: var(--pink-dark);
          font-size: 21px;
        }

        .sweet-detail-v2-rule {
          margin: 0;
          padding: 11px 14px;
          border-top: 1px dashed #ead4d9;
          background: #fffaf8;
          color: #806b62;
          font-size: 11px;
          line-height: 1.45;
        }

        .sweet-detail-v2-sale-area {
          margin-top: 20px;
        }

        .sweet-detail-v2-sale-area > label {
          display: block;
          margin-bottom: 7px;
          color: var(--brown);
          font-size: 14px;
          font-weight: 900;
        }

        .sweet-detail-v2-sale-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 9px;
        }

        .sweet-detail-v2-money-input {
          min-height: 48px;
          display: flex;
          align-items: center;
          overflow: hidden;
          border: 1px solid #e6d8d1;
          border-radius: 14px;
          background: #fff;
        }

        .sweet-detail-v2-money-input span {
          padding-left: 14px;
          color: #8c746a;
          font-size: 14px;
          font-weight: 900;
        }

        .sweet-detail-v2-money-input input {
          width: 100%;
          min-width: 0;
          height: 46px;
          padding: 0 14px 0 8px;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--brown);
          font-size: 18px;
          font-weight: 900;
        }

        .sweet-detail-v2-save {
          min-height: 46px;
          border: 0;
          border-radius: 14px;
          background: var(--pink);
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          font-weight: 900;
        }

        .sweet-detail-v2-save:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .sweet-detail-v2-results {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
          margin-top: 14px;
        }

        .sweet-detail-v2-results > div {
          min-width: 0;
          padding: 12px;
          border-radius: 14px;
          background: #fff8f5;
        }

        .sweet-detail-v2-results span {
          display: block;
          margin-bottom: 4px;
          color: #806b62;
          font-size: 11px;
          font-weight: 800;
        }

        .sweet-detail-v2-results strong {
          display: block;
          color: var(--brown);
          font-size: 18px;
          line-height: 1.15;
          overflow-wrap: anywhere;
        }

        .sweet-detail-v2-results .sweet-detail-v2-negative {
          color: #b63a31;
        }

        .sweet-detail-v2-estimate-note {
          margin: 12px 0 0;
          color: #917a70;
          font-size: 10px;
          line-height: 1.45;
        }

        .sweet-detail-v2-finished { margin-top:18px; padding-top:16px; border-top:1px solid #eadfd8; }
        .sweet-detail-v2-finished-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
        .sweet-detail-v2-finished-header strong { color:var(--brown); font-size:14px; }
        .sweet-detail-v2-finished-header span { min-width:28px; height:28px; display:grid; place-items:center; border-radius:999px; background:#f2ebe7; color:#806b62; font-size:11px; font-weight:900; }
        .sweet-detail-v2-finished-list { display:flex; flex-direction:column; gap:8px; }
        .sweet-detail-v2-finished-item { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 12px; border:1px solid #eee3de; border-radius:13px; background:#faf7f5; }
        .sweet-detail-v2-finished-item > div { min-width:0; display:flex; flex-direction:column; gap:2px; }
        .sweet-detail-v2-finished-item strong { color:#6e5a51; font-size:13px; }
        .sweet-detail-v2-finished-item small { color:#9a8379; font-size:11px; }
        .sweet-detail-v2-finished-badge { flex-shrink:0; padding:6px 9px; border-radius:999px; background:#eee8e4; color:#7d6b63; font-size:10px; font-weight:900; }

        @media (min-width: 700px) {
          .sweet-detail-v2-recipe-button {
            max-width: 320px;
          }

          .sweet-detail-v2-sale-row {
            grid-template-columns: minmax(0, 1fr) 170px;
            align-items: stretch;
          }
        }
      `}</style>

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
              Receita, custos, preço e produção deste doce.
            </p>

          </div>

        </header>


        {/* RESUMO EM BALÕES */}

        <div className="sweet-detail-v2-summary">
          <span>
            <strong>{estoqueTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong>{" "}
            em estoque
          </span>

          <span>
            mínimo{" "}
            <strong>{doce.minimum_quantity.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong>
          </span>

          {pertoDeVencer > 0 && (
            <span className="sweet-detail-v2-expiring">
              <strong>{pertoDeVencer.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong>{" "}
              perto de vencer
            </span>
          )}
        </div>

        {/* RECEITA */}
        <section className="sweet-detail-v2-recipe">
          <Link
            href={`/doces/categoria/${categoriaId}/doce/${doceId}/receita`}
            className="sweet-detail-v2-recipe-button"
          >
            {quantidadeReceitas === 0 ? "🧁 Criar receita" : "🧁 Abrir receita"}
          </Link>
        </section>


        {/* PRECIFICAÇÃO */}

        <section className="sweet-detail-v2-pricing">
          <div className="sweet-detail-v2-heading">
            <span className="section-kicker">
              PRECIFICAÇÃO
            </span>

            <h2>
              Custo e preço
            </h2>

          </div>


          {quantidadeReceitas === 0 ? (
            <div className="sweet-detail-v2-warning">
              Crie a receita acima para calcular os custos deste doce.
            </div>
          ) : itensSemCusto.length > 0 ? (
            <div className="sweet-detail-v2-warning">
              <strong>Falta histórico de compra</strong>
              <span>
                {itensSemCusto.join(", ")}
              </span>
            </div>
          ) : avisoCusto ? (
            <div className="sweet-detail-v2-warning">
              {avisoCusto}
            </div>
          ) : null}


          <div className="sweet-detail-v2-cost-box">
            <div className="sweet-detail-v2-cost-row sweet-detail-v2-material">
              <div>
                <span>Matéria-prima</span>
                <small>Só os ingredientes</small>
              </div>

              <strong>
                {materiaPrimaUnitario != null
                  ? formatarPreco(materiaPrimaUnitario)
                  : "—"}
              </strong>
            </div>

            <div className="sweet-detail-v2-cost-row">
              <span>Luz + água + gás</span>
              <strong>
                {despesasProducaoUnitario != null
                  ? formatarPreco(despesasProducaoUnitario)
                  : "—"}
              </strong>
            </div>

            <div className="sweet-detail-v2-cost-row">
              <span>Mão de obra</span>
              <strong>
                {maoDeObraUnitario != null
                  ? formatarPreco(maoDeObraUnitario)
                  : "—"}
              </strong>
            </div>

            <div className="sweet-detail-v2-total-row">
              <div>
                <span>Custo considerado</span>
                <small>Usado para comparar com o preço de venda</small>
              </div>

              <strong>
                {custoConsideradoUnitario != null
                  ? formatarPreco(custoConsideradoUnitario)
                  : "—"}
              </strong>
            </div>

            <p className="sweet-detail-v2-rule">
              Regra usada no negócio: 1 parte de matéria-prima + 1 parte de despesas de produção + 1 parte de mão de obra.
            </p>
          </div>


          <div className="sweet-detail-v2-sale-area">
            <label htmlFor="sweet-detail-sale-price">
              Preço de venda por unidade
            </label>

            <div className="sweet-detail-v2-sale-row">
              <div className="sweet-detail-v2-money-input">
                <span>R$</span>

                <input
                  id="sweet-detail-sale-price"
                  type="text"
                  inputMode="decimal"
                  value={precoVendaInput}
                  onChange={(event) =>
                    setPrecoVendaInput(event.target.value)
                  }
                  placeholder="Ex.: 5,00"
                />
              </div>

              <button
                type="button"
                className="sweet-detail-v2-save"
                onClick={salvarPrecoVenda}
                disabled={salvandoPreco}
              >
                {salvandoPreco
                  ? "Salvando..."
                  : "Salvar preço"}
              </button>
            </div>
          </div>


          <div className="sweet-detail-v2-results">
            <div>
              <span>Resultado estimado</span>
              <strong
                className={
                  resultadoEstimadoUnitario != null &&
                  resultadoEstimadoUnitario < 0
                    ? "sweet-detail-v2-negative"
                    : ""
                }
              >
                {resultadoEstimadoUnitario != null
                  ? formatarPreco(resultadoEstimadoUnitario)
                  : "—"}
              </strong>
            </div>

            <div>
              <span>Margem estimada</span>
              <strong
                className={
                  margemEstimada != null && margemEstimada < 0
                    ? "sweet-detail-v2-negative"
                    : ""
                }
              >
                {margemEstimada != null
                  ? `${margemEstimada.toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })}%`
                  : "—"}
              </strong>
            </div>
          </div>

          <p className="sweet-detail-v2-estimate-note">
            Estimativa para precificação. Luz, água, gás e mão de obra não são medições individuais: seguem a regra usada no negócio.
          </p>
        </section>


        {/* LOTES */}

        <section className="sweet-batches-section">
          <div className="sweet-batches-header">
            <div>
              <span className="section-kicker">ESTOQUE</span>
              <h2>Lotes</h2>
            </div>

            <button
              type="button"
              className="sweet-new-batch-button"
              onClick={() => {
                limparNovoLote();
                setMostrarNovoLote(true);
              }}
            >
              + Novo lote
            </button>
          </div>

          {erro && !mostrarNovoLote && !loteEditando && !loteExcluindo && (
            <div className="form-error">{erro}</div>
          )}

          {lotesAtivos.length === 0 ? (
            <div className="sweet-empty-batches">
              <strong>Nenhum lote ativo</strong>
              <span>Cadastre um novo lote para adicionar unidades ao estoque.</span>
            </div>
          ) : (
            <div className="sweet-batch-list">
              {lotesAtivos.map((lote, indice) => {
                const situacao = situacaoLote(lote);

                return (
                  <article key={lote.id} className={`sweet-batch-card sweet-batch-${situacao.tipo}`}>
                    <div className="sweet-batch-top">
                      <div>
                        <span>
                          {lote.batch_code
                            ? lote.batch_code
                            : `Lote ${String(lotesAtivos.length - indice).padStart(3, "0")}`}
                        </span>
                        <strong>
                          {lote.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}{" "}
                          unidades
                        </strong>
                      </div>

                      <div className="sweet-batch-top-actions">
                        <span className={`sweet-batch-status sweet-batch-status-${situacao.tipo}`}>
                          {situacao.texto}
                        </span>
                        <button type="button" className="sweet-batch-edit-button" onClick={() => abrirEdicaoLote(lote)}>
                          Editar
                        </button>
                      </div>
                    </div>

                    <div className="sweet-batch-dates">
                      <div><span>Produção</span><strong>{formatarData(lote.produced_at)}</strong></div>
                      <div><span>Vencimento</span><strong>{formatarData(lote.expires_at)}</strong></div>
                    </div>

                    <div className="sweet-batch-footer">
                      <div className="sweet-batch-alert">
                        🔔 Avisar <strong>{lote.alert_days_before}</strong>{" "}
                        {lote.alert_days_before === 1 ? "dia" : "dias"} antes
                      </div>

                      <button
                        type="button"
                        className="sweet-batch-delete-button"
                        onClick={() => {
                          setErro("");
                          setLoteExcluindo(lote);
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

          {lotesConcluidos.length > 0 && (
            <div className="sweet-detail-v2-finished">
              <div className="sweet-detail-v2-finished-header">
                <strong>Lotes concluídos</strong>
                <span>{lotesConcluidos.length}</span>
              </div>

              <div className="sweet-detail-v2-finished-list">
                {lotesConcluidos.map((lote) => (
                  <div key={lote.id} className="sweet-detail-v2-finished-item">
                    <div>
                      <strong>{lote.batch_code || `Lote #${lote.id}`}</strong>
                      <small>
                        Produção {formatarData(lote.produced_at)} • Vencimento {formatarData(lote.expires_at)}
                      </small>
                    </div>
                    <span className="sweet-detail-v2-finished-badge">Concluído</span>
                  </div>
                ))}
              </div>
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
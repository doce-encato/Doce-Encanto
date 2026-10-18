"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";


type EstoqueItem = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  minimum_quantity: number;
};


type ItemCompra = {
  id: number;

  inventory_item_id: number;

  produto: string;

  quantidade: number;

  unidade: string;

  quantidadeEstoque: number;

  precoUnitario: number;

  descontoReais: number;

  percentualDesconto: number;

  subtotalNormal: number;

  valorDesconto: number;

  valorFinal: number;

  purchaseMode: "normal" | "package";

  packageQuantity: number | null;

  unitsPerPackage: number | null;
};


type ItemCompraBanco = {
  id: number;
  inventory_item_id: number | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  purchase_mode: "normal" | "package";
  package_quantity: number | null;
  units_per_package: number | null;
  discount_amount: number;
  discount_percent: number;
};

type CompraEdicaoBanco = {
  id: number;
  store_name: string;
  purchase_date: string;
  type: "quick" | "detailed";
  total: number;
  purchase_items: ItemCompraBanco[];
};


const unidades = [
  "unidade",
  "g",
  "kg",
  "ml",
  "L",
];

const tiposMedida = [
  {
    value: "unidade",
    label: "Unidade",
  },
  {
    value: "g",
    label: "Peso",
  },
  {
    value: "ml",
    label: "Líquido",
  },
];


function dataDeHoje() {
  const hoje = new Date();

  const ano = hoje.getFullYear();

  const mes = String(
    hoje.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    hoje.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}


export default function CompraDetalhadaPage() {
  const router = useRouter();

  const [compraEditandoId, setCompraEditandoId] =
    useState<number | null>(null);

  const [carregandoCompra, setCarregandoCompra] =
    useState(false);


  /*
   * DADOS DA COMPRA
   */
  const [local, setLocal] =
    useState("");

  const [data, setData] =
    useState(dataDeHoje());

const [
  novaUnidadeMinimo,
  setNovaUnidadeMinimo
] = useState("unidade");
  /*
   * ESTOQUE
   */
  const [estoque, setEstoque] =
    useState<EstoqueItem[]>([]);

  const [
    carregandoEstoque,
    setCarregandoEstoque,
  ] = useState(true);


  /*
   * BUSCA DO PRODUTO
   */
  const [
    buscaProduto,
    setBuscaProduto,
  ] = useState("");

  const [
    produtoSelecionadoId,
    setProdutoSelecionadoId,
  ] = useState<number | null>(null);

const [
  unidadeCompra,
  setUnidadeCompra
] = useState("unidade");


  const [
    mostrarResultados,
    setMostrarResultados,
  ] = useState(false);


  /*
   * NOVO PRODUTO
   */
  const [
    mostrarNovoProduto,
    setMostrarNovoProduto,
  ] = useState(false);

  const [novoNome, setNovoNome] =
    useState("");

  const [
    novaUnidade,
    setNovaUnidade,
  ] = useState("unidade");

  const [
    novoMinimo,
    setNovoMinimo,
  ] = useState("");

  const [
    cadastrandoProduto,
    setCadastrandoProduto,
  ] = useState(false);


  /*
   * PRODUTO DA COMPRA
   */
  const [
    quantidade,
    setQuantidade,
  ] = useState("");

  const [
    precoUnitario,
    setPrecoUnitario,
  ] = useState("");

const [
  descontoReais,
  setDescontoReais,
] = useState("");

  const [
    percentualDesconto,
    setPercentualDesconto,
  ] = useState("");

  const [modoPacote, setModoPacote] =
    useState(false);

  const [quantidadePacotes, setQuantidadePacotes] =
    useState("");

  const [unidadesPorPacote, setUnidadesPorPacote] =
    useState("");


  /*
   * CARRINHO
   */
  const [itens, setItens] =
    useState<ItemCompra[]>([]);


  /*
   * ESTADOS GERAIS
   */
  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");


  /*
   * CARREGAR ESTOQUE
   */
  async function carregarEstoque() {
    setCarregandoEstoque(true);

    const {
      data,
      error,
    } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível carregar o estoque."
      );

      setCarregandoEstoque(false);

      return [] as EstoqueItem[];
    }

    const estoqueCarregado =
      (data as EstoqueItem[]) ?? [];

    setEstoque(estoqueCarregado);
    setCarregandoEstoque(false);

    return estoqueCarregado;
  }


  /*
   * PRODUTO SELECIONADO
   */
  const itemSelecionado =
    estoque.find(
      (item) =>
        item.id === produtoSelecionadoId
    );


  /*
   * RESULTADOS DA BUSCA
   */
  const produtosFiltrados =
    useMemo(() => {
      const termo =
        buscaProduto
          .trim()
          .toLowerCase();

      if (!termo) {
        return estoque.slice(0, 6);
      }

      return estoque
        .filter((item) =>
          item.name
            .toLowerCase()
            .includes(termo)
        )
        .slice(0, 8);
    }, [estoque, buscaProduto]);


  /*
   * NÚMEROS DO PRODUTO ATUAL
   */
  const quantidadeNumero =
    Number(quantidade) || 0;

  const quantidadePacotesNumero =
    Number(quantidadePacotes) || 0;

  const unidadesPorPacoteNumero =
    Number(unidadesPorPacote) || 0;

  const quantidadeTotalPacote =
    quantidadePacotesNumero *
    unidadesPorPacoteNumero;

  const quantidadeEfetivaNumero =
    modoPacote
      ? quantidadeTotalPacote
      : quantidadeNumero;

  const precoUnitarioNumero =
    Number(
      precoUnitario.replace(",", ".")
    ) || 0;

  const descontoReaisNumero =
    Number(
      descontoReais.replace(",", ".")
    ) || 0;

  const percentualDescontoNumero =
    Number(
      percentualDesconto.replace(",", ".")
    ) || 0;

  const subtotalProduto =
    modoPacote
      ? precoUnitarioNumero
      : itemSelecionado?.unit === "unidade"
        ? quantidadeNumero * precoUnitarioNumero
        : precoUnitarioNumero;

  const descontoPercentualValor =
    subtotalProduto *
    (percentualDescontoNumero / 100);

  const descontoProduto =
    descontoReaisNumero +
    descontoPercentualValor;

  const valorFinalProduto =
    Math.max(
      0,
      subtotalProduto - descontoProduto
    );

  const custoUnitarioAntesDesconto =
    itemSelecionado?.unit === "unidade" &&
    quantidadeEfetivaNumero > 0
      ? subtotalProduto / quantidadeEfetivaNumero
      : precoUnitarioNumero;

  const custoUnitarioFinal =
    itemSelecionado?.unit === "unidade" &&
    quantidadeEfetivaNumero > 0
      ? valorFinalProduto / quantidadeEfetivaNumero
      : valorFinalProduto;


  /*
   * CADASTRAR PRODUTO NOVO
   */
  async function cadastrarNovoProduto() {
    setErro("");

    if (!novoNome.trim()) {
      setErro(
        "Informe o nome do novo produto."
      );

      return;
    }

    if (
      novoMinimo === "" ||
      Number(novoMinimo) < 0
    ) {
      setErro(
        "Informe um estoque mínimo válido."
      );

      return;
    }

    setCadastrandoProduto(true);

    const {
      data: novoItem,
      error,
    } = await supabase
      .from("inventory_items")
      .insert({
        name: novoNome.trim(),
        quantity: 0,
        unit: novaUnidade,
        minimum_quantity:
          Number(novoMinimo),
      })
      .select("*")
      .single();

    if (error || !novoItem) {
      console.error(error);

      setErro(
        "Não foi possível cadastrar o produto."
      );

      setCadastrandoProduto(false);

      return;
    }

    const itemCriado =
      novoItem as EstoqueItem;

    setEstoque((atual) =>
      [...atual, itemCriado].sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "pt-BR"
          )
      )
    );

    setProdutoSelecionadoId(itemCriado.id);
    setBuscaProduto(itemCriado.name);

    if (itemCriado.unit === "g") {
  setUnidadeCompra("g");
} else if (itemCriado.unit === "ml") {
  setUnidadeCompra("ml");
} else {
  setUnidadeCompra("unidade");
}

setNovaUnidadeMinimo(itemCriado.unit);

    setMostrarNovoProduto(false);

    setNovoNome("");
    setNovaUnidade("unidade");
    setNovoMinimo("");

    setCadastrandoProduto(false);
  }


  /*
   * ADICIONAR PRODUTO AO CARRINHO
   */
function converterQuantidadeParaEstoque(
  quantidade: number,
  unidadeCompra: string,
  unidadeEstoque: string
) {
  if (unidadeCompra === unidadeEstoque) {
    return quantidade;
  }

  if (
    unidadeCompra === "kg" &&
    unidadeEstoque === "g"
  ) {
    return quantidade * 1000;
  }

  if (
    unidadeCompra === "L" &&
    unidadeEstoque === "ml"
  ) {
    return quantidade * 1000;
  }

  return quantidade;
}

function formatarEstoqueAtual(
  quantidade: number,
  unidade: string
) {
  if (unidade === "g" && quantidade >= 1000) {
    return `${(quantidade / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 3,
    })} kg`;
  }

  if (unidade === "ml" && quantidade >= 1000) {
    return `${(quantidade / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 3,
    })} L`;
  }

  return `${quantidade.toLocaleString("pt-BR")} ${unidade}`;
}


  async function carregarCompraParaEdicao(
    compraId: number,
    estoqueCarregado: EstoqueItem[]
  ) {
    setCarregandoCompra(true);
    setErro("");

    const {
      data: compraData,
      error: erroCompra,
    } = await supabase
      .from("purchases")
      .select(`
        id,
        store_name,
        purchase_date,
        type,
        total,
        purchase_items (
          id,
          inventory_item_id,
          product_name,
          quantity,
          unit,
          unit_price,
          total_price,
          purchase_mode,
          package_quantity,
          units_per_package,
          discount_amount,
          discount_percent
        )
      `)
      .eq("id", compraId)
      .single();

    if (erroCompra || !compraData) {
      console.error(erroCompra);

      setErro(
        "Não foi possível carregar a compra para edição."
      );

      setCarregandoCompra(false);
      return;
    }

    const compra =
      compraData as unknown as CompraEdicaoBanco;

    if (compra.type !== "detailed") {
      setErro(
        "Somente compras detalhadas podem ser editadas nesta tela."
      );

      setCarregandoCompra(false);
      return;
    }

    const itemSemEstoque =
      (compra.purchase_items ?? []).find(
        (item) => item.inventory_item_id === null
      );

    if (itemSemEstoque) {
      setErro(
        "Esta compra possui um item que não existe mais no estoque. Recrie esse item antes de editar a compra."
      );

      setCarregandoCompra(false);
      return;
    }

    const itensCarregados: ItemCompra[] =
      (compra.purchase_items ?? []).map(
        (item) => {
          const inventoryId =
            Number(item.inventory_item_id);

          const estoqueItem =
            estoqueCarregado.find(
              (produto) =>
                produto.id === inventoryId
            );

          const quantidadeItem =
            Number(item.quantity ?? 0);

          const unidadeItem =
            String(item.unit);

          const purchaseMode:
            | "normal"
            | "package" =
            item.purchase_mode === "package"
              ? "package"
              : "normal";

          const precoUnitarioItem =
            Number(item.unit_price ?? 0);

          const subtotalNormal =
            estoqueItem?.unit === "unidade"
              ? quantidadeItem *
                precoUnitarioItem
              : precoUnitarioItem;

          const valorFinal =
            Number(item.total_price ?? 0);

          const valorDesconto =
            Math.max(
              0,
              subtotalNormal - valorFinal
            );

          const quantidadeEstoque =
            purchaseMode === "package"
              ? quantidadeItem
              : converterQuantidadeParaEstoque(
                  quantidadeItem,
                  unidadeItem,
                  estoqueItem?.unit ??
                    unidadeItem
                );

          return {
            id: Number(item.id),

            inventory_item_id:
              inventoryId,

            produto:
              String(item.product_name),

            quantidade:
              quantidadeItem,

            unidade:
              unidadeItem,

            quantidadeEstoque,

            precoUnitario:
              precoUnitarioItem,

            descontoReais:
              Number(
                item.discount_amount ?? 0
              ),

            percentualDesconto:
              Number(
                item.discount_percent ?? 0
              ),

            subtotalNormal,

            valorDesconto,

            valorFinal,

            purchaseMode,

            packageQuantity:
              item.package_quantity === null
                ? null
                : Number(
                    item.package_quantity
                  ),

            unitsPerPackage:
              item.units_per_package === null
                ? null
                : Number(
                    item.units_per_package
                  ),
          };
        }
      );

    setCompraEditandoId(compra.id);
    setLocal(compra.store_name);
    setData(compra.purchase_date);
    setItens(itensCarregados);

    setCarregandoCompra(false);
  }


  useEffect(() => {
    async function inicializarPagina() {
      const estoqueCarregado =
        await carregarEstoque();

      const parametros =
        new URLSearchParams(
          window.location.search
        );

      const editar =
        parametros.get("edit");

      if (!editar) {
        return;
      }

      const compraId =
        Number(editar);

      if (
        !Number.isInteger(compraId) ||
        compraId <= 0
      ) {
        setErro(
          "O código da compra para edição é inválido."
        );

        return;
      }

      await carregarCompraParaEdicao(
        compraId,
        estoqueCarregado
      );
    }

    inicializarPagina();
  }, []);

  function adicionarItem() {
    setErro("");

    if (!itemSelecionado) {
      setErro(
        "Selecione um produto."
      );
      return;
    }

    if (
      modoPacote &&
      itemSelecionado.unit !== "unidade"
    ) {
      setErro(
        "O modo pacote/caixa só pode ser usado em itens controlados por unidade."
      );
      return;
    }

    if (modoPacote) {
      if (quantidadePacotesNumero <= 0) {
        setErro(
          "Informe quantos pacotes ou caixas foram comprados."
        );
        return;
      }

      if (unidadesPorPacoteNumero <= 0) {
        setErro(
          "Informe quantas unidades vêm em cada pacote ou caixa."
        );
        return;
      }
    } else if (quantidadeNumero <= 0) {
      setErro(
        "Informe uma quantidade válida."
      );
      return;
    }

    if (precoUnitarioNumero <= 0) {
      setErro(
        modoPacote
          ? "Informe o valor total pago pelos pacotes."
          : "Informe o preço do produto."
      );
      return;
    }

    if (descontoReaisNumero < 0) {
      setErro(
        "O desconto em reais não pode ser negativo."
      );
      return;
    }

    if (
      percentualDescontoNumero < 0 ||
      percentualDescontoNumero > 100
    ) {
      setErro(
        "O desconto em porcentagem deve ficar entre 0% e 100%."
      );
      return;
    }

    if (descontoProduto > subtotalProduto) {
      setErro(
        "O desconto não pode ser maior que o valor do produto."
      );
      return;
    }

    const quantidadeConvertida =
      modoPacote
        ? quantidadeTotalPacote
        : converterQuantidadeParaEstoque(
            quantidadeNumero,
            unidadeCompra,
            itemSelecionado.unit
          );

    const novoItem: ItemCompra = {
      id: Date.now(),

      inventory_item_id:
        itemSelecionado.id,

      produto:
        itemSelecionado.name,

      quantidade:
        modoPacote
          ? quantidadeTotalPacote
          : quantidadeNumero,

      quantidadeEstoque:
        quantidadeConvertida,

      unidade:
        modoPacote
          ? "unidade"
          : unidadeCompra,

      precoUnitario:
        itemSelecionado.unit === "unidade"
          ? custoUnitarioAntesDesconto
          : precoUnitarioNumero,

      descontoReais:
        descontoReaisNumero,

      percentualDesconto:
        percentualDescontoNumero,

      subtotalNormal:
        subtotalProduto,

      valorDesconto:
        descontoProduto,

      valorFinal:
        valorFinalProduto,

      purchaseMode:
        modoPacote ? "package" : "normal",

      packageQuantity:
        modoPacote
          ? quantidadePacotesNumero
          : null,

      unitsPerPackage:
        modoPacote
          ? unidadesPorPacoteNumero
          : null,
    };

    setItens(
      (itensAtuais) => [
        ...itensAtuais,
        novoItem,
      ]
    );

    /*
     * LIMPA PARA O PRÓXIMO PRODUTO
     */
    setProdutoSelecionadoId(null);
    setBuscaProduto("");
    setMostrarResultados(false);
    setQuantidade("");
    setPrecoUnitario("");
    setDescontoReais("");
    setPercentualDesconto("");
    setModoPacote(false);
    setQuantidadePacotes("");
    setUnidadesPorPacote("");
  }

  /*
   * REMOVER DO CARRINHO
   */
  function removerItem(id: number) {
    setItens(
      (itensAtuais) =>
        itensAtuais.filter(
          (item) =>
            item.id !== id
        )
    );
  }


  /*
   * TOTAL DA COMPRA
   */
  const total =
    useMemo(() => {
      return itens.reduce(
        (soma, item) =>
          soma +
          item.valorFinal,
        0
      );
    }, [itens]);


  /*
   * TOTAL DE DESCONTOS
   * apenas para mostrar no resumo
   */
  const totalDescontos =
    useMemo(() => {
      return itens.reduce(
        (soma, item) =>
          soma +
          item.valorDesconto,
        0
      );
    }, [itens]);


  function formatarDinheiro(
    valor: number
  ) {
    return valor.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
  }


  /*
   * SALVAR COMPRA
   */
  async function salvarCompra() {
    setErro("");

    if (!local.trim()) {
      setErro(
        "Informe onde a compra foi realizada."
      );

      return;
    }

    if (!data) {
      setErro(
        "Informe a data da compra."
      );

      return;
    }

    if (itens.length === 0) {
      setErro(
        "Adicione pelo menos um produto."
      );

      return;
    }

    setSalvando(true);


    /*
     * MODO EDIÇÃO
     *
     * Mantém o mesmo ID da compra e usa a função
     * do banco para substituir os itens e ajustar
     * o estoque somente pela diferença.
     */
    if (compraEditandoId) {
      const itensParaAtualizar =
        itens.map(
          (item) => ({
            inventory_item_id:
              item.inventory_item_id,

            product_name:
              item.produto,

            quantity:
              item.quantidade,

            unit:
              item.unidade,

            unit_price:
              item.precoUnitario,

            purchase_mode:
              item.purchaseMode,

            package_quantity:
              item.packageQuantity,

            units_per_package:
              item.unitsPerPackage,

            discount_amount:
              item.descontoReais,

            discount_percent:
              item.percentualDesconto,

            total_price:
              item.valorFinal,

            stock_quantity:
              item.quantidadeEstoque,
          })
        );

      const {
        error: erroEdicao,
      } = await supabase.rpc(
        "update_detailed_purchase",
        {
          p_purchase_id:
            compraEditandoId,

          p_store_name:
            local.trim(),

          p_purchase_date:
            data,

          p_total:
            total,

          p_items:
            itensParaAtualizar,
        }
      );

      if (erroEdicao) {
        console.error(
          erroEdicao
        );

        setErro(
          "Não foi possível salvar as alterações da compra."
        );

        setSalvando(false);
        return;
      }

      setSalvando(false);

      router.push(
        `/compras/${compraEditandoId}`
      );

      router.refresh();

      return;
    }


    /*
     * 1. CRIA A COMPRA
     */
    const {
      data: compraCriada,
      error: erroCompra,
    } = await supabase
      .from("purchases")
      .insert({
        store_name:
          local.trim(),

        purchase_date:
          data,

        type:
          "detailed",

        total,

        notes:
          null,
      })
      .select("id")
      .single();


    if (
      erroCompra ||
      !compraCriada
    ) {
      console.error(
        erroCompra
      );

      setErro(
        "Não foi possível salvar a compra."
      );

      setSalvando(false);

      return;
    }


    /*
     * 2. SALVA OS PRODUTOS
     */
    const itensParaSalvar =
      itens.map(
        (item) => ({
          purchase_id:
            compraCriada.id,

          inventory_item_id:
            item.inventory_item_id,

          product_name:
            item.produto,

          quantity:
            item.quantidade,

          unit:
            item.unidade,

          unit_price:
            item.precoUnitario,

          purchase_mode:
            item.purchaseMode,

          package_quantity:
            item.packageQuantity,

          units_per_package:
            item.unitsPerPackage,

          discount_amount:
            item.descontoReais,

          discount_percent:
            item.percentualDesconto,

          /*
           * total_price =
           * valor REALMENTE pago
           * depois da promoção.
           */
          total_price:
            item.valorFinal,
        })
      );


    const {
      error: erroItens,
    } = await supabase
      .from("purchase_items")
      .insert(
        itensParaSalvar
      );


    if (erroItens) {
      console.error(
        erroItens
      );

      await supabase
        .from("purchases")
        .delete()
        .eq(
          "id",
          compraCriada.id
        );

      setErro(
        "Não foi possível salvar os produtos."
      );

      setSalvando(false);

      return;
    }


    /*
     * 3. ATUALIZA ESTOQUE
     *
     * Agrupamos primeiro porque o mesmo
     * produto pode ser adicionado duas vezes
     * na mesma compra.
     */
    const quantidadesPorProduto =
      new Map<number, number>();


    itens.forEach((item) => {
      const atual =
        quantidadesPorProduto.get(
          item.inventory_item_id
        ) ?? 0;

      quantidadesPorProduto.set(
        item.inventory_item_id,
        atual + item.quantidadeEstoque
      );
    });


    for (
      const [
        inventoryId,
        quantidadeComprada,
      ] of quantidadesPorProduto
    ) {
      const estoqueAtual =
        estoque.find(
          (produto) =>
            produto.id ===
            inventoryId
        );

      if (!estoqueAtual) {
        continue;
      }

      const novaQuantidade =
        Number(
          estoqueAtual.quantity
        ) +
        quantidadeComprada;


      const {
        error: erroEstoque,
      } = await supabase
        .from("inventory_items")
        .update({
          quantity:
            novaQuantidade,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          inventoryId
        );


      if (erroEstoque) {
        console.error(
          erroEstoque
        );

        setErro(
          "A compra foi registrada, mas houve um problema ao atualizar o estoque."
        );

        setSalvando(false);

        return;
      }
    }


    setSalvando(false);

    router.push(
      "/compras"
    );

    router.refresh();
  }


  return (
    <main className="compras-page">

      <div className="page-shell">

        {/* CABEÇALHO */}
        <header className="page-header">

          <Link
            href={
              compraEditandoId
                ? `/compras/${compraEditandoId}`
                : "/compras/nova"
            }
            className="back-button"
          >
            ←
          </Link>

          <div>

            <span className="page-kicker">
              {compraEditandoId
                ? "EDITAR COMPRA"
                : "NOVA COMPRA"}
            </span>

            <h1>
              {compraEditandoId
                ? "Editar compra detalhada"
                : "Compra detalhada"}
            </h1>

            <p>
              {compraEditandoId
                ? "Altere os dados da compra e salve por cima do registro existente."
                : "Registre os produtos comprados e o estoque será atualizado automaticamente."}
            </p>

          </div>

        </header>


        <section className="detailed-purchase-layout">

          {/* FORMULÁRIO */}
          <div className="purchase-form-card">

            <div className="form-section-title">

              <span>
                1
              </span>

              <div>

                <strong>
                  Informações da compra
                </strong>

                <small>
                  Onde e quando você comprou
                </small>

              </div>

            </div>


            <div className="form-group">

              <label>
                Onde comprou?
              </label>

              <input
                type="text"
                placeholder="Ex: Atacadão"
                value={local}
                onChange={(event) =>
                  setLocal(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="form-group">

              <label>
                Data da compra
              </label>

              <input
                type="date"
                value={data}
                onChange={(event) =>
                  setData(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="form-divider" />


            {/* PRODUTO */}
            <div className="form-section-title">

              <span>
                2
              </span>

              <div>

                <strong>
                  Adicionar produto
                </strong>

                <small>
                  Informe quantidade,
                  preço e promoção
                </small>

              </div>

            </div>


{/* BUSCA */}
<div className="form-group product-search-wrapper">

  <label>
    Produto
  </label>

  <div className="product-search-with-unit">

    <input
      type="text"
      placeholder="Digite para procurar..."
      value={buscaProduto}
      onFocus={() =>
        setMostrarResultados(
          true
        )
      }
      onChange={(event) => {
        setBuscaProduto(
          event.target.value
        );

        setProdutoSelecionadoId(
          null
        );

        setMostrarResultados(
          true
        );
      }}
    />

   <select
  value={unidadeCompra}
  onChange={(event) =>
    setUnidadeCompra(
      event.target.value
    )
  }
>
  {itemSelecionado?.unit === "g" && (
    <>
      <option value="g">
        g
      </option>

      <option value="kg">
        kg
      </option>
    </>
  )}

  {itemSelecionado?.unit === "ml" && (
    <>
      <option value="ml">
        ml
      </option>

      <option value="L">
        L
      </option>
    </>
  )}

  {itemSelecionado?.unit === "unidade" && (
    <option value="unidade">
      un
    </option>
  )}

  {!itemSelecionado && (
    <option value="unidade">
      -
    </option>
  )}
</select>

  </div>


              {mostrarResultados && (
                <div className="product-search-results">

                  {produtosFiltrados.map(
                    (item) => (

                      <button
                        type="button"
                        key={item.id}
                        className="product-search-option"
onClick={() => {
  setProdutoSelecionadoId(
    item.id
  );

  setBuscaProduto(
    item.name
  );

  if (item.unit === "g") {
    setUnidadeCompra("g");
  } else if (item.unit === "ml") {
    setUnidadeCompra("ml");
  } else {
    setUnidadeCompra("unidade");
  }

  setModoPacote(false);
  setQuantidadePacotes("");
  setUnidadesPorPacote("");

  setMostrarResultados(
    false
  );
}}
                      >

                        <strong>
                          {item.name}
                        </strong>

                       <span className="product-search-quantity">
  {formatarEstoqueAtual(
    item.quantity,
    item.unit
  )}
</span>

                      </button>

                    )
                  )}


{buscaProduto.trim() &&
  !estoque.some(
    (item) =>
      item.name
        .trim()
        .toLowerCase() ===
      buscaProduto
        .trim()
        .toLowerCase()
  ) && (

                      <div className="product-not-found">

                        <span>
                          Produto não encontrado
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setNovoNome(
                              buscaProduto.trim()
                            );

                            setMostrarNovoProduto(
                              true
                            );

                            setMostrarResultados(
                              false
                            );
                          }}
                        >
                          + Cadastrar novo item
                        </button>

                      </div>

                    )}

                </div>
              )}

            </div>


            {/* INFORMAÇÕES DO ESTOQUE */}
            {itemSelecionado && (

              <div className="selected-stock-info">

                <span>
  Medida da compra:
  <strong>
    {" "}
    {unidadeCompra}
  </strong>
</span>

<span>
  Estoque atual:
  <strong>
    {" "}
    {formatarEstoqueAtual(
      itemSelecionado.quantity,
      itemSelecionado.unit
    )}
  </strong>
</span>

              </div>

            )}

            


            {/* MODO PACOTE / CAIXA */}
            {itemSelecionado?.unit === "unidade" && (
              <div className="item-promotion-box">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={modoPacote}
                    onChange={(event) => {
                      const marcado =
                        event.target.checked;

                      setModoPacote(marcado);
                      setQuantidade("");
                      setQuantidadePacotes("");
                      setUnidadesPorPacote("");
                      setPrecoUnitario("");
                    }}
                  />
                  Comprei em pacote / caixa
                </label>

                <small className="inventory-help">
                  Use quando uma embalagem contém várias unidades.
                  Ex.: 1 pacote com 25 potes por R$ 25,00.
                </small>
              </div>
            )}


            {modoPacote &&
            itemSelecionado?.unit === "unidade" ? (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Quantidade de pacotes / caixas
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ex: 1"
                      value={quantidadePacotes}
                      onChange={(event) =>
                        setQuantidadePacotes(
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Unidades por pacote / caixa
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ex: 25"
                      value={unidadesPorPacote}
                      onChange={(event) =>
                        setUnidadesPorPacote(
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>

                {quantidadeTotalPacote > 0 && (
                  <div className="selected-stock-info">
                    <span>
                      Entram no estoque:
                      <strong>
                        {" "}
                        {quantidadeTotalPacote.toLocaleString(
                          "pt-BR"
                        )}{" "}
                        unidades
                      </strong>
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="form-group">
                <label>
                  Quantidade comprada
                </label>

                <div className="quantity-input-with-unit">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Ex: 5"
                    value={quantidade}
                    onChange={(event) =>
                      setQuantidade(
                        event.target.value
                      )
                    }
                  />

                  {itemSelecionado && (
                    <span>
                      {unidadeCompra}
                    </span>
                  )}
                </div>
              </div>
            )}


            {/* PREÇO */}
            <div className="form-group">
              <label>
                {modoPacote &&
                itemSelecionado?.unit === "unidade"
                  ? "Valor total dos pacotes / caixas"
                  : itemSelecionado?.unit === "unidade"
                    ? "Preço por unidade"
                    : "Valor total do produto"}
              </label>

              <div className="money-input">
                <span>
                  R$
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 25,00"
                  value={precoUnitario}
                  onChange={(event) =>
                    setPrecoUnitario(
                      event.target.value
                    )
                  }
                />
              </div>

              <small className="inventory-help">
                {modoPacote &&
                itemSelecionado?.unit === "unidade"
                  ? "Informe quanto foi pago no total pelos pacotes antes do desconto. O custo por unidade será calculado automaticamente."
                  : itemSelecionado?.unit === "unidade"
                    ? "Informe o preço de cada unidade antes do desconto."
                    : "Informe o valor total pago por essa quantidade antes do desconto."}
              </small>
            </div>

{/* PROMOÇÃO */}
<div className="item-promotion-box">

  <div className="item-promotion-heading">
    <strong>
      Tem desconto?
    </strong>

    <span>
      Opcional
    </span>
  </div>


  <div className="form-row">

    {/* DESCONTO EM REAIS */}
    <div className="form-group">
      <label>
        Desconto em R$
      </label>

      <div className="money-input">
        <span>
          R$
        </span>

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Ex: 7,00"
          value={descontoReais}
          onChange={(event) =>
            setDescontoReais(
              event.target.value
            )
          }
        />
      </div>
    </div>


    {/* DESCONTO EM PORCENTAGEM */}
    <div className="form-group">
      <label>
        Desconto em %
      </label>

      <div className="percent-input">
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          placeholder="Ex: 10"
          value={percentualDesconto}
          onChange={(event) =>
            setPercentualDesconto(
              event.target.value
            )
          }
        />

        <span>
          %
        </span>
      </div>
    </div>

  </div>


  {/* PRÉVIA DO VALOR */}
  {quantidadeEfetivaNumero > 0 &&
    precoUnitarioNumero > 0 && (

      <div className="item-price-preview">

        <div>
          <span>
            Valor normal
          </span>

          <strong>
            {formatarDinheiro(
              subtotalProduto
            )}
          </strong>
        </div>


        {descontoProduto > 0 && (

          <div className="item-discount-preview">
            <span>
              Desconto
            </span>

            <strong>
              -{" "}
              {formatarDinheiro(
                descontoProduto
              )}
            </strong>
          </div>

        )}


        <div className="item-final-preview">
          <span>
            Valor deste produto
          </span>

          <strong>
            {formatarDinheiro(
              valorFinalProduto
            )}
          </strong>
        </div>

        {modoPacote &&
          itemSelecionado?.unit === "unidade" &&
          quantidadeTotalPacote > 0 && (
            <div>
              <span>
                Custo por unidade
              </span>

              <strong>
                {formatarDinheiro(
                  custoUnitarioFinal
                )}
              </strong>
            </div>
          )}

      </div>

    )}

</div>
          


            {erro && (

              <div className="form-error">
                {erro}
              </div>

            )}


            <button
              type="button"
              className="add-product-button"
              onClick={adicionarItem}
            >
              <span>
                +
              </span>

              Adicionar produto
            </button>

          </div>


          {/* CARRINHO */}
          <aside className="purchase-cart-card">

            <div className="cart-heading">

              <div>

                <span className="page-kicker">
                  CARRINHO
                </span>

                <h2>
                  Itens da compra
                </h2>

              </div>


              <span className="cart-count">
                {itens.length}
              </span>

            </div>


            {itens.length === 0 ? (

              <div className="empty-cart">

                <div className="empty-cart-icon">
                  🛒
                </div>

                <strong>
                  Nenhum produto adicionado
                </strong>

                <p>
                  Os produtos aparecerão aqui.
                </p>

              </div>

            ) : (

              <div className="cart-items">

                {itens.map((item) => (

                  <div
                    className="cart-item"
                    key={item.id}
                  >

                    <div className="cart-item-info">

                      <strong>
                        {item.produto}
                      </strong>

                      <span>
                        {item.quantidade}{" "}
                        {item.unidade}
                        {" · "}
                        {formatarDinheiro(
                          item.precoUnitario
                        )}
                        {" / "}
                        {item.unidade}
                      </span>

                      {item.purchaseMode === "package" && (
                        <small className="cart-promotion">
                          {item.packageQuantity}{" "}
                          {item.packageQuantity === 1
                            ? "pacote/caixa"
                            : "pacotes/caixas"}
                          {" × "}
                          {item.unitsPerPackage}{" "}
                          unidades
                        </small>
                      )}


{item.valorDesconto > 0 && (

  <small className="cart-promotion">

    {item.descontoReais > 0 && (
      <>
        Desconto de{" "}
        {formatarDinheiro(
          item.descontoReais
        )}
      </>
    )}

    {item.descontoReais > 0 &&
      item.percentualDesconto > 0 && (
        <>
          {" + "}
        </>
      )}

    {item.percentualDesconto > 0 && (
      <>
        {item.percentualDesconto}%
        {" de desconto"}
      </>
    )}

  </small>

)}

                    </div>


                    <div className="cart-item-actions">

                      <strong>
                        {formatarDinheiro(
                          item.valorFinal
                        )}
                      </strong>


                      {item.valorDesconto > 0 && (

                        <small className="cart-discount-value">
                          -{" "}
                          {formatarDinheiro(
                            item.valorDesconto
                          )}
                        </small>

                      )}


                      <button
                        type="button"
                        className="remove-item-button"
                        onClick={() =>
                          removerItem(
                            item.id
                          )
                        }
                        aria-label={`Remover ${item.produto}`}
                      >
                        ×
                      </button>

                    </div>

                  </div>

                ))}

              </div>

            )}


            {/* RESUMO */}
            {totalDescontos > 0 && (

              <div className="purchase-discount-summary">

                <span>
                  Economia em promoções
                </span>

                <strong>
                  {formatarDinheiro(
                    totalDescontos
                  )}
                </strong>

              </div>

            )}


            <div className="purchase-total">

              <span>
                Total da compra
              </span>

              <strong>
                {formatarDinheiro(total)}
              </strong>

            </div>


            <button
              type="button"
              className="save-purchase-button"
              disabled={
                itens.length === 0 ||
                salvando ||
                carregandoCompra ||
                carregandoEstoque
              }
              onClick={salvarCompra}
            >
              {salvando
                ? "Salvando..."
                : carregandoCompra
                  ? "Carregando compra..."
                  : compraEditandoId
                    ? "Salvar alterações"
                    : "Salvar compra"
              }
            </button>

          </aside>

        </section>

      </div>


      {/* MODAL NOVO PRODUTO */}
      {mostrarNovoProduto && (

        <div className="delete-modal-overlay">

          <div className="inventory-modal">

            <h2>
              Novo produto
            </h2>

            <p>
              Cadastre o item sem sair da compra.
            </p>


            <div className="form-group">

              <label>
                Nome
              </label>

              <input
                type="text"
                value={novoNome}
                onChange={(event) =>
                  setNovoNome(
                    event.target.value
                  )
                }
              />

            </div>


          <div className="form-row">

  {/* TIPO DE MEDIDA */}
  <div className="form-group">

    <label>
      Tipo de medida
    </label>

<select
  value={novaUnidade}
  onChange={(event) => {
    const valor = event.target.value;

    setNovaUnidade(valor);
    setNovaUnidadeMinimo(valor);
  }}
>
      {tiposMedida.map(
        (item) => (
          <option
            key={item.value}
            value={item.value}
          >
            {item.label}
          </option>
        )
      )}
    </select>

  </div>


  {/* ESTOQUE MÍNIMO */}
  <div className="form-group">

    <label>
      Estoque mínimo
    </label>

    <div className="quantity-unit-row">

      <input
        type="number"
        min="0"
        step="0.001"
        placeholder="Ex: 500"
        value={novoMinimo}
        onChange={(event) =>
          setNovoMinimo(
            event.target.value
          )
        }
      />

<select
  value={novaUnidadeMinimo}
  onChange={(event) =>
    setNovaUnidadeMinimo(
      event.target.value
    )
  }
>
  {novaUnidade === "g" && (
    <>
      <option value="g">
        g
      </option>

      <option value="kg">
        kg
      </option>
    </>
  )}

  {novaUnidade === "ml" && (
    <>
      <option value="ml">
        ml
      </option>

      <option value="L">
        L
      </option>
    </>
  )}

  {novaUnidade === "unidade" && (
    <option value="unidade">
      un
    </option>
  )}
</select>
    </div>

  </div>

</div>
            <div className="delete-modal-actions">

              <button
                type="button"
                className="delete-modal-cancel"
                onClick={() => {
                  setMostrarNovoProduto(
                    false
                  );

                  setErro("");
                }}
                disabled={
                  cadastrandoProduto
                }
              >
                Cancelar
              </button>


              <button
                type="button"
                className="inventory-save-button"
                onClick={
                  cadastrarNovoProduto
                }
                disabled={
                  cadastrandoProduto
                }
              >
                {cadastrandoProduto
                  ? "Cadastrando..."
                  : "Cadastrar produto"
                }
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}
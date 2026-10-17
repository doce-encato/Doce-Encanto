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

      return;
    }

    setEstoque(
      (data as EstoqueItem[]) ?? []
    );

    setCarregandoEstoque(false);
  }


  useEffect(() => {
    carregarEstoque();
  }, []);


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
  itemSelecionado?.unit === "unidade"
    ? quantidadeNumero * precoUnitarioNumero
    : precoUnitarioNumero;

const descontoPercentualValor =
  subtotalProduto *
  (
    percentualDescontoNumero /
    100
  );

const descontoProduto =
  descontoReaisNumero +
  descontoPercentualValor;

const valorFinalProduto =
  Math.max(
    0,
    subtotalProduto -
      descontoProduto
  );



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

  function adicionarItem() {
    setErro("");

    if (!itemSelecionado) {
      setErro(
        "Selecione um produto."
      );

      return;
    }

    if (
      quantidadeNumero <= 0
    ) {
      setErro(
        "Informe uma quantidade válida."
      );

      return;
    }

    if (
      precoUnitarioNumero <= 0
    ) {
      setErro(
        "Informe o preço unitário."
      );

      return;
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
    /*
     * Se informou quantidade em promoção,
     * precisa informar a porcentagem.
     */
if (
  descontoReaisNumero < 0
) {
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

if (
  descontoProduto >
  subtotalProduto
) {
  setErro(
    "O desconto não pode ser maior que o valor do produto."
  );
  return;
}

const quantidadeConvertida =
  converterQuantidadeParaEstoque(
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
    quantidadeNumero,

  quantidadeEstoque:
    quantidadeConvertida,

  unidade:
    unidadeCompra,

  precoUnitario:
    precoUnitarioNumero,

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
            href="/compras/nova"
            className="back-button"
          >
            ←
          </Link>

          <div>

            <span className="page-kicker">
              NOVA COMPRA
            </span>

            <h1>
              Compra detalhada
            </h1>

            <p>
              Registre os produtos comprados
              e o estoque será atualizado
              automaticamente.
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

            


            {/* QUANTIDADE */}
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


            {/* PREÇO UNITÁRIO */}
            <div className="form-group">

<label>
  {itemSelecionado?.unit === "unidade"
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
                  placeholder="Ex: 7,00"
                  value={precoUnitario}
                  onChange={(event) =>
                    setPrecoUnitario(
                      event.target.value
                    )
                  }
                />

              </div>

<small className="inventory-help">
  {itemSelecionado?.unit === "unidade"
    ? "Informe o preço de cada unidade antes do desconto."
    : "Informe o valor total pago por essa quantidade antes do desconto."
  }
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
  {quantidadeNumero > 0 &&
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
                salvando
              }
              onClick={salvarCompra}
            >
              {salvando
                ? "Salvando..."
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
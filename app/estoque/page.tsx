"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";


type EstoqueItem = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  minimum_quantity: number;
};


type UnidadeBase =
  | "unidade"
  | "g"
  | "ml";


type UnidadeEntrada =
  | "unidade"
  | "g"
  | "kg"
  | "ml"
  | "L";


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


export default function EstoquePage() {

  const [itens, setItens] =
    useState<EstoqueItem[]>([]);

  const [
    carregando,
    setCarregando,
  ] = useState(true);


  const [busca, setBusca] =
    useState("");


  const [
    mostrarNovoItem,
    setMostrarNovoItem,
  ] = useState(false);


  /*
   * NOVO ITEM
   */
  const [nome, setNome] =
    useState("");

  const [
    unidade,
    setUnidade,
  ] = useState<UnidadeBase>(
    "unidade"
  );


  const [
    quantidade,
    setQuantidade,
  ] = useState("");


  const [
    unidadeQuantidade,
    setUnidadeQuantidade,
  ] = useState<UnidadeEntrada>(
    "unidade"
  );


  const [
    minimo,
    setMinimo,
  ] = useState("");


  const [
    unidadeMinimo,
    setUnidadeMinimo,
  ] = useState<UnidadeEntrada>(
    "unidade"
  );


  const [
    salvando,
    setSalvando,
  ] = useState(false);


  const [erro, setErro] =
    useState("");


  /*
   * CARREGAR ESTOQUE
   */
  async function carregarEstoque() {

    setCarregando(true);


    const {
      data,
      error,
    } = await supabase

      .from(
        "inventory_items"
      )

      .select("*");


    if (error) {

      console.error(error);

      setCarregando(false);

      return;
    }


    setItens(
      (data as EstoqueItem[]) ??
        []
    );


    setCarregando(false);
  }


  useEffect(() => {

    carregarEstoque();

  }, []);


  /*
   * CONVERTE A QUANTIDADE
   * PARA A UNIDADE INTERNA
   *
   * Peso -> g
   * Líquido -> ml
   * Unidade -> unidade
   */
  function converterParaBase(
    quantidade: number,
    unidadeEntrada: string,
    unidadeBase: string
  ) {

    if (
      unidadeBase === "g"
    ) {

      if (
        unidadeEntrada === "kg"
      ) {

        return quantidade * 1000;
      }


      return quantidade;
    }


    if (
      unidadeBase === "ml"
    ) {

      if (
        unidadeEntrada === "L"
      ) {

        return quantidade * 1000;
      }


      return quantidade;
    }


    return quantidade;
  }


  /*
   * UNIDADE PADRÃO
   * QUANDO ESCOLHE O TIPO
   */
  function unidadePadrao(
    unidadeBase: UnidadeBase
  ): UnidadeEntrada {

    if (
      unidadeBase === "g"
    ) {

      return "kg";
    }


    if (
      unidadeBase === "ml"
    ) {

      return "L";
    }


    return "unidade";
  }


  /*
   * TROCAR TIPO DE MEDIDA
   */
  function alterarTipoMedida(
    novaUnidade: UnidadeBase
  ) {

    setUnidade(
      novaUnidade
    );


    const novaUnidadeEntrada =
      unidadePadrao(
        novaUnidade
      );


    setUnidadeQuantidade(
      novaUnidadeEntrada
    );


    setUnidadeMinimo(
      novaUnidadeEntrada
    );
  }


  /*
   * OPÇÕES PARA CADA TIPO
   */
  function opcoesDeUnidade(
    unidadeBase: UnidadeBase
  ) {

    if (
      unidadeBase === "g"
    ) {

      return [
        {
          value: "g",
          label: "g",
        },
        {
          value: "kg",
          label: "kg",
        },
      ];
    }


    if (
      unidadeBase === "ml"
    ) {

      return [
        {
          value: "ml",
          label: "ml",
        },
        {
          value: "L",
          label: "L",
        },
      ];
    }


    return [
      {
        value: "unidade",
        label: "unidade",
      },
    ];
  }


  /*
   * ORDENA ESTOQUE
   *
   * Estoque baixo primeiro.
   */
  const itensOrdenados =
    useMemo(() => {

      return [...itens]

        .filter(
          (item) =>

            item.name

              .toLowerCase()

              .includes(
                busca.toLowerCase()
              )
        )

        .sort(
          (a, b) => {

            const aBaixo =
              Number(
                a.quantity
              ) <=
              Number(
                a.minimum_quantity
              );


            const bBaixo =
              Number(
                b.quantity
              ) <=
              Number(
                b.minimum_quantity
              );


            if (
              aBaixo &&
              !bBaixo
            ) {

              return -1;
            }


            if (
              !aBaixo &&
              bBaixo
            ) {

              return 1;
            }


            return a.name.localeCompare(
              b.name,
              "pt-BR"
            );
          }
        );

    }, [
      itens,
      busca,
    ]);


  /*
   * QUANTOS ESTÃO BAIXOS
   */
  const quantidadeBaixa =
    itens.filter(
      (item) =>

        Number(
          item.quantity
        ) <=

        Number(
          item.minimum_quantity
        )
    ).length;


  /*
   * SALVAR NOVO ITEM
   */
  async function salvarNovoItem() {

    setErro("");


    if (
      !nome.trim()
    ) {

      setErro(
        "Informe o nome do produto."
      );

      return;
    }


    if (
      quantidade === "" ||
      Number(
        quantidade
      ) < 0
    ) {

      setErro(
        "Informe uma quantidade válida."
      );

      return;
    }


    if (
      minimo === "" ||
      Number(
        minimo
      ) < 0
    ) {

      setErro(
        "Informe o estoque mínimo."
      );

      return;
    }


    /*
     * EVITA PRODUTO DUPLICADO
     */
    const nomeNormalizado =
      nome
        .trim()
        .toLocaleLowerCase(
          "pt-BR"
        );


    const jaExiste =
      itens.some(
        (item) =>

          item.name

            .trim()

            .toLocaleLowerCase(
              "pt-BR"
            ) ===
          nomeNormalizado
      );


    if (
      jaExiste
    ) {

      setErro(
        "Esse produto já está cadastrado."
      );

      return;
    }


    /*
     * CONVERTE PARA
     * UNIDADE INTERNA
     */
    const quantidadeConvertida =
      converterParaBase(

        Number(
          quantidade
        ),

        unidadeQuantidade,

        unidade
      );


    const minimoConvertido =
      converterParaBase(

        Number(
          minimo
        ),

        unidadeMinimo,

        unidade
      );


    setSalvando(true);


    const {
      error,
    } = await supabase

      .from(
        "inventory_items"
      )

      .insert({

        name:
          nome.trim(),

        quantity:
          quantidadeConvertida,

        /*
         * unidade interna:
         *
         * unidade
         * g
         * ml
         */
        unit:
          unidade,

        minimum_quantity:
          minimoConvertido,

      });


    if (
      error
    ) {

      console.error(
        error
      );


      setErro(
        "Não foi possível cadastrar o item."
      );


      setSalvando(false);

      return;
    }


    /*
     * LIMPA O FORMULÁRIO
     */
    setNome("");

    setQuantidade("");

    setUnidade(
      "unidade"
    );

    setUnidadeQuantidade(
      "unidade"
    );

    setMinimo("");

    setUnidadeMinimo(
      "unidade"
    );


    setMostrarNovoItem(
      false
    );


    setSalvando(
      false
    );


    await carregarEstoque();
  }


  /*
   * FORMATAR NÚMERO
   */
  function formatarQuantidade(
    quantidade: number
  ) {

    return Number(
      quantidade
    ).toLocaleString(
      "pt-BR",
      {
        maximumFractionDigits: 3,
      }
    );
  }


  /*
   * MOSTRAR QUANTIDADE
   * DE FORMA AMIGÁVEL
   *
   * 1200 g ->
   * 1 kg e 200 g
   *
   * 2250 ml ->
   * 2 L e 250 ml
   */
  function formatarEstoque(
    quantidade: number,
    unidade: string
  ) {

    const valor =
      Number(
        quantidade
      );


    /*
     * COMPATIBILIDADE
     * COM ITENS ANTIGOS
     * QUE AINDA POSSAM ESTAR
     * CADASTRADOS EM KG.
     */
    if (
      unidade === "kg"
    ) {

      return `${formatarQuantidade(
        valor
      )} kg`;
    }


    /*
     * PESO
     */
    if (
      unidade === "g"
    ) {

      if (
        valor >= 1000
      ) {

        const kg =
          Math.floor(
            valor / 1000
          );


        const gramas =
          Math.round(
            (
              valor %
              1000
            ) *
            1000
          ) /
          1000;


        if (
          gramas === 0
        ) {

          return `${kg} kg`;
        }


        return `${kg} kg e ${formatarQuantidade(
          gramas
        )} g`;
      }


      return `${formatarQuantidade(
        valor
      )} g`;
    }


    /*
     * COMPATIBILIDADE
     * COM ITENS ANTIGOS
     * EM LITROS.
     */
    if (
      unidade === "L"
    ) {

      return `${formatarQuantidade(
        valor
      )} L`;
    }


    /*
     * LÍQUIDO
     */
    if (
      unidade === "ml"
    ) {

      if (
        valor >= 1000
      ) {

        const litros =
          Math.floor(
            valor / 1000
          );


        const ml =
          Math.round(
            (
              valor %
              1000
            ) *
            1000
          ) /
          1000;


        if (
          ml === 0
        ) {

          return `${litros} L`;
        }


        return `${litros} L e ${formatarQuantidade(
          ml
        )} ml`;
      }


      return `${formatarQuantidade(
        valor
      )} ml`;
    }


    /*
     * UNIDADE
     */
    return `${formatarQuantidade(
      valor
    )} ${
      valor === 1
        ? "unidade"
        : "unidades"
    }`;
  }


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
              Estoque
            </h1>


            <p>
              Ingredientes e materiais disponíveis.
            </p>

          </div>

        </header>



        {/* RESUMO */}
        <section className="inventory-summary">

          <div className="inventory-summary-card">

            <span>
              Itens cadastrados
            </span>

            <strong>
              {itens.length}
            </strong>

          </div>


          <div
            className={`inventory-summary-card ${
              quantidadeBaixa > 0
                ? "inventory-summary-warning"
                : ""
            }`}
          >

            <span>
              Estoque baixo
            </span>

            <strong>
              {quantidadeBaixa}
            </strong>

            <small>

              {quantidadeBaixa === 0

                ? "Tudo certo"

                : quantidadeBaixa === 1

                  ? "1 item precisa de atenção"

                  : `${quantidadeBaixa} itens precisam de atenção`
              }

            </small>

          </div>

        </section>



        {/* AÇÕES */}
        <div className="inventory-actions">

          <input
            type="text"
            className="inventory-search"
            placeholder="Pesquisar produto..."
            value={busca}
            onChange={(event) =>
              setBusca(
                event.target.value
              )
            }
          />


          <button
            type="button"
            className="new-inventory-button"
            onClick={() =>
              setMostrarNovoItem(
                true
              )
            }
          >
            + Novo item
          </button>

        </div>



        {/* LISTA */}
        <section className="inventory-section">

          <div className="history-heading">

            <div>

              <span className="page-kicker">
                ESTOQUE ATUAL
              </span>

              <h2>
                Produtos
              </h2>

            </div>

          </div>


          {carregando ? (

            <div className="empty-purchases">

              <strong>
                Carregando estoque...
              </strong>

            </div>

          ) : itensOrdenados.length === 0 ? (

            <div className="empty-purchases">

              <strong>
                Nenhum item cadastrado
              </strong>

              <p>
                Clique em Novo item para começar.
              </p>

            </div>

          ) : (

            <div className="inventory-list">

              {itensOrdenados.map(
                (item) => {


                  const estoqueBaixo =
                    Number(
                      item.quantity
                    ) <=
                    Number(
                      item.minimum_quantity
                    );


                  return (

                    <Link

                      href={
                        `/estoque/${item.id}`
                      }

                      key={
                        item.id
                      }

                      className={`inventory-item ${
                        estoqueBaixo
                          ? "inventory-item-low"
                          : ""
                      }`}
                    >

                      <div className="inventory-item-main">

                        <strong>
                          {item.name}
                        </strong>


                        <span>

                          Mínimo:{" "}

                          {formatarEstoque(
                            item.minimum_quantity,
                            item.unit
                          )}

                        </span>

                      </div>


                      <div className="inventory-item-right">

                        <strong>

                          {formatarEstoque(
                            item.quantity,
                            item.unit
                          )}

                        </strong>


                        {estoqueBaixo ? (

                          <span className="inventory-status-low">
                            Está acabando
                          </span>

                        ) : (

                          <span className="inventory-status-ok">
                            Estoque OK
                          </span>

                        )}

                      </div>


                      <span className="inventory-arrow">
                        ›
                      </span>

                    </Link>

                  );

                }
              )}

            </div>

          )}

        </section>

      </div>



      {/* MODAL NOVO ITEM */}
      {mostrarNovoItem && (

        <div className="delete-modal-overlay">

          <div className="inventory-modal">

            <h2>
              Novo item
            </h2>


            <p>
              Cadastre um ingrediente ou material.
            </p>



            {/* NOME */}
            <div className="form-group">

              <label>
                Produto
              </label>


              <input
                type="text"
                placeholder="Ex: Açúcar"
                value={nome}
                onChange={(event) =>
                  setNome(
                    event.target.value
                  )
                }
              />

            </div>



            {/* TIPO DE MEDIDA */}
            <div className="form-group">

              <label>
                Tipo de medida
              </label>


              <select

                value={
                  unidade
                }

                onChange={(event) =>
                  alterarTipoMedida(
                    event.target
                      .value as UnidadeBase
                  )
                }
              >

                {tiposMedida.map(
                  (item) => (

                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {item.label}
                    </option>

                  )
                )}

              </select>


              <small className="inventory-help">

                Escolha Unidade,
                Peso ou Líquido.

              </small>

            </div>



           {/* QUANTIDADE ATUAL */}
<div className="form-group">

  <label>
    Quantidade atual
  </label>

  <div className="quantity-unit-row">

    <input
      type="number"
      min="0"
      step="0.001"
      placeholder="0"
      value={quantidade}
      onChange={(event) =>
        setQuantidade(
          event.target.value
        )
      }
    />

    <select
      value={unidadeQuantidade}
      onChange={(event) =>
        setUnidadeQuantidade(
          event.target.value as UnidadeEntrada
        )
      }
    >
      {opcoesDeUnidade(unidade).map(
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

</div>

{/* ESTOQUE MÍNIMO */}
<div className="form-group">

  <label>
    Avisar quando chegar a
  </label>

  <div className="quantity-unit-row">

    <input
      type="number"
      min="0"
      step="0.001"
      placeholder="Ex: 1"
      value={minimo}
      onChange={(event) =>
        setMinimo(
          event.target.value
        )
      }
    />

    <select
      value={unidadeMinimo}
      onChange={(event) =>
        setUnidadeMinimo(
          event.target.value as UnidadeEntrada
        )
      }
    >
      {opcoesDeUnidade(unidade).map(
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

  <small className="inventory-help">
    Quando chegar nessa quantidade aparecerá
    “Está acabando”.
  </small>

</div>


{erro && (

  <div className="form-error">
    {erro}
  </div>

)}


<div className="delete-modal-actions">

  <button
    type="button"
    className="delete-modal-cancel"
    onClick={() => {

      setMostrarNovoItem(false);
      setErro("");

    }}
    disabled={salvando}
  >
    Cancelar
  </button>


  <button
    type="button"
    className="inventory-save-button"
    onClick={salvarNovoItem}
    disabled={salvando}
  >
    {salvando
      ? "Salvando..."
      : "Cadastrar item"
    }
  </button>

</div>

</div>

</div>

)}

</main>
);
}
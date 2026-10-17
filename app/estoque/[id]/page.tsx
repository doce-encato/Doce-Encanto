"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EstoqueItem = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  minimum_quantity: number;
};

const unidades = [
  "unidade",
  "g",
  "kg",
  "ml",
  "L",
];

export default function EstoqueDetalhesPage() {
  const params = useParams();
  const router = useRouter();

  const id = Number(params.id);

  const [item, setItem] = useState<EstoqueItem | null>(null);

  const [carregando, setCarregando] = useState(true);

const [quantidadeMovimento, setQuantidadeMovimento] =
  useState("");

const [unidadeMovimento, setUnidadeMovimento] =
  useState("unidade");

  const [modoEditar, setModoEditar] =
    useState(false);

  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("unidade");
  const [minimo, setMinimo] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [mostrarExcluir, setMostrarExcluir] =
    useState(false);


  async function carregarItem() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error(error);
      setCarregando(false);
      return;
    }

    const itemEncontrado =
      data as EstoqueItem;

    setItem(itemEncontrado);
    setUnidadeMovimento(
  itemEncontrado.unit
);

    setNome(itemEncontrado.name);
    setUnidade(itemEncontrado.unit);
    setMinimo(
      String(itemEncontrado.minimum_quantity)
    );

    setCarregando(false);
  }


  useEffect(() => {
    if (id) {
      carregarItem();
    }
  }, [id]);


  function formatarQuantidade(valor: number) {
    return Number(valor).toLocaleString(
      "pt-BR",
      {
        maximumFractionDigits: 3,
      }
    );
  }
function formatarEstoque(
  valor: number,
  unidade: string
) {
  const quantidade = Number(valor);

  if (
    unidade === "g" &&
    quantidade >= 1000
  ) {
    return `${formatarQuantidade(
      quantidade / 1000
    )} kg`;
  }

  if (
    unidade === "ml" &&
    quantidade >= 1000
  ) {
    return `${formatarQuantidade(
      quantidade / 1000
    )} L`;
  }

  if (unidade === "unidade") {
    return `${formatarQuantidade(
      quantidade
    )} un`;
  }

  return `${formatarQuantidade(
    quantidade
  )} ${unidade}`;
}

function converterQuantidade(
  valor: number,
  unidadeInformada: string,
  unidadeEstoque: string
) {

  if (
    unidadeInformada ===
    unidadeEstoque
  ) {
    return valor;
  }

  // peso
  if (
    unidadeInformada === "kg" &&
    unidadeEstoque === "g"
  ) {
    return valor * 1000;
  }

  if (
    unidadeInformada === "g" &&
    unidadeEstoque === "kg"
  ) {
    return valor / 1000;
  }

  // volume
  if (
    unidadeInformada === "L" &&
    unidadeEstoque === "ml"
  ) {
    return valor * 1000;
  }

  if (
    unidadeInformada === "ml" &&
    unidadeEstoque === "L"
  ) {
    return valor / 1000;
  }

  return NaN;
}


  async function adicionarQuantidade() {
    setErro("");

    if (!item) return;

    const valorDigitado =
  Number(
    quantidadeMovimento
  );

const valor =
  converterQuantidade(
    valorDigitado,
    unidadeMovimento,
    item.unit
  );

    if (!valor || valor <= 0) {
      setErro(
        "Informe uma quantidade válida."
      );
      return;
    }

    setSalvando(true);

    const novaQuantidade =
      Number(item.quantity) + valor;

    const { error } = await supabase
      .from("inventory_items")
      .update({
        quantity: novaQuantidade,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível atualizar o estoque."
      );

      setSalvando(false);
      return;
    }

    setQuantidadeMovimento("");
    setSalvando(false);

    await carregarItem();
  }


  async function retirarQuantidade() {
    setErro("");

    if (!item) return;

 const valorDigitado =
  Number(
    quantidadeMovimento
  );

const valor =
  converterQuantidade(
    valorDigitado,
    unidadeMovimento,
    item.unit
  );

    if (!valor || valor <= 0) {
      setErro(
        "Informe uma quantidade válida."
      );
      return;
    }

    if (valor > Number(item.quantity)) {
      setErro(
        "A quantidade retirada é maior que o estoque atual."
      );
      return;
    }

    setSalvando(true);

    const novaQuantidade =
      Number(item.quantity) - valor;

    const { error } = await supabase
      .from("inventory_items")
      .update({
        quantity: novaQuantidade,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível atualizar o estoque."
      );

      setSalvando(false);
      return;
    }

    setQuantidadeMovimento("");
    setSalvando(false);

    await carregarItem();
  }


  async function salvarEdicao() {
    setErro("");

    if (!item) return;

    if (!nome.trim()) {
      setErro(
        "Informe o nome do produto."
      );
      return;
    }

    if (
      minimo === "" ||
      Number(minimo) < 0
    ) {
      setErro(
        "Informe um estoque mínimo válido."
      );
      return;
    }

    setSalvando(true);

const { error } = await supabase
  .from("inventory_items")
  .update({
    name: nome.trim(),
    minimum_quantity: Number(minimo),
    updated_at: new Date().toISOString(),
  })
  .eq("id", item.id);

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível salvar as alterações."
      );

      setSalvando(false);
      return;
    }

    setModoEditar(false);
    setSalvando(false);

    await carregarItem();
  }


  async function excluirItem() {
    if (!item) return;

    setSalvando(true);

    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível excluir o item."
      );

      setSalvando(false);
      return;
    }

    router.push("/estoque");
    router.refresh();
  }


  if (carregando) {
    return (
      <main className="compras-page">
        <div className="page-shell">

          <div className="empty-purchases">
            <strong>
              Carregando item...
            </strong>
          </div>

        </div>
      </main>
    );
  }


  if (!item) {
    return (
      <main className="compras-page">
        <div className="page-shell">

          <Link
            href="/estoque"
            className="back-button"
          >
            ←
          </Link>

          <h1>
            Item não encontrado
          </h1>

        </div>
      </main>
    );
  }


  const estoqueBaixo =
    Number(item.quantity) <=
    Number(item.minimum_quantity);


  return (
    <main className="compras-page">

      <div className="page-shell">

        <header className="page-header">

          <Link
            href="/estoque"
            className="back-button"
          >
            ←
          </Link>

          <div>

            <span className="page-kicker">
              ESTOQUE
            </span>

            <h1>
              {item.name}
            </h1>

            <p>
              Controle de quantidade e estoque mínimo.
            </p>

          </div>

        </header>


        <section className="inventory-detail-card">

          <div className="inventory-detail-top">

            <div>

              <span>
                Quantidade atual
              </span>

<strong>
  {formatarEstoque(
    item.quantity,
    item.unit
  )}
</strong>

            </div>


            <div>

              <span>
                Estoque mínimo
              </span>

<strong>
  {formatarEstoque(
    item.minimum_quantity,
    item.unit
  )}
</strong>

            </div>

          </div>


          <div
            className={`inventory-detail-status ${
              estoqueBaixo
                ? "inventory-detail-status-low"
                : "inventory-detail-status-ok"
            }`}
          >
            {estoqueBaixo
              ? "Está acabando"
              : "Estoque OK"}
          </div>


          <div className="inventory-movement">

            <h2>
              Ajustar estoque
            </h2>

            <p>
              Informe quanto deseja adicionar ou retirar.
            </p>

<div className="form-group">

  <label>
    Quantidade
  </label>

  <div className="quantity-unit-row">

    <input
      type="number"
      min="0"
      step="0.001"
      placeholder="Ex: 2"
      value={quantidadeMovimento}
      onChange={(event) =>
        setQuantidadeMovimento(
          event.target.value
        )
      }
    />

    <select
      value={unidadeMovimento}
      onChange={(event) =>
        setUnidadeMovimento(
          event.target.value
        )
      }
    >

      {item.unit === "g" ||
      item.unit === "kg" ? (
        <>
          <option value="g">
            g
          </option>

          <option value="kg">
            kg
          </option>
        </>
      ) : item.unit === "ml" ||
        item.unit === "L" ? (
        <>
          <option value="ml">
            ml
          </option>

          <option value="L">
            L
          </option>
        </>
      ) : (
        <option value="unidade">
          un
        </option>
      )}

    </select>

  </div>

</div>


            {erro && (
              <div className="form-error">
                {erro}
              </div>
            )}


            <div className="inventory-movement-actions">

              <button
                type="button"
                className="inventory-add-button"
                onClick={
                  adicionarQuantidade
                }
                disabled={salvando}
              >
                + Adicionar
              </button>


              <button
                type="button"
                className="inventory-remove-button"
                onClick={
                  retirarQuantidade
                }
                disabled={salvando}
              >
                − Retirar
              </button>

            </div>

          </div>


          <div className="inventory-edit-area">

            {!modoEditar ? (

              <button
                type="button"
                className="inventory-edit-button"
                onClick={() =>
                  setModoEditar(true)
                }
              >
                Editar item
              </button>

            ) : (

              <div className="inventory-edit-form">

                <h2>
                  Editar item
                </h2>


                <div className="form-group">

                  <label>
                    Nome
                  </label>

                  <input
                    type="text"
                    value={nome}
                    onChange={(event) =>
                      setNome(
                        event.target.value
                      )
                    }
                  />

                </div>


                <div className="form-row">

                  <div className="form-group">

                    <label>
                      Unidade
                    </label>

                    <select
                      value={unidade}
                      onChange={(event) =>
                        setUnidade(
                          event.target.value
                        )
                      }
                    >

                      {unidades.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        )
                      )}

                    </select>

                  </div>


                  <div className="form-group">

                    <label>
                      Estoque mínimo
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={minimo}
                      onChange={(event) =>
                        setMinimo(
                          event.target.value
                        )
                      }
                    />

                  </div>

                </div>


                <div className="inventory-edit-actions">

                  <button
                    type="button"
                    className="delete-modal-cancel"
                    onClick={() => {
                      setModoEditar(false);

                      setNome(item.name);
                      setUnidade(
                        item.unit
                      );
                      setMinimo(
                        String(
                          item.minimum_quantity
                        )
                      );

                      setErro("");
                    }}
                  >
                    Cancelar
                  </button>


                  <button
                    type="button"
                    className="inventory-save-button"
                    onClick={
                      salvarEdicao
                    }
                    disabled={salvando}
                  >
                    Salvar alterações
                  </button>

                </div>

              </div>

            )}

          </div>


          <div className="inventory-delete-area">

            <button
              type="button"
              className="delete-purchase-button"
              onClick={() =>
                setMostrarExcluir(true)
              }
            >
              Excluir item
            </button>

          </div>

        </section>

      </div>


      {mostrarExcluir && (

        <div className="delete-modal-overlay">

          <div className="delete-modal">

            <div className="delete-modal-icon">
              !
            </div>

            <h2>
              Excluir item?
            </h2>

            <p>
              Você está prestes a excluir{" "}
              <strong>
                {item.name}
              </strong>{" "}
              do estoque.
            </p>

            <p>
              Essa ação não pode ser desfeita.
            </p>


            <div className="delete-modal-actions">

              <button
                type="button"
                className="delete-modal-cancel"
                onClick={() =>
                  setMostrarExcluir(false)
                }
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="delete-modal-confirm"
                onClick={excluirItem}
                disabled={salvando}
              >
                {salvando
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
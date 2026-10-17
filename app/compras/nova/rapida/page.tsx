"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CompraRapidaPage() {
  const router = useRouter();

  const [local, setLocal] = useState("");
  const [data, setData] = useState("");
  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvarCompra() {
    setErro("");

    if (!local.trim()) {
      setErro("Informe onde a compra foi realizada.");
      return;
    }

    if (!data) {
      setErro("Informe a data da compra.");
      return;
    }

    if (!valor || Number(valor) <= 0) {
      setErro("Informe um valor válido.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase
      .from("purchases")
      .insert({
        store_name: local.trim(),
        purchase_date: data,
        type: "quick",
        total: Number(valor),
        notes: observacao.trim() || null,
      });

    setSalvando(false);

    if (error) {
      console.error(error);

      setErro(
        "Não foi possível salvar a compra."
      );

      return;
    }

    router.push("/compras");
    router.refresh();
  }

  return (
    <main className="compras-page">
      <div className="page-shell">

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
              Compra rápida
            </h1>

            <p>
              Registre apenas o total que foi gasto.
            </p>
          </div>

        </header>


        <section className="purchase-form-card">

          <div className="form-group">
            <label>
              Onde comprou?
            </label>

            <input
              type="text"
              placeholder="Ex: Atacadão"
              value={local}
              onChange={(event) =>
                setLocal(event.target.value)
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
                setData(event.target.value)
              }
            />
          </div>


          <div className="form-group">
            <label>
              Quanto gastou?
            </label>

            <div className="money-input">

              <span>
                R$
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(event) =>
                  setValor(event.target.value)
                }
              />

            </div>
          </div>


          <div className="form-group">
            <label>
              Observação
            </label>

            <textarea
              placeholder="Ex: Compra para produção da semana"
              rows={4}
              value={observacao}
              onChange={(event) =>
                setObservacao(event.target.value)
              }
            />
          </div>


          <div className="form-warning">
            Esta compra será registrada nos gastos,
            mas não alterará o estoque.
          </div>


          {erro && (
            <div className="form-error">
              {erro}
            </div>
          )}


          <button
            type="button"
            className="save-purchase-button"
            onClick={salvarCompra}
            disabled={salvando}
          >
            {salvando
              ? "Salvando..."
              : "Salvar compra"
            }
          </button>

        </section>

      </div>
    </main>
  );
}
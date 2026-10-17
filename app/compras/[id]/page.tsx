import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ExcluirCompraButton from "./ExcluirCompraButton";

export const dynamic = "force-dynamic";

type ItemCompra = {
  id: number;
  product_name: string;
  quantity: number;
  unit: string;
  total_price: number;
};

type Compra = {
  id: number;
  store_name: string;
  purchase_date: string;
  type: "quick" | "detailed";
  total: number;
  notes: string | null;
  created_at: string;
  purchase_items: ItemCompra[];
};

function formatarDinheiro(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default async function CompraDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("purchases")
    .select(`
      id,
      store_name,
      purchase_date,
      type,
      total,
      notes,
      created_at,
      purchase_items (
        id,
        product_name,
        quantity,
        unit,
        total_price
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(error);

    return (
      <main className="compras-page">
        <div className="page-shell">

          <header className="page-header">
            <Link
              href="/compras"
              className="back-button"
            >
              ←
            </Link>

            <div>
              <span className="page-kicker">
                COMPRAS
              </span>

              <h1>
                Compra não encontrada
              </h1>

              <p>
                Não foi possível localizar essa compra.
              </p>
            </div>
          </header>

        </div>
      </main>
    );
  }

  const compra = data as Compra;

  return (
    <main className="compras-page">
      <div className="page-shell">

        <header className="page-header">
          <Link
            href="/compras"
            className="back-button"
          >
            ←
          </Link>

          <div>
            <span className="page-kicker">
              DETALHES DA COMPRA
            </span>

            <h1>
              {compra.store_name}
            </h1>

            <p>
              {formatarData(compra.purchase_date)}
            </p>
          </div>
        </header>


        <section className="purchase-detail-card">

          <div className="detail-top">

            <div>
              <span>
                Tipo de compra
              </span>

              <strong>
                {compra.type === "detailed"
                  ? "Detalhada"
                  : "Rápida"}
              </strong>
            </div>


            <div>
              <span>
                Total gasto
              </span>

              <strong className="detail-total">
                {formatarDinheiro(compra.total)}
              </strong>
            </div>

          </div>


          {compra.type === "detailed" ? (

            <div className="detail-products">

              <h2>
                Produtos comprados
              </h2>

              {compra.purchase_items.length === 0 ? (

                <p>
                  Nenhum produto encontrado.
                </p>

              ) : (

                compra.purchase_items.map((produto) => (

                  <div
                    className="detail-product"
                    key={produto.id}
                  >

                    <div>
                      <strong>
                        {produto.product_name}
                      </strong>

                      <span>
                        {produto.quantity} {produto.unit}
                      </span>
                    </div>

                    <strong>
                      {formatarDinheiro(
                        produto.total_price
                      )}
                    </strong>

                  </div>

                ))

              )}

            </div>

          ) : (

            <div className="quick-purchase-info">

              <strong>
                Compra rápida
              </strong>

              <p>
                Nesta compra foi registrado apenas o valor total.
              </p>

              {compra.notes && (
                <div className="purchase-note">

                  <span>
                    Observação
                  </span>

                  <p>
                    {compra.notes}
                  </p>

                </div>
              )}

            </div>

          )}

          <div className="purchase-delete-area">
  <ExcluirCompraButton
    compraId={compra.id}
  />
</div>
        </section>

      </div>
    </main>
  );
}
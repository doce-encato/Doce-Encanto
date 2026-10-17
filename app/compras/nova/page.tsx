import Link from "next/link";

export default function NovaCompraPage() {
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
              Nova compra
            </h1>

            <p>
              Como você quer registrar essa compra?
            </p>
          </div>
        </header>


        <section className="purchase-choice">

          {/* COMPRA DETALHADA */}
          <Link
            href="/compras/nova/detalhada"
            className="purchase-choice-card detailed-choice"
          >
            <div className="choice-icon">
              🛒
            </div>

            <div className="choice-content">
              <strong>
                Compra detalhada
              </strong>

              <p>
                Adicione os produtos, quantidades,
                unidades e valores.
              </p>

              <span className="choice-benefit">
                Atualiza o estoque
              </span>
            </div>

            <span className="choice-arrow">
              ›
            </span>
          </Link>


          {/* COMPRA RÁPIDA */}
          <Link
            href="/compras/nova/rapida"
            className="purchase-choice-card quick-choice"
          >
            <div className="choice-icon">
              💰
            </div>

            <div className="choice-content">
              <strong>
                Compra rápida
              </strong>

              <p>
                Registre somente quanto gastou.
              </p>

              <span className="choice-benefit">
                Não altera o estoque
              </span>
            </div>

            <span className="choice-arrow">
              ›
            </span>
          </Link>

        </section>

      </div>
    </main>
  );
}
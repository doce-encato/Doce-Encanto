"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ExcluirCompraButton({
  compraId,
}: {
  compraId: number;
}) {
  const router = useRouter();

  const [excluindo, setExcluindo] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

  async function excluirCompra() {
    setExcluindo(true);

    const { error } = await supabase
      .from("purchases")
      .delete()
      .eq("id", compraId);

    if (error) {
      console.error(error);

      setExcluindo(false);
      alert("Não foi possível excluir a compra.");
      return;
    }

    router.push("/compras");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="delete-purchase-button"
        onClick={() => setMostrarConfirmacao(true)}
      >
        Excluir compra
      </button>

      {mostrarConfirmacao && (
        <div className="delete-modal-overlay">

          <div className="delete-modal">

            <div className="delete-modal-icon">
              !
            </div>

            <h2>
              Excluir compra?
            </h2>

            <p>
              Essa compra será removida permanentemente.
              Essa ação não pode ser desfeita.
            </p>

            <div className="delete-modal-actions">

              <button
                type="button"
                className="delete-modal-cancel"
                onClick={() =>
                  setMostrarConfirmacao(false)
                }
                disabled={excluindo}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="delete-modal-confirm"
                onClick={excluirCompra}
                disabled={excluindo}
              >
                {excluindo
                  ? "Excluindo..."
                  : "Sim, excluir"}
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}
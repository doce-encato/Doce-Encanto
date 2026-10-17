"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const menuItems = [
  { title: "Compras", image: "/icons/compras.png", className: "card-pink", href: "/compras" },
  { title: "Matéria-prima", image: "/icons/estoque.png", className: "card-cream", href: "/estoque" },
  { title: "Clientes", image: "/icons/clientes.png", className: "card-pink", href: "/clientes" },
  { title: "Doces", image: "/icons/producao.png", className: "card-pink", href: "/doces" },
  { title: "Resumo", image: "/icons/resumo.png", className: "card-cream", href: "/resumo" },
];

function dinheiro(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function inicioMesISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
}

function inicioProximoMesISO() {
  const hoje = new Date();
  const proximo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  return `${proximo.getFullYear()}-${String(proximo.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function Home() {
  const [vendasHoje, setVendasHoje] = useState(0);
  const [lucroEstimadoMes, setLucroEstimadoMes] = useState(0);
  const [carregandoResumo, setCarregandoResumo] = useState(true);

  useEffect(() => {
    async function carregarResumoHome() {
      setCarregandoResumo(true);

      const hoje = hojeISO();
      const inicioMes = inicioMesISO();
      const inicioProximoMes = inicioProximoMesISO();

      const [vendasHojeResp, vendasMesResp, comprasMesResp] = await Promise.all([
        supabase.from("sales").select("total").eq("sale_date", hoje).neq("payment_status", "canceled"),
        supabase.from("sales").select("total").gte("sale_date", inicioMes).lt("sale_date", inicioProximoMes).neq("payment_status", "canceled"),
        supabase.from("purchases").select("total").gte("purchase_date", inicioMes).lt("purchase_date", inicioProximoMes),
      ]);

      if (vendasHojeResp.error || vendasMesResp.error || comprasMesResp.error) {
        console.error(vendasHojeResp.error || vendasMesResp.error || comprasMesResp.error);
        setCarregandoResumo(false);
        return;
      }

      const totalHoje = (vendasHojeResp.data ?? []).reduce((soma, venda) => soma + Number(venda.total ?? 0), 0);
      const totalVendidoMes = (vendasMesResp.data ?? []).reduce((soma, venda) => soma + Number(venda.total ?? 0), 0);
      const totalComprasMes = (comprasMesResp.data ?? []).reduce((soma, compra) => soma + Number(compra.total ?? 0), 0);

      setVendasHoje(totalHoje);
      setLucroEstimadoMes(totalVendidoMes - totalComprasMes * 3);
      setCarregandoResumo(false);
    }

    carregarResumoHome();
  }, []);

  return (
    <main className="app">
      <section className="hero">
        <div className="top-actions">

        </div>

        <div className="hero-content">
          <div className="mascot-wrapper">
            <Image
              src="/mascot/doce-encanto.png"
              alt="Mascote Doce Encanto"
              width={320}
              height={400}
              className="mascot"
              priority
            />
          </div>

          <div className="brand">
            <span className="brand-heart">♡</span>
            <h1>Doce Encanto</h1>
            <div className="brand-line">
              <span />
              <span className="small-heart">♡</span>
              <span />
            </div>
            <p>DOCES QUE FAZEM A VIDA MAIS DOCE</p>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="stats">
          <div className="stat-card stat-pink">
            <Image
              src="/icons/vendas_de_hoje.png"
              alt="Vendas de hoje"
              width={120}
              height={120}
              className="stat-image"
            />
            <div>
              <p>Vendas de hoje</p>
              <strong>{carregandoResumo ? "..." : dinheiro(vendasHoje)}</strong>
            </div>
          </div>

          <div className="stat-card stat-cream">
            <Image
              src="/icons/moeda.png"
              alt="Lucro estimado do mês"
              width={120}
              height={120}
              className="stat-image"
            />
            <div>
              <p>Lucro estimado do mês</p>
              <strong className="brown-value">
                {carregandoResumo ? "..." : dinheiro(lucroEstimadoMes)}
              </strong>
            </div>
          </div>
        </div>

        <section className="menu-grid">
          <Link href="/nova-venda" className="menu-card new-sale">
            <div className="new-sale-icon">+</div>
            <h2>Nova venda</h2>
            <span className="arrow">›</span>
          </Link>

          {menuItems.map((item) => (
            <Link href={item.href} className={`menu-card ${item.className}`} key={item.title}>
              <Image
                src={item.image}
                alt={item.title}
                width={170}
                height={170}
                className="menu-image"
              />
              <h2>{item.title}</h2>
              <span className="arrow">›</span>
            </Link>
          ))}
        </section>

        <section className="message-card">
          <span>♡</span>
          <p>
            Organize seu negócio
            <br />
            e faça mais doces histórias!
          </p>
          <span>♡</span>
        </section>
      </section>

      <div className="bottom-decoration" />
    </main>
  );
}

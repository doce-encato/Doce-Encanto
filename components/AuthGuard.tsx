"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    if (pathname === "/login") {
      setVerificando(false);
      return;
    }

    let ativo = true;

    async function verificarSessao() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!ativo) return;

      if (!session) {
        router.replace("/login");
        return;
      }

      setVerificando(false);
    }

    verificarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== "/login") {
        router.replace("/login");
      }
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (verificando) {
    return (
      <main className="auth-loading">
        <strong>Carregando...</strong>
      </main>
    );
  }

  return <>{children}</>;
}
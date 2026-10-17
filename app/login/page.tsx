"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function verificarSessao() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/");
      }
    }

    verificarSessao();
  }, [router]);

  async function enviarLink(evento: FormEvent) {
    evento.preventDefault();

    const emailLimpo = email.trim().toLowerCase();

    if (!emailLimpo) {
      setErro("Digite seu e-mail.");
      return;
    }

    setCarregando(true);
    setErro("");

    const { error } = await supabase.auth.signInWithOtp({
      email: emailLimpo,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error(error);
      setErro(
        "Este e-mail não está autorizado ou não foi possível enviar o acesso."
      );
      setCarregando(false);
      return;
    }

    setEnviado(true);
    setCarregando(false);
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <span className="login-kicker">DOCE ENCANTO</span>

        {!enviado ? (
          <>
            <h1>Acesso ao sistema</h1>

            <p className="login-description">
              Digite seu e-mail para receber o link de acesso ao Doce Encanto.
            </p>

            <form onSubmit={enviarLink}>
              <div className="form-group">
                <label htmlFor="email">E-mail</label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  placeholder="Digite seu e-mail"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {erro && <div className="form-error">{erro}</div>}

              <button
                type="submit"
                className="login-button"
                disabled={carregando}
              >
                {carregando ? "Enviando..." : "Enviar acesso"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Confira seu e-mail</h1>

            <div className="login-success">
              Link de acesso enviado com sucesso.
            </div>

            <p className="login-description">
              Enviamos um link para:
              <br />
              <strong>{email}</strong>
            </p>

            <p className="login-description">
              Abra o e-mail e toque em <strong>Entrar</strong>.
              Você será levado automaticamente ao Doce Encanto.
            </p>

            <button
              type="button"
              className="login-secondary-button"
              onClick={() => {
                setEnviado(false);
                setErro("");
              }}
            >
              Usar outro e-mail
            </button>
          </>
        )}
      </section>
    </main>
  );
}
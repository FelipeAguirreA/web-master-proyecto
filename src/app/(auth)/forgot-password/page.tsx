"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, KeyRound, Sparkles } from "lucide-react";

type Status = "idle" | "loading" | "sent";

function AmbientMesh() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -top-32 -left-24 h-[560px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(255,181,124,0.38),transparent_72%)] blur-[60px]" />
      <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,82,0.3),transparent_70%)] blur-[60px]" />
      <div className="absolute -bottom-32 left-1/3 h-[500px] w-[500px] rounded-full bg-[radial-gradient(closest-side,rgba(255,220,180,0.28),transparent_72%)] blur-[70px]" />
      {/* dot grid — static pattern, no token equivalent */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage: "radial-gradient(#000 0.6px, transparent 0.6px)",
          backgroundSize: "3px 3px",
        }}
      />
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("El correo es obligatorio.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingresá un correo válido.");
      return;
    }

    setStatus("loading");
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setStatus("sent");
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
      setStatus("idle");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-text">
      <AmbientMesh />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-[17px] font-bold tracking-[-0.02em] text-text no-underline transition-opacity hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hi text-[13px] text-white shadow-[0_4px_12px_-2px_var(--color-accent)/0.4]">
            P
          </span>
          Practi
          <span className="bg-gradient-to-r from-accent to-accent-hi bg-clip-text text-transparent">
            X
          </span>
        </Link>

        <div className="w-full max-w-[440px]">
          <div className="rounded-[20px] border border-border bg-surface p-5 shadow-[0_12px_40px_-12px_rgba(20,15,10,0.12),0_2px_8px_-2px_rgba(20,15,10,0.04)] sm:rounded-[24px] sm:p-8">
            {status === "sent" ? (
              <div className="space-y-5 py-2 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-bg to-amber shadow-[0_8px_20px_-6px_var(--color-amber)/0.5]">
                  <Mail className="h-8 w-8 text-white" strokeWidth={2.2} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text">
                    Revisá tu correo
                  </h1>
                  <p className="mx-auto max-w-[340px] text-[13.5px] leading-[1.6] text-muted">
                    Si el correo está registrado como cuenta empresa, recibirás
                    las instrucciones para restablecer tu contraseña en los
                    próximos minutos.
                  </p>
                </div>

                <div className="rounded-2xl border border-accent-bdr bg-gradient-to-br from-accent-bg to-accent-lo/40 p-4 text-left">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface">
                      <Sparkles
                        className="h-3.5 w-3.5 text-accent"
                        strokeWidth={2.4}
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                        Tip PractiX
                      </p>
                      <p className="text-[12.5px] leading-[1.55] text-text">
                        El enlace expira en 1 hora. Si no lo ves en la bandeja
                        de entrada, revisa la carpeta de spam.
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 pt-2 text-[13px] font-semibold text-muted no-underline transition-colors hover:text-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al login
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-hi shadow-[0_8px_20px_-6px_var(--color-accent)/0.45]">
                    <KeyRound
                      className="h-7 w-7 text-white"
                      strokeWidth={2.2}
                    />
                  </div>
                  <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text">
                    Olvidé mi contraseña
                  </h1>
                  <p className="mx-auto mt-1.5 max-w-[340px] text-[13.5px] leading-[1.55] text-muted">
                    Ingresá el correo de tu cuenta empresa y te enviamos un
                    enlace para crear una nueva contraseña.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="forgot-password-email"
                      className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
                    >
                      Correo corporativo
                    </label>
                    <input
                      id="forgot-password-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="empresa@correo.com"
                      disabled={status === "loading"}
                      aria-invalid={!!error}
                      aria-describedby={error ? "fp-email-error" : undefined}
                      className={
                        error
                          ? "w-full rounded-xl border border-rose/30 bg-rose-bg/50 px-4 py-3 text-base text-text placeholder:text-subtle focus:border-rose focus:outline-none focus:shadow-[0_0_0_4px_var(--color-rose)/0.08] sm:text-[14px] transition-all"
                          : "w-full rounded-xl border border-transparent bg-bg px-4 py-3 text-base text-text placeholder:text-subtle hover:border-border focus:border-accent/40 focus:bg-surface focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent)/0.08] sm:text-[14px] transition-all"
                      }
                    />
                    {error && (
                      <p
                        id="fp-email-error"
                        className="mt-1.5 text-[12px] font-medium text-rose"
                      >
                        {error}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-hi px-4 py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-6px_var(--color-accent)/0.5] transition-all hover:shadow-[0_12px_28px_-8px_var(--color-accent)/0.6] hover:from-accent hover:to-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === "loading" ? (
                      <>
                        <span className="h-4 w-4 animate-[auth-spin_0.9s_linear_infinite] rounded-full border-2 border-white/40 border-t-white" />
                        Enviando…
                      </>
                    ) : (
                      <>Enviar instrucciones</>
                    )}
                  </button>
                </form>

                <div className="mt-6 border-t border-border pt-5 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted no-underline transition-colors hover:text-accent"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver al login
                  </Link>
                </div>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-[11.5px] text-subtle">
            © {new Date().getFullYear()} PractiX · Hecho con cuidado en Chile
          </p>
        </div>
      </div>
    </div>
  );
}

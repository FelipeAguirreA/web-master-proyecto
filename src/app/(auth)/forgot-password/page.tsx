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
      <div className="absolute -top-32 -left-24 w-[560px] h-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(255,181,124,0.38),transparent_72%)] blur-[60px]" />
      <div className="absolute top-1/3 -right-24 w-[520px] h-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,82,0.3),transparent_70%)] blur-[60px]" />
      <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full bg-[radial-gradient(closest-side,rgba(255,220,180,0.28),transparent_72%)] blur-[70px]" />
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
    <div
      className="min-h-screen bg-[#FAFAF8] text-[#0A0909] relative overflow-hidden"
      style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
    >
      <AmbientMesh />

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-10">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-[17px] font-bold tracking-[-0.02em] text-[#0A0909] hover:opacity-80 transition-opacity"
        >
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] flex items-center justify-center text-white text-[13px] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.4)]">
            P
          </span>
          Practi
          <span className="bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] bg-clip-text text-transparent">
            X
          </span>
        </Link>

        <div className="w-full max-w-[440px]">
          <div className="bg-white rounded-[24px] border border-black/[0.06] shadow-[0_12px_40px_-12px_rgba(20,15,10,0.12),0_2px_8px_-2px_rgba(20,15,10,0.04)] p-8">
            {status === "sent" ? (
              <div className="text-center space-y-5 py-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#FFE9B3] to-[#FFC84A] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(255,180,74,0.5)]">
                  <Mail className="w-8 h-8 text-white" strokeWidth={2.2} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#0A0909]">
                    Revisá tu correo
                  </h1>
                  <p className="text-[13.5px] text-[#6D6A63] leading-[1.6] max-w-[340px] mx-auto">
                    Si el correo está registrado como cuenta empresa, recibirás
                    las instrucciones para restablecer tu contraseña en los
                    próximos minutos.
                  </p>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-[#FFF3EC] to-[#FFE9B3]/40 border border-[#FF6A3D]/15 p-4 text-left">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles
                        className="w-3.5 h-3.5 text-[#FF6A3D]"
                        strokeWidth={2.4}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#FF6A3D] mb-1">
                        Tip PractiX
                      </p>
                      <p className="text-[12.5px] text-[#4A4843] leading-[1.55]">
                        El enlace expira en 1 hora. Si no lo ves en la bandeja
                        de entrada, revisá la carpeta de spam.
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#4A4843] hover:text-[#FF6A3D] transition-colors pt-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al login
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(255,106,61,0.45)] mb-4">
                    <KeyRound
                      className="w-7 h-7 text-white"
                      strokeWidth={2.2}
                    />
                  </div>
                  <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#0A0909]">
                    Olvidé mi contraseña
                  </h1>
                  <p className="text-[13.5px] text-[#6D6A63] mt-1.5 leading-[1.55] max-w-[340px] mx-auto">
                    Ingresá el correo de tu cuenta empresa y te enviamos un
                    enlace para crear una nueva contraseña.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6D6A63] mb-2">
                      Correo corporativo
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="empresa@correo.com"
                      disabled={status === "loading"}
                      className={
                        error
                          ? "w-full rounded-xl px-4 py-3 text-[14px] bg-[#FFF0ED] border border-[#FF6A3D]/30 focus:outline-none focus:border-[#FF6A3D] focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]"
                          : "w-full rounded-xl px-4 py-3 text-[14px] bg-[#FAFAF8] border border-transparent hover:border-black/[0.05] focus:outline-none focus:border-[#FF6A3D]/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]"
                      }
                    />
                    {error && (
                      <p className="mt-1.5 text-[12px] text-[#E24B2C] font-medium">
                        {error}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="group w-full bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white py-3.5 rounded-xl font-semibold text-[14px] shadow-[0_8px_20px_-6px_rgba(255,106,61,0.5)] hover:shadow-[0_12px_28px_-8px_rgba(255,106,61,0.6)] hover:from-[#FF5A28] hover:to-[#FF8A52] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {status === "loading" ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Enviando…
                      </>
                    ) : (
                      <>
                        Enviar instrucciones
                        <span className="transition-transform group-hover:translate-x-0.5">
                          →
                        </span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-black/[0.05] text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6D6A63] hover:text-[#FF6A3D] transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Volver al login
                  </Link>
                </div>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-[11.5px] text-[#9B9891]">
            © {new Date().getFullYear()} PractiX · Hecho con cuidado en Chile
          </p>
        </div>
      </div>
    </div>
  );
}

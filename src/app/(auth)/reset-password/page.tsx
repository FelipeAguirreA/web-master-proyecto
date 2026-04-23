"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ["", "Débil", "Regular", "Buena", "Fuerte"];
const STRENGTH_TEXT = [
  "",
  "text-[#FF6565]",
  "text-[#FFA15F]",
  "text-[#FFBD2E]",
  "text-[#1A8F3C]",
];
const STRENGTH_BAR = [
  "",
  "bg-[#FF6565]",
  "bg-[#FFA15F]",
  "bg-[#FFBD2E]",
  "bg-[#1A8F3C]",
];

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

const INPUT_BASE =
  "w-full rounded-xl px-4 py-3 pr-11 text-[14px] bg-[#FAFAF8] border border-transparent hover:border-black/[0.05] focus:outline-none focus:border-[#FF6A3D]/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]";
const INPUT_ERROR =
  "w-full rounded-xl px-4 py-3 pr-11 text-[14px] bg-[#FFF0ED] border border-[#FF6A3D]/30 focus:outline-none focus:border-[#FF6A3D] focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]";
const LABEL_CLS =
  "block text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6D6A63] mb-2";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = passwordStrength(password);

  if (!token) {
    return (
      <div className="text-center space-y-5 py-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#FFCDCD] to-[#FF6B6B] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(255,107,107,0.45)]">
          <AlertTriangle className="w-8 h-8 text-white" strokeWidth={2.2} />
        </div>
        <div className="space-y-2">
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#0A0909]">
            Enlace inválido
          </h2>
          <p className="text-[13.5px] text-[#6D6A63] leading-[1.6] max-w-[320px] mx-auto">
            El enlace está incompleto o ya expiró. Solicitá uno nuevo desde la
            página de recuperación.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#FF6A3D] hover:text-[#FF5A28] transition-colors"
        >
          Solicitar un nuevo enlace →
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (strength < 4) {
      setError("La contraseña no cumple los requisitos de seguridad.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al restablecer la contraseña.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-5 py-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#D3E9C7] to-[#1A8F3C] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(26,143,60,0.45)]">
          <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2.2} />
        </div>
        <div className="space-y-2">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#0A0909]">
            ¡Contraseña actualizada!
          </h2>
          <p className="text-[13.5px] text-[#6D6A63] leading-[1.6] max-w-[320px] mx-auto">
            Tu contraseña fue cambiada correctamente. Te estamos redirigiendo al
            login…
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="w-4 h-4 border-2 border-[#FF6A3D]/30 border-t-[#FF6A3D] rounded-full animate-spin" />
          <Link
            href="/login"
            className="text-[13px] font-semibold text-[#FF6A3D] hover:text-[#FF5A28] transition-colors"
          >
            Ir al login ahora →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(255,106,61,0.45)] mb-4">
          <ShieldCheck className="w-7 h-7 text-white" strokeWidth={2.2} />
        </div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#0A0909]">
          Nueva contraseña
        </h1>
        <p className="text-[13.5px] text-[#6D6A63] mt-1.5 leading-[1.55] max-w-[340px] mx-auto">
          Elegí una contraseña segura para tu cuenta empresa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={LABEL_CLS}>Nueva contraseña</label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
              className={INPUT_BASE}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9891] hover:text-[#4A4843] transition-colors"
              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPwd ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {password.length > 0 && (
            <div className="mt-3 space-y-2.5">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      strength >= i ? STRENGTH_BAR[strength] : "bg-[#F4F3EF]"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p
                  className={`text-[11.5px] font-semibold ${STRENGTH_TEXT[strength]}`}
                >
                  {STRENGTH_LABELS[strength]}
                </p>
                <p className="text-[10.5px] text-[#9B9891] tracking-[0.04em] uppercase">
                  {strength}/4
                </p>
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                {[
                  [password.length >= 8, "8+ caracteres"],
                  [/[A-Z]/.test(password), "Una mayúscula"],
                  [/[0-9]/.test(password), "Un número"],
                  [/[^A-Za-z0-9]/.test(password), "Un símbolo"],
                ].map(([ok, label]) => (
                  <li
                    key={label as string}
                    className={`text-[11.5px] flex items-center gap-1.5 ${
                      ok ? "text-[#1A8F3C] font-medium" : "text-[#9B9891]"
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold ${
                        ok
                          ? "bg-[#E7F8EA] text-[#1A8F3C]"
                          : "bg-[#F4F3EF] text-[#C9C6BF]"
                      }`}
                    >
                      {ok ? "✓" : "·"}
                    </span>
                    {label as string}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <label className={LABEL_CLS}>Confirmar contraseña</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repetí tu contraseña"
              disabled={loading}
              className={
                confirm && confirm !== password ? INPUT_ERROR : INPUT_BASE
              }
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9891] hover:text-[#4A4843] transition-colors"
              aria-label={
                showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {confirm && confirm !== password && (
            <p className="mt-1.5 text-[12px] text-[#E24B2C] font-medium">
              Las contraseñas no coinciden.
            </p>
          )}
          {confirm && confirm === password && strength === 4 && (
            <p className="mt-1.5 text-[12px] text-[#1A8F3C] font-medium inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Listo, coinciden.
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-[#FFF0ED] border border-[#FF6A3D]/20 px-4 py-3 text-[12.5px] text-[#A63418] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF6A3D]" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || strength < 4 || password !== confirm}
          className="group w-full bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white py-3.5 rounded-xl font-semibold text-[14px] shadow-[0_8px_20px_-6px_rgba(255,106,61,0.5)] hover:shadow-[0_12px_28px_-8px_rgba(255,106,61,0.6)] hover:from-[#FF5A28] hover:to-[#FF8A52] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Actualizando…
            </>
          ) : (
            <>
              Actualizar contraseña
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      className="min-h-screen bg-[#FAFAF8] text-[#0A0909] relative overflow-hidden"
      style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
    >
      <AmbientMesh />

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-10">
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
          <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-black/[0.06] shadow-[0_12px_40px_-12px_rgba(20,15,10,0.12),0_2px_8px_-2px_rgba(20,15,10,0.04)] p-5 sm:p-8">
            <Suspense
              fallback={
                <div className="h-40 flex items-center justify-center">
                  <div className="w-7 h-7 border-2 border-[#FF6A3D]/30 border-t-[#FF6A3D] rounded-full animate-spin" />
                </div>
              }
            >
              <ResetPasswordForm />
            </Suspense>
          </div>

          <p className="mt-6 text-center text-[11.5px] text-[#9B9891]">
            © {new Date().getFullYear()} PractiX · Hecho con cuidado en Chile
          </p>
        </div>
      </div>
    </div>
  );
}

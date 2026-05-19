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

/* Bar and text colors map to @theme tokens:
   1 = rose (weak), 2 = amber (regular), 3 = amber (good), 4 = green (strong) */
const STRENGTH_TEXT = [
  "",
  "text-rose",
  "text-amber",
  "text-amber",
  "text-green",
];
const STRENGTH_BAR = ["", "bg-rose", "bg-amber", "bg-amber", "bg-green"];

function AmbientMesh() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -top-32 -left-24 h-[560px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(255,181,124,0.38),transparent_72%)] blur-[60px]" />
      <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,82,0.3),transparent_70%)] blur-[60px]" />
      <div className="absolute -bottom-32 left-1/3 h-[500px] w-[500px] rounded-full bg-[radial-gradient(closest-side,rgba(255,220,180,0.28),transparent_72%)] blur-[70px]" />
      {/* dot grid — static decorative pattern */}
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
  "w-full rounded-xl border border-transparent bg-bg px-4 py-3 pr-11 text-base text-text placeholder:text-subtle hover:border-border focus:border-accent/40 focus:bg-surface focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent)/0.08] sm:text-[14px] transition-all";
const INPUT_ERROR =
  "w-full rounded-xl border border-rose/30 bg-rose-bg/50 px-4 py-3 pr-11 text-base text-text placeholder:text-subtle focus:border-rose focus:outline-none focus:shadow-[0_0_0_4px_var(--color-rose)/0.08] sm:text-[14px] transition-all";
const LABEL_CLS =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted";

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
      <div className="space-y-5 py-2 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-bg to-rose shadow-[0_8px_20px_-6px_var(--color-rose)/0.45]">
          <AlertTriangle className="h-8 w-8 text-white" strokeWidth={2.2} />
        </div>
        <div className="space-y-2">
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-text">
            Enlace inválido
          </h2>
          <p className="mx-auto max-w-[320px] text-[13.5px] leading-[1.6] text-muted">
            El enlace está incompleto o ya expiró. Solicitá uno nuevo desde la
            página de recuperación.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent no-underline transition-colors hover:opacity-75"
        >
          Solicitar un nuevo enlace
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
      <div className="space-y-5 py-2 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-bg to-green shadow-[0_8px_20px_-6px_var(--color-green)/0.45]">
          <CheckCircle2 className="h-8 w-8 text-white" strokeWidth={2.2} />
        </div>
        <div className="space-y-2">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-text">
            ¡Contraseña actualizada!
          </h2>
          <p className="mx-auto max-w-[320px] text-[13.5px] leading-[1.6] text-muted">
            Tu contraseña fue cambiada correctamente. Te estamos redirigiendo al
            login…
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="h-4 w-4 animate-[auth-spin_0.9s_linear_infinite] rounded-full border-2 border-accent/30 border-t-accent" />
          <Link
            href="/login"
            className="text-[13px] font-semibold text-accent no-underline transition-opacity hover:opacity-75"
          >
            Ir al login ahora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-hi shadow-[0_8px_20px_-6px_var(--color-accent)/0.45]">
          <ShieldCheck className="h-7 w-7 text-white" strokeWidth={2.2} />
        </div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text">
          Nueva contraseña
        </h1>
        <p className="mx-auto mt-1.5 max-w-[340px] text-[13.5px] leading-[1.55] text-muted">
          Elegí una contraseña segura para tu cuenta empresa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="reset-password-new" className={LABEL_CLS}>
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="reset-password-new"
              name="password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
              className={INPUT_BASE}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle transition-colors hover:text-text"
              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPwd ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
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
                      strength >= i ? STRENGTH_BAR[strength] : "bg-faint"
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
                <p className="text-[10.5px] uppercase tracking-[0.04em] text-subtle">
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
                    className={`flex items-center gap-1.5 text-[11.5px] ${
                      ok ? "font-medium text-green" : "text-subtle"
                    }`}
                  >
                    <span
                      className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold ${
                        ok ? "bg-green-bg text-green" : "bg-faint/50 text-faint"
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
          <label htmlFor="reset-password-confirm" className={LABEL_CLS}>
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              id="reset-password-confirm"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repetí tu contraseña"
              disabled={loading}
              aria-invalid={!!(confirm && confirm !== password)}
              className={
                confirm && confirm !== password ? INPUT_ERROR : INPUT_BASE
              }
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle transition-colors hover:text-text"
              aria-label={
                showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {confirm && confirm !== password && (
            <p className="mt-1.5 text-[12px] font-medium text-rose">
              Las contraseñas no coinciden.
            </p>
          )}
          {confirm && confirm === password && strength === 4 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-green">
              <CheckCircle2 className="h-3.5 w-3.5" /> Listo, coinciden.
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose/20 bg-rose-bg px-4 py-3 text-[12.5px] text-rose"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || strength < 4 || password !== confirm}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-hi px-4 py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-6px_var(--color-accent)/0.5] transition-all hover:shadow-[0_12px_28px_-8px_var(--color-accent)/0.6] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-[auth-spin_0.9s_linear_infinite] rounded-full border-2 border-white/40 border-t-white" />
              Actualizando…
            </>
          ) : (
            <>Actualizar contraseña</>
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-text">
      <AmbientMesh />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
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
            <Suspense
              fallback={
                <div className="flex h-40 items-center justify-center">
                  <div className="h-7 w-7 animate-[auth-spin_0.9s_linear_infinite] rounded-full border-2 border-accent/30 border-t-accent" />
                </div>
              }
            >
              <ResetPasswordForm />
            </Suspense>
          </div>

          <p className="mt-6 text-center text-[11.5px] text-subtle">
            © {new Date().getFullYear()} PractiX · Hecho con cuidado en Chile
          </p>
        </div>
      </div>
    </div>
  );
}

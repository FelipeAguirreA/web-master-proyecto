"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ["", "Débil", "Regular", "Buena", "Fuerte"];
const STRENGTH_COLORS = [
  "",
  "text-red-600",
  "text-yellow-600",
  "text-amber-500",
  "text-green-600",
];
const BAR_COLORS = [
  "",
  "bg-red-400",
  "bg-yellow-400",
  "bg-amber-400",
  "bg-green-500",
];

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
      <div className="text-center space-y-3">
        <p className="text-sm text-red-600 font-semibold">
          Enlace inválido o incompleto.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-brand-600 hover:underline"
        >
          Solicitá un nuevo enlace
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
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
          ¡Contraseña actualizada!
        </h2>
        <p className="text-sm text-gray-500">
          Tu contraseña fue cambiada correctamente. Te redirigimos al login en
          unos segundos…
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-brand-600 hover:underline"
        >
          Ir al login ahora
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
          Nueva contraseña
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Elegí una contraseña segura para tu cuenta empresa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nueva contraseña */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-brand-400 focus:bg-white transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Barra de fuerza */}
          {password.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      strength >= i ? BAR_COLORS[strength] : "bg-gray-100"
                    }`}
                  />
                ))}
              </div>
              <p
                className={`text-xs font-semibold ${STRENGTH_COLORS[strength]}`}
              >
                {STRENGTH_LABELS[strength]}
              </p>
              <ul className="text-[11px] text-gray-400 space-y-0.5">
                {[
                  [password.length >= 8, "Mínimo 8 caracteres"],
                  [/[A-Z]/.test(password), "Una mayúscula"],
                  [/[0-9]/.test(password), "Un número"],
                  [/[^A-Za-z0-9]/.test(password), "Un símbolo"],
                ].map(([ok, label]) => (
                  <li
                    key={label as string}
                    className={ok ? "text-green-600" : "text-gray-400"}
                  >
                    {ok ? "✓" : "·"} {label as string}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repetí tu contraseña"
              disabled={loading}
              className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none transition-colors ${
                confirm && confirm !== password
                  ? "border-red-300 bg-red-50 focus:border-red-400"
                  : "border-gray-200 bg-gray-50 focus:border-brand-400 focus:bg-white"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {confirm && confirm !== password && (
            <p className="mt-1.5 text-xs text-red-600">
              Las contraseñas no coinciden.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || strength < 4 || password !== confirm}
          className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#eeeef8] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-black tracking-tight">
            <span className="text-brand-700">Practi</span>
            <span className="text-accent-500">X</span>
          </span>
        </div>
        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

type Status = "idle" | "loading" | "sent";

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
      // Siempre mostrar éxito — no revelar si el email existe
      setStatus("sent");
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-[#eeeef8] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-black tracking-tight">
            <span className="text-brand-700">Practi</span>
            <span className="text-accent-500">X</span>
          </span>
        </div>

        {status === "sent" ? (
          /* Estado de éxito */
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Revisá tu correo
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Si el correo está registrado como cuenta empresa, recibirás las
              instrucciones para restablecer tu contraseña en los próximos
              minutos.
            </p>
            <p className="text-xs text-gray-400">
              El enlace expira en 1 hora. Revisá la carpeta de spam si no lo
              encontrás.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
          </div>
        ) : (
          /* Formulario */
          <>
            <div className="mb-6">
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Olvidé mi contraseña
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Ingresá el correo de tu cuenta empresa y te enviamos un enlace
                para crear una nueva contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Correo corporativo
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="empresa@correo.com"
                  disabled={status === "loading"}
                  className={`w-full border rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none ${
                    error
                      ? "border-red-300 bg-red-50 focus:border-red-400"
                      : "border-gray-200 bg-gray-50 focus:border-brand-400 focus:bg-white"
                  }`}
                />
                {error && (
                  <p className="mt-1.5 text-xs text-red-600">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "Enviando..." : "Enviar instrucciones"}
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver al login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

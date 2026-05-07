"use client";

import { useState } from "react";
import Link from "next/link";

import { useConsent, writeConsent } from "@/lib/cookie-consent";

export default function CookieConsent() {
  const consent = useConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(true);

  if (consent !== null) return null;

  const acceptAll = () => writeConsent(true);
  const onlyEssential = () => writeConsent(false);
  const saveCustom = () => writeConsent(analyticsChoice);

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-2xl rounded-2xl border border-black/[0.06] bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] p-5 sm:p-6">
        <h2
          id="cookie-consent-title"
          className="text-[15px] font-semibold text-[#0A0909]"
        >
          Cookies y privacidad
        </h2>
        <p
          id="cookie-consent-description"
          className="mt-1.5 text-[13px] leading-[1.55] text-[#4A4843]"
        >
          PractiX usa cookies estrictamente necesarias para tu sesión y, con tu
          permiso, métricas anónimas para mejorar el servicio. Podés cambiar tu
          decisión cuando quieras desde la{" "}
          <Link
            href="/privacidad"
            className="text-[#FF6A3D] font-medium hover:underline"
          >
            política de privacidad
          </Link>
          .
        </p>

        {showDetails && (
          <div className="mt-4 space-y-3 rounded-xl bg-[#FAF8F4] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-[#0A0909]">
                  Estrictamente necesarias
                </p>
                <p className="text-[12px] text-[#6D6A63] mt-0.5 leading-[1.5]">
                  Sesión, autenticación, CSRF. Sin esto la plataforma no
                  funciona.
                </p>
              </div>
              <span className="text-[11.5px] font-semibold text-[#1A8F3C]">
                Siempre activas
              </span>
            </div>
            <hr className="border-black/[0.05]" />
            <label className="flex items-start justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-[13px] font-semibold text-[#0A0909]">
                  Analítica anónima
                </p>
                <p className="text-[12px] text-[#6D6A63] mt-0.5 leading-[1.5]">
                  Vercel Analytics y Speed Insights — métricas agregadas de uso
                  y performance, sin identificación personal.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analyticsChoice}
                onChange={(e) => setAnalyticsChoice(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#E5E1D8] text-[#FF6A3D] focus:ring-2 focus:ring-[#FF6A3D]/20 cursor-pointer"
              />
            </label>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            className="text-[12.5px] text-[#6D6A63] hover:text-[#0A0909] transition-colors sm:mr-auto"
          >
            {showDetails ? "Ocultar detalles" : "Personalizar"}
          </button>
          {showDetails ? (
            <button
              type="button"
              onClick={saveCustom}
              className="px-4 py-2 rounded-lg bg-[#0A0909] text-white text-[12.5px] font-semibold hover:bg-[#1F1D1A] transition-colors"
            >
              Guardar elección
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onlyEssential}
                className="px-4 py-2 rounded-lg border border-black/[0.08] text-[12.5px] font-semibold text-[#0A0909] hover:bg-[#FAF8F4] transition-colors"
              >
                Solo esenciales
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="px-4 py-2 rounded-lg bg-[#FF6A3D] text-white text-[12.5px] font-semibold hover:bg-[#E85A2D] transition-colors"
              >
                Aceptar todas
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

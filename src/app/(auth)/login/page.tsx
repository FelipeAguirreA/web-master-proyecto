"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "student";
  const isCompany = role === "company";

  const callbackUrl = isCompany
    ? "/dashboard/empresa"
    : "/dashboard/estudiante";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <Link href="/" className="font-bold text-2xl tracking-tight mb-8">
        <span className="text-brand-700">Practi</span>
        <span className="text-accent-500">X</span>
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isCompany ? "Portal Empresas" : "Bienvenido"}
          </h1>
          <p className="text-sm text-gray-500">
            {isCompany
              ? "Gestioná tus prácticas y encontrá los mejores candidatos"
              : "Encontrá la práctica ideal para tu perfil con IA"}
          </p>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continuar con Google
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Al continuar aceptás nuestros términos de uso y política de privacidad.
        </p>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        {isCompany ? (
          <>
            ¿Sos estudiante?{" "}
            <Link href="/login?role=student" className="text-brand-600 hover:underline">
              Ingresá aquí
            </Link>
          </>
        ) : (
          <>
            ¿Sos empresa?{" "}
            <Link href="/login?role=company" className="text-brand-600 hover:underline">
              Ingresá aquí
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

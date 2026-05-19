"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RoleToggle } from "@/components/auth/RoleToggle";
import { StudentLogin } from "@/components/auth/StudentLogin";
import { CompanyLogin } from "@/components/auth/CompanyLogin";
import { CompanyRegister } from "@/components/auth/CompanyRegister";
import { RegistroExitoso } from "@/components/auth/RegistroExitoso";

type Mode = "login" | "register";
type Role = "student" | "company";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 no-underline">
      <div className="flex h-7 w-7 items-center justify-center rounded-[28%] bg-gradient-to-br from-accent to-accent-hi text-[12px] font-extrabold text-white shadow-[0_6px_18px_var(--color-accent)/0.33]">
        P
      </div>
      <span className="text-[14.5px] font-extrabold tracking-tight text-text">
        PractiX
      </span>
    </Link>
  );
}

function getTitle(mode: Mode, role: Role): string {
  if (mode === "login") {
    return role === "student"
      ? "Bienvenido de vuelta 👋"
      : "Entrar como empresa";
  }
  return role === "student"
    ? "Crea tu cuenta y postula hoy"
    : "Publica tu primera práctica";
}

function getSubtitle(mode: Mode, role: Role): string {
  if (mode === "login") {
    return "Sigue tus postulaciones, entrevistas y matches en un solo lugar.";
  }
  return role === "student"
    ? "Te ayudamos con CV, entrevistas y prácticas que calzan con tu carrera."
    : "Recibe postulantes filtrados por match, no por currículum.";
}

function LoginContent() {
  const searchParams = useSearchParams();
  const initialRole: Role =
    searchParams.get("role") === "company" ? "company" : "student";
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>(initialRole);
  const [registered, setRegistered] = useState(false);

  const showStudentForm = role === "student";
  const showCompanyLogin = role === "company" && mode === "login";
  const showCompanyRegister = role === "company" && mode === "register";

  return (
    <div className="flex min-h-screen flex-col bg-bg font-[var(--font-onest),ui-sans-serif,system-ui] text-text">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-border px-6 py-6 sm:px-8">
        <Logo />
        <Link
          href="/"
          className="text-[13px] font-semibold text-muted no-underline transition-opacity hover:opacity-75"
        >
          ← Volver al sitio
        </Link>
      </nav>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12 [background:radial-gradient(ellipse_at_top,var(--color-accent-bg),transparent_60%),var(--color-bg)]">
        <div className="w-full max-w-[480px] rounded-[20px] border border-border bg-surface p-6 shadow-[0_30px_80px_-30px_rgba(10,9,9,0.18),0_8px_22px_-10px_rgba(10,9,9,0.08)] sm:rounded-[24px] sm:p-8 md:p-9">
          {registered ? (
            <RegistroExitoso
              onContinue={() => {
                setRegistered(false);
                setMode("login");
              }}
            />
          ) : (
            <div className="flex flex-col gap-[18px]">
              <header className="flex flex-col gap-2.5">
                <div className="flex justify-center">
                  <RoleToggle
                    role={role}
                    onChange={(r) => {
                      setRole(r);
                      setMode("login");
                    }}
                  />
                </div>
                <h1 className="mt-2 text-balance text-[clamp(1.55rem,3vw,2rem)] font-extrabold leading-[1.1] tracking-[-1.2px] text-text">
                  {getTitle(mode, role)}
                </h1>
                <p className="text-sm leading-[1.55] text-muted">
                  {getSubtitle(mode, role)}
                </p>
              </header>

              {showStudentForm && <StudentLogin callbackUrl={callbackUrl} />}
              {showCompanyLogin && <CompanyLogin callbackUrl={callbackUrl} />}
              {showCompanyRegister && (
                <CompanyRegister onSuccess={() => setRegistered(true)} />
              )}

              <p className="mt-1 text-[13px] text-center text-muted">
                {role === "student" ? (
                  <>
                    ¿Representas una empresa?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setRole("company");
                        setMode("login");
                      }}
                      className="border-none bg-transparent p-0 text-[13px] font-extrabold text-accent"
                    >
                      Acceder como empresa
                    </button>
                  </>
                ) : mode === "login" ? (
                  <>
                    ¿Aún no tienes cuenta?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className="border-none bg-transparent p-0 text-[13px] font-extrabold text-accent"
                    >
                      Registra tu empresa
                    </button>
                  </>
                ) : (
                  <>
                    ¿Ya tienes cuenta?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="border-none bg-transparent p-0 text-[13px] font-extrabold text-accent"
                    >
                      Inicia sesión
                    </button>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-center gap-3.5 px-6 py-5 text-[11.5px] text-subtle sm:px-8">
        <span>© {new Date().getFullYear()} PractiX</span>
        <Link
          href="/privacidad"
          className="text-subtle no-underline transition-opacity hover:opacity-75"
        >
          Privacidad
        </Link>
        <Link
          href="/terminos"
          className="text-subtle no-underline transition-opacity hover:opacity-75"
        >
          Términos
        </Link>
        <a
          href="mailto:soporte@practix.cl"
          className="text-subtle no-underline transition-opacity hover:opacity-75"
        >
          Ayuda
        </a>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg">
          <div className="h-8 w-8 animate-[auth-spin_0.9s_linear_infinite] rounded-full border-2 border-accent/[0.25] border-t-accent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

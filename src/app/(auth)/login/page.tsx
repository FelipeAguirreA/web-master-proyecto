"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { A } from "@/components/auth/tokens";
import { RoleToggle } from "@/components/auth/RoleToggle";
import { StudentLogin } from "@/components/auth/StudentLogin";
import { CompanyLogin } from "@/components/auth/CompanyLogin";
import { CompanyRegister } from "@/components/auth/CompanyRegister";
import { RegistroExitoso } from "@/components/auth/RegistroExitoso";

type Mode = "login" | "register";
type Role = "student" | "company";

function Logo({
  size = 28,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <Link
      href="/"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        textDecoration: "none",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: `linear-gradient(135deg,${A.accent},${A.accentHi})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: size * 0.44,
          color: "#fff",
          boxShadow: `0 6px 18px ${A.accent}55`,
        }}
      >
        P
      </div>
      <span
        style={{
          fontWeight: 800,
          fontSize: size * 0.52,
          color: light ? "#fff" : A.text,
          letterSpacing: -0.5,
        }}
      >
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

  // Estudiantes no tienen form de registro: signIn con Google crea la cuenta
  // automáticamente. Si están en mode=register como student, mostramos el Google
  // login igual; el headline solo cambia para reflejar la intención de "crear".
  const showStudentForm = role === "student";
  const showCompanyLogin = role === "company" && mode === "login";
  const showCompanyRegister = role === "company" && mode === "register";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: A.bg,
        color: A.text,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-onest), ui-sans-serif, system-ui",
      }}
    >
      <nav
        style={{
          padding: "24px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${A.border}`,
        }}
      >
        <Logo size={28} />
        <Link
          href="/"
          style={{
            fontSize: 13,
            color: A.muted,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ← Volver al sitio
        </Link>
      </nav>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          background: `radial-gradient(ellipse at top, ${A.accentBg}, transparent 60%), ${A.bg}`,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: A.surface,
            border: `1px solid ${A.border}`,
            borderRadius: 24,
            padding: "40px 36px",
            boxShadow:
              "0 30px 80px -30px rgba(10,9,9,.18), 0 8px 22px -10px rgba(10,9,9,.08)",
          }}
          className="practix-auth-card"
        >
          {registered ? (
            <RegistroExitoso
              onContinue={() => {
                setRegistered(false);
                setMode("login");
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <header
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <RoleToggle
                    role={role}
                    onChange={(r) => {
                      setRole(r);
                      setMode("login");
                    }}
                  />
                </div>
                <h1
                  style={{
                    fontSize: "clamp(1.55rem,3vw,2rem)",
                    fontWeight: 800,
                    letterSpacing: -1.2,
                    color: A.text,
                    lineHeight: 1.1,
                    marginTop: 8,
                    textWrap: "balance",
                  }}
                >
                  {getTitle(mode, role)}
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: A.muted,
                    lineHeight: 1.55,
                  }}
                >
                  {getSubtitle(mode, role)}
                </p>
              </header>

              {showStudentForm && <StudentLogin callbackUrl={callbackUrl} />}
              {showCompanyLogin && <CompanyLogin callbackUrl={callbackUrl} />}
              {showCompanyRegister && (
                <CompanyRegister onSuccess={() => setRegistered(true)} />
              )}

              {/* Footer link: cambia entre login/register para empresas;
                  para estudiantes solo invita a empresas si están de prestado */}
              <p
                style={{
                  fontSize: 13,
                  color: A.muted,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {role === "student" ? (
                  <>
                    ¿Representas una empresa?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setRole("company");
                        setMode("login");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 800,
                        color: A.accent,
                        padding: 0,
                        fontFamily: "inherit",
                      }}
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
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 800,
                        color: A.accent,
                        padding: 0,
                        fontFamily: "inherit",
                      }}
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
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 800,
                        color: A.accent,
                        padding: 0,
                        fontFamily: "inherit",
                      }}
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

      <footer
        style={{
          padding: "20px 32px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
          fontSize: 11.5,
          color: A.subtle,
          flexWrap: "wrap",
        }}
      >
        <span>© {new Date().getFullYear()} PractiX</span>
        <Link
          href="/privacidad"
          style={{
            color: A.subtle,
            textDecoration: "none",
          }}
        >
          Privacidad
        </Link>
        <Link
          href="/terminos"
          style={{
            color: A.subtle,
            textDecoration: "none",
          }}
        >
          Términos
        </Link>
        <a
          href="mailto:soporte@practix.cl"
          style={{
            color: A.subtle,
            textDecoration: "none",
          }}
        >
          Ayuda
        </a>
      </footer>

      <style>{`
        @media (max-width: 600px) {
          .practix-auth-card { padding: 28px 22px !important; border-radius: 18px !important; }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: A.bg,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: `2px solid ${A.accent}25`,
              borderTopColor: A.accent,
              borderRadius: "50%",
              animation: "practix-auth-spin .9s linear infinite",
            }}
          />
          <style>{`@keyframes practix-auth-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

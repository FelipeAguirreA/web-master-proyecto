"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { D } from "@/components/dashboard/palettes";
import { Icon } from "@/components/dashboard/Icon";
import { Avatar } from "@/components/dashboard/atoms/Avatar";

type CompanyStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

type Company = {
  id: string;
  companyName: string;
  empresaRut: string | null;
  companyStatus: CompanyStatus;
  industry: string | null;
  website: string | null;
  logo: string | null;
  description: string | null;
  suspensionReason: string | null;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { internships: number };
  user: {
    id: string;
    email: string;
    name: string | null;
    lastName: string | null;
    phone: string | null;
    createdAt: string;
  };
};

function CompanyLogo({
  company,
  size,
  radius,
  fontSize,
}: {
  company: Pick<Company, "companyName" | "logo">;
  size: number;
  radius: number;
  fontSize: number;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg,${D.dark},${D.accent})`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize,
        letterSpacing: -0.4,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {company.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={company.logo}
          alt={company.companyName}
          width={size}
          height={size}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        pickInitials(company.companyName)
      )}
    </span>
  );
}

// Dos categorías de "email no corporativo":
//
// PERSONAL_DOMAINS: proveedores personales (gmail, hotmail, outlook…). Cuentas
//   reales pero baja credibilidad para una empresa. Eleva el riesgo si además
//   la empresa no tiene web propia, sino queda en "medio".
//
// HIGH_RISK_DOMAINS: cuentas que NO son de personas reales — desechables
//   (mailinator, yopmail, tempmail…) que se usan para registros sin
//   compromiso, y reservados de IANA (example.*, test.com) que existen sólo
//   para documentación/pruebas. Ambos son señal fuerte de fake — riesgo alto
//   directo, independiente de la web.
const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "live.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
]);

const HIGH_RISK_DOMAINS = new Set([
  // Desechables
  "mailinator.com",
  "yopmail.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "trashmail.com",
  // Reservados de IANA (nunca cuentas reales)
  "example.com",
  "example.org",
  "example.net",
  "test.com",
]);

function getEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).toLowerCase();
}

function isHighRiskEmail(email: string): boolean {
  const d = getEmailDomain(email);
  return d !== null && HIGH_RISK_DOMAINS.has(d);
}

function isGenericEmail(email: string): boolean {
  const d = getEmailDomain(email);
  return d !== null && (PERSONAL_DOMAINS.has(d) || HIGH_RISK_DOMAINS.has(d));
}

type Risk = "low" | "medium" | "high";

function inferRisk(c: Company): { level: Risk; note: string } {
  // Desechables y reservados: alto siempre — no son cuentas humanas.
  if (isHighRiskEmail(c.user.email)) {
    return {
      level: "high",
      note: "Email desechable o de dominio reservado · alta probabilidad de cuenta fake",
    };
  }
  const personal = (() => {
    const d = getEmailDomain(c.user.email);
    return d !== null && PERSONAL_DOMAINS.has(d);
  })();
  const noWeb = !c.website || c.website.trim() === "";
  if (personal && noWeb) {
    return { level: "high", note: "Email genérico · sin web propia" };
  }
  if (personal || noWeb) {
    return {
      level: "medium",
      note: personal
        ? "Email genérico · validar identidad del contacto"
        : "Sin web propia · revisar trayectoria",
    };
  }
  return { level: "low", note: "Email corporativo · web activa" };
}

function daysWaiting(createdAtIso: string): number {
  const ms = Date.now() - new Date(createdAtIso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function pickInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function statusBadge(status: CompanyStatus): {
  label: string;
  color: string;
  bg: string;
} {
  if (status === "PENDING")
    return { label: "Pendiente revisión", color: D.amber, bg: D.amberBg };
  if (status === "APPROVED")
    return { label: "Aprobada", color: D.green, bg: D.greenBg };
  if (status === "REJECTED")
    return { label: "Rechazada", color: D.rose, bg: D.roseBg };
  return { label: "Suspendida", color: D.muted, bg: "rgba(15,23,42,.06)" };
}

type TabKey = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

const TABS: { k: TabKey; l: string; c: string }[] = [
  { k: "PENDING", l: "Pendientes", c: D.amber },
  { k: "APPROVED", l: "Aprobadas", c: D.green },
  { k: "REJECTED", l: "Rechazadas", c: D.rose },
  { k: "SUSPENDED", l: "Suspendidas", c: D.muted },
];

function SidebarAdmin({ pendingCount }: { pendingCount: number }) {
  const items = [
    {
      icon: "briefc" as const,
      label: "Empresas",
      active: true,
      badge: pendingCount > 0 ? pendingCount : null,
    },
  ];
  return (
    <aside
      style={{
        width: 232,
        background: D.surface,
        borderRight: `1px solid ${D.border}`,
        padding: "18px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "4px 6px",
          textDecoration: "none",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            background: `linear-gradient(135deg,${D.dark},${D.accent})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          P
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: D.text,
            letterSpacing: -0.3,
          }}
        >
          PractiX{" "}
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: "#fff",
              background: D.dark,
              padding: "2px 5px",
              borderRadius: 4,
              marginLeft: 3,
              letterSpacing: 0.4,
            }}
          >
            ADMIN
          </span>
        </span>
      </Link>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => (
          <span
            key={it.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "7px 10px",
              borderRadius: 9,
              color: it.active ? D.accent : D.muted,
              background: it.active ? D.accentBg : "transparent",
              fontSize: 13,
              fontWeight: it.active ? 700 : 600,
              position: "relative",
            }}
          >
            <Icon name={it.icon} size={17} color="currentColor" />
            <span style={{ flex: 1 }}>{it.label}</span>
            {it.badge ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#fff",
                  background: it.active ? D.accent : D.rose,
                  padding: "1px 6px",
                  borderRadius: 7,
                }}
              >
                {it.badge}
              </span>
            ) : null}
            {it.active && (
              <span
                style={{
                  position: "absolute",
                  left: -14,
                  top: 6,
                  bottom: 6,
                  width: 3,
                  borderRadius: "0 3px 3px 0",
                  background: D.accent,
                }}
              />
            )}
          </span>
        ))}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: "14px",
          background: `linear-gradient(135deg,${D.dark},#1B2C56)`,
          color: "#fff",
          borderRadius: 14,
        }}
      >
        <p
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 0.5,
            color: "rgba(255,255,255,.5)",
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          Hoy
        </p>
        <p
          style={{
            fontSize: 12.5,
            color: "#fff",
            lineHeight: 1.5,
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          {pendingCount === 0
            ? "Sin empresas esperando revisión."
            : pendingCount === 1
              ? "1 empresa espera tu revisión."
              : `${pendingCount} empresas esperan tu revisión.`}
        </p>
      </div>
    </aside>
  );
}

function TopbarAdmin({
  adminName,
  adminEmail,
  adminImage,
}: {
  adminName: string;
  adminEmail: string;
  adminImage?: string | null;
}) {
  const ini = pickInitials(adminName);
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 22px",
        background: D.surface,
        borderBottom: `1px solid ${D.border}`,
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: D.dark,
            background: "rgba(15,23,42,.08)",
            padding: "3px 9px",
            borderRadius: 5,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          Panel interno
        </span>
        <span style={{ fontSize: 12, color: D.subtle }}>
          Solo equipo PractiX
        </span>
      </div>
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(15,23,42,.045)",
            color: D.text,
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <Icon name="home" size={13} color={D.text} strokeWidth={2.2} />
          Volver al dashboard
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          title="Cerrar sesión"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(15,23,42,.045)",
            border: "none",
            cursor: "pointer",
            color: D.muted,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Cerrar sesión
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "4px 11px 4px 4px",
            background: "rgba(15,23,42,.045)",
            borderRadius: 99,
          }}
        >
          <Avatar ini={ini} size={30} src={adminImage} alt={adminName} />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: D.text }}>
              {adminName}
            </div>
            <div style={{ fontSize: 10, color: D.subtle }}>{adminEmail}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function SuspendModal({
  emp,
  onClose,
  onConfirm,
  processing,
}: {
  emp: Company;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  processing: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(11,27,63,.55)",
          zIndex: 70,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(440px, 92vw)",
          background: D.surface,
          borderRadius: 14,
          zIndex: 71,
          padding: "22px 24px",
          boxShadow: "0 24px 64px rgba(11,27,63,.24)",
        }}
      >
        <h3
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: D.text,
            letterSpacing: -0.3,
            margin: 0,
          }}
        >
          Suspender {emp.companyName}
        </h3>
        <p
          style={{
            fontSize: 13,
            color: D.muted,
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          La empresa quedará bloqueada del panel hasta que la restablezcas. Si
          dejas un motivo, lo verá en su pantalla de cuenta suspendida y en el
          email de aviso.
        </p>
        <label
          style={{
            display: "block",
            marginTop: 14,
            fontSize: 11,
            fontWeight: 800,
            color: D.subtle,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          Motivo (opcional, máx. 500)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          rows={4}
          placeholder="Ej: 3 reportes de candidatos por ofertas sin claridad de renta."
          style={{
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            border: `1px solid ${D.border}`,
            borderRadius: 9,
            fontSize: 13,
            color: D.text,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
            background: "rgba(15,23,42,.025)",
          }}
        />
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            style={{
              padding: "10px 14px",
              background: D.surface,
              border: `1px solid ${D.border}`,
              color: D.text,
              borderRadius: 9,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={processing}
            style={{
              padding: "10px 14px",
              background: D.amber,
              color: "#fff",
              border: "none",
              borderRadius: 9,
              fontSize: 12.5,
              fontWeight: 800,
              cursor: "pointer",
              opacity: processing ? 0.7 : 1,
            }}
          >
            {processing ? "Suspendiendo…" : "Suspender empresa"}
          </button>
        </div>
      </div>
    </>
  );
}

function EmpresaDrawer({
  emp,
  onClose,
  onApprove,
  onReject,
  onUnsuspend,
  onReopen,
  onOpenSuspend,
  processing,
}: {
  emp: Company;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUnsuspend: (id: string) => void;
  onReopen: (id: string) => void;
  onOpenSuspend: (emp: Company) => void;
  processing: boolean;
}) {
  const badge = statusBadge(emp.companyStatus);
  const isPending = emp.companyStatus === "PENDING";
  const risk = isPending ? inferRisk(emp) : null;
  const riskC =
    risk?.level === "low"
      ? D.green
      : risk?.level === "medium"
        ? D.amber
        : D.rose;
  const riskBg =
    risk?.level === "low"
      ? D.greenBg
      : risk?.level === "medium"
        ? D.amberBg
        : D.roseBg;
  const contactName =
    [emp.user.name, emp.user.lastName].filter(Boolean).join(" ") || "—";
  const generic = isGenericEmail(emp.user.email);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(11,27,63,.5)",
          zIndex: 60,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(520px, 95vw)",
          background: D.surface,
          zIndex: 61,
          boxShadow: "-20px 0 40px rgba(11,27,63,.18)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "18px 22px",
            borderBottom: `1px solid ${D.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: badge.color,
                background: badge.bg,
                padding: "3px 10px",
                borderRadius: 5,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {badge.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                background: "rgba(15,23,42,.06)",
                border: "none",
                cursor: "pointer",
                width: 30,
                height: 30,
                borderRadius: 7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="x" size={14} color={D.muted} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CompanyLogo company={emp} size={54} radius={13} fontSize={17} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: D.text,
                  letterSpacing: -0.5,
                  lineHeight: 1.2,
                  margin: 0,
                }}
              >
                {emp.companyName}
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: D.muted,
                  marginTop: 3,
                }}
              >
                {[emp.industry, emp.website]
                  .filter((v) => v && v.trim() !== "")
                  .join(" · ") || "Sin datos adicionales"}
              </p>
            </div>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {risk && (
            <div
              style={{
                padding: "12px 14px",
                background: riskBg,
                border: `1px solid ${riskC}33`,
                borderRadius: 11,
                display: "flex",
                gap: 11,
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "#fff",
                  color: riskC,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                !
              </span>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: riskC,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                    marginBottom: 3,
                  }}
                >
                  Riesgo{" "}
                  {risk.level === "low"
                    ? "bajo"
                    : risk.level === "medium"
                      ? "medio"
                      : "alto"}
                </div>
                <p
                  style={{
                    fontSize: 12.5,
                    color: D.text,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {risk.note}
                </p>
              </div>
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: D.subtle,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                marginBottom: 9,
              }}
            >
              Datos de la empresa
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 9,
              }}
            >
              {[
                { l: "RUT / Tax ID", v: emp.empresaRut || "—" },
                { l: "Industria", v: emp.industry || "—" },
                { l: "Web", v: emp.website || "—" },
                { l: "Registrada", v: formatLongDate(emp.createdAt) },
              ].map((f) => (
                <div
                  key={f.l}
                  style={{
                    padding: "9px 11px",
                    background: "rgba(15,23,42,.03)",
                    borderRadius: 9,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: D.subtle,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {f.l}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: D.text,
                      fontWeight: 700,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={f.v}
                  >
                    {f.v}
                  </div>
                </div>
              ))}
            </div>
            {emp.description && (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 12.5,
                  color: D.muted,
                  lineHeight: 1.5,
                  padding: "10px 12px",
                  background: "rgba(15,23,42,.03)",
                  borderRadius: 10,
                }}
              >
                {emp.description}
              </p>
            )}
          </div>

          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: D.subtle,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                marginBottom: 9,
              }}
            >
              Contacto registrante
            </div>
            <div
              style={{
                padding: "11px 13px",
                background: "rgba(15,23,42,.03)",
                borderRadius: 11,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: D.text }}>
                {contactName}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 12, color: D.text, fontWeight: 600 }}>
                  {emp.user.email}
                </span>
                {generic && (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      color: D.amber,
                      background: D.amberBg,
                      padding: "2px 6px",
                      borderRadius: 4,
                      letterSpacing: 0.3,
                    }}
                  >
                    EMAIL GENÉRICO
                  </span>
                )}
              </div>
              {emp.user.phone && (
                <div style={{ fontSize: 12, color: D.muted, marginTop: 3 }}>
                  {emp.user.phone}
                </div>
              )}
            </div>
          </div>

          {(emp.companyStatus === "APPROVED" ||
            emp.companyStatus === "SUSPENDED") && (
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: D.subtle,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  marginBottom: 9,
                }}
              >
                Actividad en la plataforma
              </div>
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(15,23,42,.03)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: D.text,
                    letterSpacing: -0.8,
                  }}
                >
                  {emp._count.internships}
                </span>
                <span
                  style={{ fontSize: 12.5, color: D.muted, fontWeight: 600 }}
                >
                  {emp._count.internships === 1
                    ? "práctica publicada"
                    : "prácticas publicadas"}
                </span>
              </div>
            </div>
          )}

          {emp.companyStatus === "SUSPENDED" && (
            <div
              style={{
                padding: "12px 14px",
                background: emp.suspensionReason
                  ? D.amberBg
                  : "rgba(15,23,42,.04)",
                border: `1px solid ${emp.suspensionReason ? D.amber : D.faint}33`,
                borderRadius: 11,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: emp.suspensionReason ? D.amber : D.subtle,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}
              >
                Motivo de la suspensión
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  color: emp.suspensionReason ? D.text : D.muted,
                  fontStyle: emp.suspensionReason ? "normal" : "italic",
                  lineHeight: 1.5,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {emp.suspensionReason ??
                  "No se registró un motivo al suspender esta empresa."}
              </p>
              {emp.suspendedAt && (
                <p style={{ fontSize: 11, color: D.subtle, marginTop: 6 }}>
                  Suspendida el {formatLongDate(emp.suspendedAt)}
                </p>
              )}
            </div>
          )}
        </div>

        <footer
          style={{
            padding: "14px 22px",
            borderTop: `1px solid ${D.border}`,
            display: "flex",
            gap: 8,
          }}
        >
          {emp.companyStatus === "PENDING" && (
            <>
              <button
                type="button"
                onClick={() => onReject(emp.id)}
                disabled={processing}
                style={{
                  padding: "11px 16px",
                  background: D.surface,
                  border: `1px solid ${D.border}`,
                  color: D.rose,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => onApprove(emp.id)}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: "11px",
                  background: `linear-gradient(135deg,${D.green},#22C55E)`,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: `0 4px 12px ${D.green}40`,
                }}
              >
                Aprobar empresa
              </button>
            </>
          )}
          {emp.companyStatus === "APPROVED" && (
            <button
              type="button"
              onClick={() => onOpenSuspend(emp)}
              disabled={processing}
              style={{
                flex: 1,
                padding: "11px",
                background: D.surface,
                border: `1px solid ${D.border}`,
                color: D.amber,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Suspender empresa
            </button>
          )}
          {emp.companyStatus === "REJECTED" && (
            <button
              type="button"
              onClick={() => onReopen(emp.id)}
              disabled={processing}
              style={{
                flex: 1,
                padding: "11px",
                background: D.surface,
                border: `1px solid ${D.border}`,
                color: D.text,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reabrir revisión
            </button>
          )}
          {emp.companyStatus === "SUSPENDED" && (
            <button
              type="button"
              onClick={() => onUnsuspend(emp.id)}
              disabled={processing}
              style={{
                flex: 1,
                padding: "11px",
                background: `linear-gradient(135deg,${D.green},#22C55E)`,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: `0 4px 12px ${D.green}40`,
              }}
            >
              Restablecer empresa
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}

export default function AdminEmpresasPage() {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("PENDING");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Company | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Company | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetchWithRefresh("/api/admin/empresas");
      const data = await res.json();
      setCompanies((data.companies ?? []) as Company[]);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      SUSPENDED: 0,
    };
    for (const e of companies) c[e.companyStatus]++;
    return c;
  }, [companies]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    // Normaliza el RUT quitando puntos, guiones y espacios para que la búsqueda
    // funcione con o sin separadores. "76.892.341-5", "76892341-5" y "768923415"
    // matchean todos contra el mismo input.
    const sRutNorm = s.replace(/[.\-\s]/g, "");
    return companies.filter((e) => {
      if (e.companyStatus !== tab) return false;
      if (!s) return true;
      const rutNorm = (e.empresaRut || "")
        .toLowerCase()
        .replace(/[.\-\s]/g, "");
      return (
        e.companyName.toLowerCase().includes(s) ||
        rutNorm.includes(sRutNorm) ||
        e.user.email.toLowerCase().includes(s) ||
        (e.industry || "").toLowerCase().includes(s)
      );
    });
  }, [companies, tab, q]);

  const applyLocal = (id: string, patch: Partial<Company>) =>
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );

  const callAction = async (
    id: string,
    body: Record<string, unknown>,
  ): Promise<Company | null> => {
    setProcessing(id);
    try {
      const res = await fetchWithRefresh(`/api/admin/empresas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return (await res.json()) as Company;
    } finally {
      setProcessing(null);
    }
  };

  const approve = async (id: string) => {
    const updated = await callAction(id, { action: "approve" });
    if (updated) {
      applyLocal(id, {
        companyStatus: "APPROVED",
        suspensionReason: null,
        suspendedAt: null,
      });
      if (active?.id === id) setActive(null);
    }
  };

  const reject = async (id: string) => {
    const updated = await callAction(id, { action: "reject" });
    if (updated) {
      applyLocal(id, { companyStatus: "REJECTED" });
      if (active?.id === id) setActive(null);
    }
  };

  const unsuspend = async (id: string) => {
    const updated = await callAction(id, { action: "unsuspend" });
    if (updated) {
      applyLocal(id, {
        companyStatus: "APPROVED",
        suspensionReason: null,
        suspendedAt: null,
      });
      if (active?.id === id) setActive(null);
    }
  };

  const reopen = async (id: string) => {
    const updated = await callAction(id, { action: "reopen" });
    if (updated) {
      applyLocal(id, {
        companyStatus: "PENDING",
        suspensionReason: null,
        suspendedAt: null,
      });
      if (active?.id === id) setActive(null);
    }
  };

  const suspendWithReason = async (reason: string) => {
    if (!suspendTarget) return;
    const id = suspendTarget.id;
    const body: Record<string, unknown> = { action: "suspend" };
    if (reason) body.reason = reason;
    const updated = await callAction(id, body);
    if (updated) {
      applyLocal(id, {
        companyStatus: "SUSPENDED",
        suspensionReason: reason || null,
        suspendedAt: new Date().toISOString(),
      });
      setSuspendTarget(null);
      if (active?.id === id) setActive(null);
    }
  };

  const bulkApprove = async () => {
    const ids = Array.from(selected);
    for (const id of ids) {
      await approve(id);
    }
    setSelected(new Set());
  };

  const bulkReject = async () => {
    const ids = Array.from(selected);
    for (const id of ids) {
      await reject(id);
    }
    setSelected(new Set());
  };

  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(filtered.map((c) => c.id)));
  const clearSel = () => setSelected(new Set());

  const adminName = session?.user?.name ?? "Admin";
  const adminEmail = session?.user?.email ?? "";
  const adminImage = session?.user?.image ?? null;

  return (
    <div style={{ minHeight: "100vh", background: D.bg, display: "flex" }}>
      <SidebarAdmin pendingCount={counts.PENDING} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TopbarAdmin
          adminName={adminName}
          adminEmail={adminEmail}
          adminImage={adminImage}
        />

        <main
          style={{
            padding: "20px 28px",
            maxWidth: 1400,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 14,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "clamp(1.4rem,2.2vw,1.8rem)",
                  fontWeight: 800,
                  color: D.text,
                  letterSpacing: -1,
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Empresas
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: D.subtle,
                  marginTop: 5,
                }}
              >
                Aprueba, rechaza o suspende empresas que se registran en
                PractiX.
              </p>
            </div>
          </header>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {[
              {
                k: "En revisión",
                v: counts.PENDING,
                d: "Esperan tu decisión",
                c: D.amber,
              },
              {
                k: "Aprobadas",
                v: counts.APPROVED,
                d: "Activas en la plataforma",
                c: D.green,
              },
              {
                k: "Rechazadas",
                v: counts.REJECTED,
                d: "No pueden publicar",
                c: D.muted,
              },
              {
                k: "Suspendidas",
                v: counts.SUSPENDED,
                d: "Bloqueadas temporalmente",
                c: D.rose,
              },
            ].map((k) => (
              <div
                key={k.k}
                style={{
                  background: D.surface,
                  border: `1px solid ${D.border}`,
                  borderRadius: 13,
                  padding: "13px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: D.subtle,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  {k.k}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: D.text,
                    letterSpacing: -1,
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {k.v}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: k.c,
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  {k.d}
                </div>
              </div>
            ))}
          </section>

          <section
            style={{
              background: D.surface,
              border: `1px solid ${D.border}`,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderBottom: `1px solid ${D.border}`,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  background: "rgba(15,23,42,.04)",
                  padding: 3,
                  borderRadius: 9,
                }}
              >
                {TABS.map((tb) => (
                  <button
                    type="button"
                    key={tb.k}
                    onClick={() => {
                      setTab(tb.k);
                      clearSel();
                    }}
                    style={{
                      padding: "6px 12px",
                      background: tab === tb.k ? D.surface : "transparent",
                      border: "none",
                      borderRadius: 7,
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: tab === tb.k ? D.text : D.muted,
                      cursor: "pointer",
                      boxShadow:
                        tab === tb.k ? "0 1px 2px rgba(15,23,42,.08)" : "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: tb.c,
                      }}
                    />
                    {tb.l}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: tab === tb.k ? tb.c : D.subtle,
                        background:
                          tab === tb.k ? tb.c + "18" : "rgba(15,23,42,.06)",
                        padding: "1px 6px",
                        borderRadius: 5,
                      }}
                    >
                      {counts[tb.k]}
                    </span>
                  </button>
                ))}
              </div>
              <div
                style={{
                  position: "relative",
                  flex: "1 1 220px",
                  maxWidth: 300,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                  }}
                >
                  <Icon name="search" size={14} color={D.subtle} />
                </span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar empresa, RUT, email o industria…"
                  style={{
                    width: "100%",
                    background: "rgba(15,23,42,.045)",
                    border: "1px solid transparent",
                    borderRadius: 8,
                    padding: "7px 12px 7px 32px",
                    fontSize: 12,
                    color: D.text,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {selected.size > 0 && tab === "PENDING" && (
              <div
                style={{
                  padding: "10px 16px",
                  background: D.accentBg,
                  borderBottom: `1px solid ${D.accentBdr}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 800, color: D.accent }}
                >
                  {selected.size} seleccionadas
                </span>
                <button
                  type="button"
                  onClick={bulkApprove}
                  disabled={processing !== null}
                  style={{
                    padding: "6px 11px",
                    background: D.green,
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Aprobar todas
                </button>
                <button
                  type="button"
                  onClick={bulkReject}
                  disabled={processing !== null}
                  style={{
                    padding: "6px 11px",
                    background: D.surface,
                    color: D.rose,
                    border: `1px solid ${D.border}`,
                    borderRadius: 7,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Rechazar todas
                </button>
                <button
                  type="button"
                  onClick={clearSel}
                  style={{
                    marginLeft: "auto",
                    padding: "6px 10px",
                    background: "transparent",
                    border: "none",
                    color: D.muted,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      background: "rgba(15,23,42,.025)",
                      borderBottom: `1px solid ${D.border}`,
                    }}
                  >
                    {tab === "PENDING" && (
                      <th style={{ padding: "10px 12px", width: 32 }}>
                        <span
                          onClick={
                            selected.size === filtered.length
                              ? clearSel
                              : selectAll
                          }
                          style={{
                            display: "inline-flex",
                            cursor: "pointer",
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            border: `1.6px solid ${
                              selected.size === filtered.length &&
                              filtered.length > 0
                                ? D.accent
                                : D.faint
                            }`,
                            background:
                              selected.size === filtered.length &&
                              filtered.length > 0
                                ? D.accent
                                : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {selected.size === filtered.length &&
                            filtered.length > 0 && (
                              <Icon
                                name="check"
                                size={10}
                                color="#fff"
                                strokeWidth={3}
                              />
                            )}
                        </span>
                      </th>
                    )}
                    {[
                      "Empresa",
                      "RUT / Tax ID",
                      "Industria",
                      "Contacto",
                      tab === "PENDING"
                        ? "Riesgo"
                        : tab === "APPROVED"
                          ? "Prácticas"
                          : "Motivo",
                      tab === "PENDING" ? "Espera" : "Fecha",
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: D.subtle,
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={tab === "PENDING" ? 8 : 7}
                        style={{
                          padding: "40px 20px",
                          textAlign: "center",
                          fontSize: 13,
                          color: D.subtle,
                        }}
                      >
                        Cargando empresas…
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={tab === "PENDING" ? 8 : 7}
                        style={{
                          padding: "40px 20px",
                          textAlign: "center",
                          fontSize: 13,
                          color: D.subtle,
                        }}
                      >
                        Sin empresas en esta lista
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filtered.map((e) => {
                      const risk = inferRisk(e);
                      const riskC =
                        risk.level === "low"
                          ? D.green
                          : risk.level === "medium"
                            ? D.amber
                            : D.rose;
                      const days = daysWaiting(e.createdAt);
                      const generic = isGenericEmail(e.user.email);
                      const contactName =
                        [e.user.name, e.user.lastName]
                          .filter(Boolean)
                          .join(" ") || "—";
                      return (
                        <tr
                          key={e.id}
                          style={{
                            borderBottom: `1px solid ${D.border}`,
                            cursor: "pointer",
                            transition: "background .15s",
                          }}
                          onMouseEnter={(ev) =>
                            (ev.currentTarget.style.background =
                              "rgba(15,23,42,.022)")
                          }
                          onMouseLeave={(ev) =>
                            (ev.currentTarget.style.background = "transparent")
                          }
                          onClick={() => setActive(e)}
                        >
                          {tab === "PENDING" && (
                            <td
                              style={{ padding: "12px", width: 32 }}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                toggleSel(e.id);
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  width: 16,
                                  height: 16,
                                  borderRadius: 4,
                                  border: `1.6px solid ${
                                    selected.has(e.id) ? D.accent : D.faint
                                  }`,
                                  background: selected.has(e.id)
                                    ? D.accent
                                    : "transparent",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {selected.has(e.id) && (
                                  <Icon
                                    name="check"
                                    size={10}
                                    color="#fff"
                                    strokeWidth={3}
                                  />
                                )}
                              </span>
                            </td>
                          )}
                          <td style={{ padding: "12px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 11,
                              }}
                            >
                              <CompanyLogo
                                company={e}
                                size={34}
                                radius={9}
                                fontSize={12}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: 800,
                                    color: D.text,
                                  }}
                                >
                                  {e.companyName}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    color: D.subtle,
                                    marginTop: 1,
                                  }}
                                >
                                  {e.website || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              fontSize: 12,
                              color: D.muted,
                              fontFamily: "ui-monospace, monospace",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {e.empresaRut || "—"}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              fontSize: 12,
                              color: D.text,
                              fontWeight: 600,
                            }}
                          >
                            {e.industry || "—"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: D.text,
                              }}
                            >
                              {contactName}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: D.muted,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                marginTop: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  maxWidth: 180,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {e.user.email}
                              </span>
                              {generic && (
                                <span
                                  style={{
                                    fontSize: 8.5,
                                    fontWeight: 800,
                                    color: D.amber,
                                    background: D.amberBg,
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    letterSpacing: 0.3,
                                  }}
                                >
                                  GENÉRICO
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px" }}>
                            {tab === "PENDING" && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  color: riskC,
                                  background: riskC + "15",
                                  padding: "3px 9px",
                                  borderRadius: 6,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.3,
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: riskC,
                                  }}
                                />
                                {risk.level === "low"
                                  ? "Bajo"
                                  : risk.level === "medium"
                                    ? "Medio"
                                    : "Alto"}
                              </span>
                            )}
                            {tab === "APPROVED" && (
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: D.text,
                                }}
                              >
                                {e._count.internships}
                              </span>
                            )}
                            {tab === "REJECTED" && (
                              <span
                                style={{
                                  fontSize: 11.5,
                                  color: D.muted,
                                }}
                              >
                                Documentación insuficiente
                              </span>
                            )}
                            {tab === "SUSPENDED" && (
                              <span
                                style={{
                                  fontSize: 11.5,
                                  color: D.muted,
                                  lineHeight: 1.4,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  maxWidth: 240,
                                }}
                              >
                                {e.suspensionReason || "Sin motivo registrado"}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {tab === "PENDING" && (
                              <span
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  color:
                                    days >= 2
                                      ? D.rose
                                      : days >= 1
                                        ? D.amber
                                        : D.muted,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {days === 0
                                  ? "Hoy"
                                  : days === 1
                                    ? "1 día"
                                    : `${days} días`}
                              </span>
                            )}
                            {tab !== "PENDING" && (
                              <span style={{ fontSize: 11.5, color: D.muted }}>
                                {formatLongDate(
                                  tab === "SUSPENDED" && e.suspendedAt
                                    ? e.suspendedAt
                                    : e.updatedAt,
                                )}
                              </span>
                            )}
                          </td>
                          <td
                            style={{ padding: "12px", textAlign: "right" }}
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            {tab === "PENDING" ? (
                              <div style={{ display: "inline-flex", gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => reject(e.id)}
                                  disabled={processing === e.id}
                                  title="Rechazar"
                                  aria-label={`Rechazar ${e.companyName}`}
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 7,
                                    background: "transparent",
                                    border: `1px solid ${D.border}`,
                                    color: D.rose,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Icon
                                    name="x"
                                    size={12}
                                    color={D.rose}
                                    strokeWidth={2.5}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => approve(e.id)}
                                  disabled={processing === e.id}
                                  title="Aprobar"
                                  aria-label={`Aprobar ${e.companyName}`}
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 7,
                                    background: D.greenBg,
                                    border: `1px solid ${D.green}33`,
                                    color: D.green,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Icon
                                    name="check"
                                    size={13}
                                    color={D.green}
                                    strokeWidth={2.5}
                                  />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActive(e)}
                                style={{
                                  padding: "5px 11px",
                                  background: "transparent",
                                  border: `1px solid ${D.border}`,
                                  color: D.text,
                                  borderRadius: 7,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Ver
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {active && (
        <EmpresaDrawer
          emp={active}
          onClose={() => setActive(null)}
          onApprove={approve}
          onReject={reject}
          onUnsuspend={unsuspend}
          onReopen={reopen}
          onOpenSuspend={(emp) => setSuspendTarget(emp)}
          processing={processing !== null}
        />
      )}

      {suspendTarget && (
        <SuspendModal
          emp={suspendTarget}
          onClose={() => setSuspendTarget(null)}
          onConfirm={suspendWithReason}
          processing={processing === suspendTarget.id}
        />
      )}
    </div>
  );
}

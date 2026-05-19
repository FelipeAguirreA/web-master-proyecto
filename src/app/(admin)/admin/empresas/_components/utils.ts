import type { Company, CompanyStatus, Risk } from "./types";

// --- Email risk helpers ---

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
  "mailinator.com",
  "yopmail.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "trashmail.com",
  "example.com",
  "example.org",
  "example.net",
  "test.com",
]);

export function getEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).toLowerCase();
}

export function isHighRiskEmail(email: string): boolean {
  const d = getEmailDomain(email);
  return d !== null && HIGH_RISK_DOMAINS.has(d);
}

export function isGenericEmail(email: string): boolean {
  const d = getEmailDomain(email);
  return d !== null && (PERSONAL_DOMAINS.has(d) || HIGH_RISK_DOMAINS.has(d));
}

export function inferRisk(c: Company): { level: Risk; note: string } {
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

// --- Display helpers ---

export function daysWaiting(createdAtIso: string): number {
  const ms = Date.now() - new Date(createdAtIso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function pickInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// --- Status badge ---

export function statusBadge(status: CompanyStatus): {
  label: string;
  colorClass: string;
  bgClass: string;
} {
  if (status === "PENDING")
    return {
      label: "Pendiente revisión",
      colorClass: "text-amber",
      bgClass: "bg-amber-bg",
    };
  if (status === "APPROVED")
    return {
      label: "Aprobada",
      colorClass: "text-green",
      bgClass: "bg-green-bg",
    };
  if (status === "REJECTED")
    return {
      label: "Rechazada",
      colorClass: "text-rose",
      bgClass: "bg-rose-bg",
    };
  return {
    label: "Suspendida",
    colorClass: "text-muted",
    bgClass: "bg-dark/6",
  };
}

// --- Risk color helpers ---

export function riskColorClass(level: Risk): string {
  if (level === "low") return "text-green";
  if (level === "medium") return "text-amber";
  return "text-rose";
}

export function riskBgClass(level: Risk): string {
  if (level === "low") return "bg-green-bg";
  if (level === "medium") return "bg-amber-bg";
  return "bg-rose-bg";
}

export function riskBorderClass(level: Risk): string {
  if (level === "low") return "border-green/20";
  if (level === "medium") return "border-amber/20";
  return "border-rose/20";
}

export function riskLabel(level: Risk): string {
  if (level === "low") return "Bajo";
  if (level === "medium") return "Medio";
  return "Alto";
}

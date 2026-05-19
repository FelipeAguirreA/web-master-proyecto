/**
 * Funciones puras del dashboard estudiante.
 * Sin imports de React ni de Next.js — puramente lógica de datos.
 */

import {
  companyColor,
  companyInitials,
} from "@/components/dashboard/companyColors";
import type { PracticaCardData } from "@/components/dashboard/sections/PracticaCard";
import type {
  PipelineColumn,
  PipelineItem,
} from "@/components/dashboard/sections/PipelineStrip";
import type { ActivityItem } from "@/components/dashboard/sections/Activity";

// ─── Colores para íconos de actividad (valores fijos de paleta Warm Tech) ───
// Se usan como props dinámicas en ActivityItem.color / .bg, por lo que no
// pueden ser clases Tailwind. Son los mismos valores que D.xxx en palettes.ts.
const ACT_GREEN = "#1A8F3C";
const ACT_GREEN_BG = "#E7F8EA";
const ACT_ACCENT = "#FF6A3D";
const ACT_ACCENT_BG = "#FFF3EC";
const ACT_ROSE = "#C74A1E";
const ACT_ROSE_BG = "#FFE9E0";
const ACT_BLUE = "#3D5AFF";
const ACT_BLUE_BG = "#E4ECFF";

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

// ─── Types mínimos (copiados del page para no crear dependencia circular) ───

type ApiInternship = {
  id: string;
  title: string;
  description?: string | null;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  skills?: string[];
  company: { companyName: string; logo: string | null };
  matchScore?: number | null;
  createdAt?: string;
};

type ApiApplication = {
  id: string;
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
  pipelineStatus?: "PENDING" | "REVIEWING" | "INTERVIEW" | "REJECTED" | null;
  matchScore?: number | null;
  createdAt: string;
  internship: {
    id: string;
    title: string;
    company: { companyName: string; logo?: string | null };
  };
};

type ApiNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
};

// ─── Funciones ────────────────────────────────────────────────────────────────

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "hace un rato";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "hace un instante";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

export function toPracticaCard(it: ApiInternship): PracticaCardData {
  const co = it.company.companyName;
  const color = companyColor(co);
  const score = Math.round(it.matchScore ?? 0);
  const top =
    score >= 95
      ? "Top 5%"
      : score >= 90
        ? "Top 10%"
        : score >= 80
          ? "Top 20%"
          : null;
  const mode = `${MODALITY_LABEL[it.modality] ?? it.modality} · ${it.location}`;
  const isNew = it.createdAt
    ? Date.now() - new Date(it.createdAt).getTime() < 7 * 24 * 3600 * 1000
    : false;
  return {
    id: it.id,
    co,
    logo: companyInitials(co),
    logoUrl: it.company.logo ?? null,
    logoBg: color.bg,
    logoFg: color.fg,
    title: it.title,
    description: it.description ?? null,
    mode,
    salary: null,
    dur: it.duration,
    score,
    top,
    tags: (it.skills ?? []).slice(0, 4),
    deadline: null,
    applicants: null,
    isNew,
    ai: null,
  };
}

export function applicationToPipelineItem(a: ApiApplication): PipelineItem {
  const co = a.internship.company.companyName;
  const color = companyColor(co);
  return {
    id: a.id,
    co,
    logo: companyInitials(co),
    logoUrl: a.internship.company.logo ?? null,
    logoBg: color.bg,
    logoFg: color.fg,
    title: a.internship.title,
    ago: relativeTime(a.createdAt),
  };
}

export function stageFor(
  a: ApiApplication,
): PipelineColumn["stage"] | "Rechazada" {
  if (a.status === "ACCEPTED") return "Oferta";
  if (a.status === "REJECTED") return "Rechazada";
  if (a.pipelineStatus === "INTERVIEW") return "Entrevista";
  if (a.pipelineStatus === "REVIEWING" || a.status === "REVIEWED")
    return "En revisión";
  return "Postulé";
}

export function buildPipeline(apps: ApiApplication[]): PipelineColumn[] {
  const stages: PipelineColumn["stage"][] = [
    "Postulé",
    "En revisión",
    "Entrevista",
    "Oferta",
  ];
  const grouped: Record<string, ApiApplication[]> = {
    Postulé: [],
    "En revisión": [],
    Entrevista: [],
    Oferta: [],
  };
  for (const a of apps) {
    const s = stageFor(a);
    if (s !== "Rechazada") grouped[s].push(a);
  }
  return stages.map((stage) => ({
    stage,
    count: grouped[stage].length,
    items: grouped[stage].map(applicationToPipelineItem),
  }));
}

export function notifToActivity(n: ApiNotification): ActivityItem {
  let icon = "✓";
  let color: string = ACT_GREEN;
  let bg: string = ACT_GREEN_BG;
  if (n.type === "APPLICATION_ACCEPTED") {
    icon = "★";
    color = ACT_ACCENT;
    bg = ACT_ACCENT_BG;
  } else if (n.type === "APPLICATION_REJECTED") {
    icon = "✗";
    color = ACT_ROSE;
    bg = ACT_ROSE_BG;
  } else if (n.type === "APPLICATION_REVIEWED") {
    icon = "✓";
    color = ACT_BLUE;
    bg = ACT_BLUE_BG;
  }
  return {
    id: n.id,
    icon,
    color,
    bg,
    label: `${n.title} · ${n.body}`,
    when: relativeTime(n.createdAt),
  };
}

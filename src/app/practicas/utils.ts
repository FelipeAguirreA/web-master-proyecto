import {
  companyColor,
  companyInitials,
} from "@/components/dashboard/companyColors";
import type { PracticaCardData } from "@/components/dashboard/sections/PracticaCard";

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

export type ApiInternship = {
  id: string;
  title: string;
  description?: string | null;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  skills?: string[];
  createdAt?: string;
  savedAt?: string;
  matchScore?: number | null;
  company: { companyName: string; logo: string | null };
};

export function toCard(
  it: ApiInternship,
  score: number | null,
  applied: boolean,
): PracticaCardData {
  const co = it.company.companyName;
  const color = companyColor(co);
  const safeScore = score ?? 0;
  const top =
    safeScore >= 95
      ? "Top 5%"
      : safeScore >= 90
        ? "Top 10%"
        : safeScore >= 80
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
    score: safeScore,
    top,
    tags: (it.skills ?? []).slice(0, 4),
    deadline: null,
    applicants: null,
    isNew,
    ai: null,
    applied,
  };
}

export function buildPageList(
  current: number,
  total: number,
): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

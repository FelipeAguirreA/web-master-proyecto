import type { Internship } from "./types";

export const MODALITY_LABEL: Record<Internship["modality"], string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

export function pickInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PX"
  );
}

export function deriveTagline(description: string | null): string {
  if (!description) return "";
  const firstLine = description
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  if (!firstLine) return "";
  return firstLine.length > 140 ? firstLine.slice(0, 137) + "…" : firstLine;
}

export function normalizeUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

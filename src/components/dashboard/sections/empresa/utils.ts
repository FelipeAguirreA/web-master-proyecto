/**
 * Funciones helper puras para el dashboard empresa.
 * Sin dependencias de React ni de Next.js — sólo lógica de presentación.
 */

/** "hoy", "ayer", "hace 5 días", "hace 2 meses". Para mostrar cuándo se publicó una práctica. */
export function publishedAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = 24 * 3600 * 1000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "hace 1 mes";
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "hace 1 año" : `hace ${years} años`;
}

/**
 * Devuelve un par [c1, c2] de colores hex para el avatar basado en el nombre.
 * El par es deterministico — mismo nombre, mismo color siempre.
 */
export function avatarColors(name: string): [string, string] {
  const palette: Array<[string, string]> = [
    ["#FFD4B8", "#FF9B6A"],
    ["#B8E6D4", "#3DBE85"],
    ["#D8C4FF", "#7C3AED"],
    ["#B8C9FF", "#2C5CFA"],
    ["#FFE6A8", "#D69E2E"],
    ["#FFD4B8", "#C74A1E"],
    ["#A8E0FF", "#0EA5E9"],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

/** Iniciales de una persona: "Juan Pérez" → "JP", "Ana" → "AN". */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Tiempo relativo corto: "ahora", "hace 5 min", "hace 2 h", "hace 3 d", o fecha dd/mmm. */
export function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
}

/** Comienzo del día (medianoche local) para una fecha dada. */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Comienzo de la semana (lunes) para una fecha dada. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay() === 0 ? 7 : x.getDay();
  x.setDate(x.getDate() - (day - 1));
  return x;
}

/** Mapa de modalidad de práctica a etiqueta en español. */
export const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

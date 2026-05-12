/**
 * Paletas del shell de dashboard.
 *
 * - `D` (warm/orange) es la paleta histórica que pinta TODO el resto de la app
 *   (landing, dashboard estudiante, perfil, login, listado, detalle).
 *
 * - `E` (B2B blue/slate) es exclusiva del Dashboard Empresa (decisión de
 *   chat3 del Stitch: paleta B2B distinta para señalizar contexto enterprise).
 *
 * Ambas tienen EXACTAMENTE las mismas claves para que los componentes shell
 * (Sidebar, Topbar, layout) puedan recibir `palette: D | E` y pintarse igual
 * en cualquiera de los dos dashboards.
 */
export type Palette = {
  bg: string;
  surface: string;
  cream: string;
  dark: string;
  border: string;
  borderHi: string;
  text: string;
  muted: string;
  subtle: string;
  faint: string;
  accent: string;
  accentHi: string;
  accentLo: string;
  accentBg: string;
  accentBdr: string;
  green: string;
  greenBg: string;
  blue: string;
  blueBg: string;
  purple: string;
  purpleBg: string;
  amber: string;
  amberBg: string;
  rose: string;
  roseBg: string;
};

export const D: Palette = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  cream: "#FFF8F2",
  dark: "#0C0A08",
  border: "rgba(0,0,0,.07)",
  borderHi: "rgba(0,0,0,.12)",
  text: "#0A0909",
  muted: "#6D6A63",
  subtle: "#9B9891",
  faint: "#C8C5BD",
  accent: "#FF6A3D",
  accentHi: "#FF9B6A",
  accentLo: "#FFD4B8",
  accentBg: "#FFF3EC",
  accentBdr: "rgba(255,106,61,.18)",
  green: "#1A8F3C",
  greenBg: "#E7F8EA",
  blue: "#3D5AFF",
  blueBg: "#E4ECFF",
  purple: "#8247E5",
  purpleBg: "#F0E7FC",
  amber: "#C89000",
  amberBg: "#FFF4D6",
  rose: "#C74A1E",
  roseBg: "#FFE9E0",
};

export const E: Palette = {
  bg: "#F4F6FB",
  surface: "#FFFFFF",
  cream: "#EEF3FE",
  dark: "#0B1B3F",
  border: "rgba(15,23,42,.08)",
  borderHi: "rgba(15,23,42,.14)",
  text: "#0F172A",
  muted: "#475569",
  subtle: "#94A3B8",
  faint: "#CBD5E1",
  accent: "#2C5CFA",
  accentHi: "#4A78FF",
  accentLo: "#B8C9FF",
  accentBg: "#EEF2FF",
  accentBdr: "rgba(44,92,250,.18)",
  green: "#0E8A4A",
  greenBg: "#DFF6E8",
  blue: "#0EA5E9",
  blueBg: "#E0F2FE",
  purple: "#7C3AED",
  purpleBg: "#EDE9FE",
  amber: "#B45309",
  amberBg: "#FEF3C7",
  rose: "#BE123C",
  roseBg: "#FFE4E6",
};

export function paletteFor(role?: "STUDENT" | "COMPANY"): Palette {
  return role === "COMPANY" ? E : D;
}

type Color = { bg: string; fg: string };

const KNOWN: Record<string, Color> = {
  falabella: { bg: "#007A33", fg: "#fff" },
  notco: { bg: "#0F0F0F", fg: "#A8E640" },
  fintual: { bg: "#4B1AF5", fg: "#fff" },
  cornershop: { bg: "#FF5A00", fg: "#fff" },
  bci: { bg: "#0033A0", fg: "#fff" },
  entel: { bg: "#00A8E0", fg: "#fff" },
  buk: { bg: "#FF3366", fg: "#fff" },
  betterfly: { bg: "#5B21B6", fg: "#fff" },
  "mercado libre": { bg: "#FFE600", fg: "#111" },
  mercadolibre: { bg: "#FFE600", fg: "#111" },
  ripley: { bg: "#D4003E", fg: "#fff" },
  wom: { bg: "#B400FF", fg: "#fff" },
  cencosud: { bg: "#E30613", fg: "#fff" },
};

const FALLBACK_PALETTE: Color[] = [
  { bg: "#FF6A3D", fg: "#fff" },
  { bg: "#0033A0", fg: "#fff" },
  { bg: "#4B1AF5", fg: "#fff" },
  { bg: "#00A8E0", fg: "#fff" },
  { bg: "#8247E5", fg: "#fff" },
  { bg: "#1A8F3C", fg: "#fff" },
  { bg: "#C89000", fg: "#fff" },
];

export function companyColor(name: string): Color {
  const key = name.trim().toLowerCase();
  if (KNOWN[key]) return KNOWN[key];
  for (const k of Object.keys(KNOWN)) {
    if (key.includes(k)) return KNOWN[k];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = hash + name.charCodeAt(i);
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

export function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

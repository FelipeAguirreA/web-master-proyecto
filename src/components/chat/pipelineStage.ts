// Mapea PipelineStatus de la DB al label + color del badge "stage" del inbox
// rediseñado. El mock usa colores específicos por etapa que también se usan en
// el ATS Kanban — mantener sincronizados si cambia uno.

export type PipelineStatusValue =
  | "PENDING"
  | "REVIEWING"
  | "INTERVIEW"
  | "ACCEPTED"
  | "REJECTED";

export type StageMeta = {
  label: string;
  color: string;
  bg: string;
};

const STAGE_MAP: Record<PipelineStatusValue, StageMeta> = {
  PENDING: { label: "Nuevo", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  REVIEWING: {
    label: "Revisión",
    color: "#0EA5E9",
    bg: "rgba(14,165,233,0.12)",
  },
  INTERVIEW: {
    label: "Entrevista",
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.12)",
  },
  ACCEPTED: {
    label: "Aceptado",
    color: "#047857",
    bg: "rgba(4,120,87,0.12)",
  },
  REJECTED: {
    label: "Rechazado",
    color: "#BE123C",
    bg: "rgba(190,18,60,0.12)",
  },
};

const FALLBACK: StageMeta = STAGE_MAP.PENDING;

export function stageMeta(status: string | null | undefined): StageMeta {
  if (!status) return FALLBACK;
  return STAGE_MAP[status as PipelineStatusValue] ?? FALLBACK;
}

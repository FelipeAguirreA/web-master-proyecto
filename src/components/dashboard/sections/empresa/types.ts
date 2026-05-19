/**
 * Tipos compartidos del dashboard empresa.
 * Exportados desde aquí para que los sub-componentes no dependan de page.tsx.
 * page.tsx re-exporta estos tipos para mantener compatibilidad con cualquier
 * consumidor externo que pudiera importarlos desde el page directamente.
 */

export type Internship = {
  id: string;
  title: string;
  description: string;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  skills: string[];
  responsibilities?: string[];
  requirements: string[];
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
};

/** Estado derivado de una práctica para mostrar en las tabs. */
export type InternshipTab = "activas" | "finalizadas" | "eliminadas";

export function getInternshipTab(i: Internship): InternshipTab {
  if (i.deletedAt) return "eliminadas";
  if (!i.isActive) return "finalizadas";
  return "activas";
}

export type StudentProfile = { university?: string; career?: string };

export type Applicant = {
  id: string;
  internshipId: string;
  matchScore: number;
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
  pipelineStatus?: "PENDING" | "REVIEWING" | "INTERVIEW" | "REJECTED";
  createdAt: string;
  student: {
    name: string;
    email: string;
    image?: string | null;
    studentProfile?: StudentProfile | null;
  };
};

export type Interview = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMins: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  meetingLink?: string | null;
  mode?: string | null;
  student: { id: string; name: string; image?: string | null };
  internship: { id: string; title: string };
  conversation?: { id: string };
};

export type Conversation = {
  id: string;
  student: { id: string; name: string; image?: string | null };
  internship?: { id: string; title: string };
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount?: number;
  updatedAt: string;
};

/** Shape de los stage counts por internship id. */
export type StageCounts = {
  nuevos: number;
  screening: number;
  entrev: number;
  ofertas: number;
  total: number;
};

/** KPIs del hero. */
export type HeroKpis = {
  nuevos: number;
  activas: number;
  hoy: number;
  tasa: number | null;
};

/** Opciones de área y modalidad (constantes de dominio). */
export const AREAS = [
  "Ingeniería",
  "Marketing",
  "Diseño",
  "Datos",
  "Finanzas",
  "RRHH",
  "Legal",
  "Operaciones",
  "Producto",
] as const;

export const MODALITIES = [
  { value: "REMOTE", label: "Remoto" },
  { value: "ONSITE", label: "Presencial" },
  { value: "HYBRID", label: "Híbrido" },
] as const;

export const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

export const EMPTY_FORM = {
  title: "",
  description: "",
  area: AREAS[0],
  location: "",
  modality: "REMOTE",
  duration: "",
  skills: "",
  responsibilities: "",
  requirements: "",
} as const;

export type EmpForm = typeof EMPTY_FORM;

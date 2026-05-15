type ModuleType =
  | "SKILLS"
  | "EXPERIENCE"
  | "EDUCATION"
  | "LANGUAGES"
  | "PORTFOLIO"
  | "CUSTOM";

interface PresetModule {
  type: ModuleType;
  label: string;
  description: string;
  icon: string;
  defaultWeight: number;
  defaultActive: boolean;
  defaultParams: Record<string, unknown>;
}

export const PRESET_MODULES: PresetModule[] = [
  {
    type: "SKILLS",
    label: "Habilidades Técnicas",
    description: "Compara skills del CV con las requeridas para el cargo",
    icon: "⚡",
    defaultWeight: 40,
    defaultActive: true,
    defaultParams: {
      required: [],
      preferred: [],
      hardFilter: false,
    },
  },
  {
    type: "EDUCATION",
    label: "Formación Académica",
    description: "Evalúa carrera, institución y promedio académico",
    icon: "🎓",
    defaultWeight: 15,
    defaultActive: false,
    defaultParams: {
      minGPA: 0.0,
      preferredDegrees: [],
      hardFilter: false,
    },
  },
  {
    type: "LANGUAGES",
    label: "Idiomas",
    description: "Verifica idiomas requeridos y su nivel mínimo",
    icon: "🌐",
    defaultWeight: 10,
    defaultActive: false,
    defaultParams: {
      required: [],
      preferred: [],
      hardFilter: false,
    },
  },
  {
    type: "PORTFOLIO",
    label: "Portafolio / Proyectos",
    description: "Detecta links a portafolios, GitHub o proyectos descritos",
    icon: "🗂️",
    defaultWeight: 5,
    defaultActive: false,
    defaultParams: {
      required: false,
      keywords: ["github", "behance", "portfolio", "proyecto"],
      hardFilter: false,
    },
  },
];

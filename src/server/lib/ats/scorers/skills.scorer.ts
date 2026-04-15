import type { CVData } from "../cv-extractor";

interface SkillsParams {
  required: string[];
  preferred: string[];
  hardFilter: boolean;
}

export interface ScorerResult {
  score: number; // 0-100
  passed: boolean;
  reason?: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.\-_]/g, " ");
}

/**
 * Busca una skill en el CV usando dos estrategias:
 * 1. Lista de skills del perfil: coincidencia exacta o que la skill del CV contenga el target
 * 2. Texto crudo del CV: word-boundary regex (evita que "c" matchee "css")
 */
function hasSkill(
  cvSkills: string[],
  rawText: string,
  target: string,
): boolean {
  const t = normalize(target);
  if (!t) return false;

  // Chequeo en lista de skills (perfil + extraídas)
  if (
    cvSkills.some((s) => {
      const n = normalize(s);
      return n === t || n.includes(t);
      // Solo n.includes(t): "react native" matchea "react", pero NO al revés
      // evita que "c" (de "C programming") matchee "css"
    })
  )
    return true;

  // Chequeo en texto crudo con word boundaries
  try {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(rawText);
  } catch {
    return false;
  }
}

export function scoreSkills(cv: CVData, params: SkillsParams): ScorerResult {
  const { required = [], preferred = [], hardFilter = false } = params;

  // Hard filter: si le falta algún skill requerido → descalificado
  if (hardFilter && required.length > 0) {
    const missing = required.filter((r) => !hasSkill(cv.skills, cv.rawText, r));
    if (missing.length > 0) {
      return {
        score: 0,
        passed: false,
        reason: `Faltan skills requeridas: ${missing.join(", ")}`,
      };
    }
  }

  // Score de requeridas
  const missingRequired: string[] = [];
  let requiredScore = 100;
  if (required.length > 0) {
    const matched = required.filter((r) => hasSkill(cv.skills, cv.rawText, r));
    missingRequired.push(
      ...required.filter((r) => !hasSkill(cv.skills, cv.rawText, r)),
    );
    requiredScore = (matched.length / required.length) * 100;
  }

  // Score de preferidas
  let preferredScore = 0;
  if (preferred.length > 0) {
    const matched = preferred.filter((p) =>
      hasSkill(cv.skills, cv.rawText, p),
    ).length;
    preferredScore = (matched / preferred.length) * 100;
  }

  // Si no hay preferred, el score es 100% del de requeridas
  const score =
    preferred.length > 0
      ? Math.round(requiredScore * 0.7 + preferredScore * 0.3)
      : Math.round(requiredScore);

  const reason =
    missingRequired.length > 0
      ? `Skills no encontradas en CV: ${missingRequired.join(", ")}`
      : undefined;

  return { score, passed: true, reason };
}

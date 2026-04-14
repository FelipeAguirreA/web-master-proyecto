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

function hasSkill(cvSkills: string[], target: string): boolean {
  const t = normalize(target);
  return cvSkills.some((s) => {
    const n = normalize(s);
    return n === t || n.includes(t) || t.includes(n);
  });
}

export function scoreSkills(cv: CVData, params: SkillsParams): ScorerResult {
  const { required = [], preferred = [], hardFilter = false } = params;
  const allCVSkills = [...cv.skills, ...cv.rawText.toLowerCase().split(/\W+/)];

  // Hard filter: si le falta algún skill requerido → descalificado
  if (hardFilter && required.length > 0) {
    const missing = required.filter((r) => !hasSkill(allCVSkills, r));
    if (missing.length > 0) {
      return {
        score: 0,
        passed: false,
        reason: `Faltan skills requeridas: ${missing.join(", ")}`,
      };
    }
  }

  // Score de requeridas (70% del puntaje)
  let requiredScore = 100;
  if (required.length > 0) {
    const matched = required.filter((r) => hasSkill(allCVSkills, r)).length;
    requiredScore = (matched / required.length) * 100;
  }

  // Score de preferidas (30% del puntaje)
  let preferredScore = 0;
  if (preferred.length > 0) {
    const matched = preferred.filter((p) => hasSkill(allCVSkills, p)).length;
    preferredScore = (matched / preferred.length) * 100;
  } else {
    preferredScore = 100; // sin preferidas, no penaliza
  }

  const score = Math.round(requiredScore * 0.7 + preferredScore * 0.3);

  return { score, passed: true };
}

import type { CVData } from "../cv-extractor";
import type { ScorerResult } from "./skills.scorer";

interface ExperienceParams {
  minYears: number;
  preferredRoles: string[];
  hardFilter: boolean;
}

export function scoreExperience(
  cv: CVData,
  params: ExperienceParams,
): ScorerResult {
  const { minYears = 0, preferredRoles = [], hardFilter = false } = params;
  const { totalYears, roles } = cv.experience;

  // Hard filter
  if (hardFilter && totalYears < minYears) {
    return {
      score: 0,
      passed: false,
      reason: `Requiere ${minYears} años de experiencia, el candidato tiene ${totalYears}`,
    };
  }

  // Score por años (máximo en el doble del mínimo requerido)
  let yearsScore = 100;
  if (minYears > 0) {
    yearsScore = Math.min(100, (totalYears / minYears) * 80);
  } else if (totalYears > 0) {
    // Bonus por experiencia aunque no haya mínimo
    yearsScore = Math.min(100, 60 + totalYears * 5);
  }

  // Bonus por roles relevantes
  let roleScore = 0;
  if (preferredRoles.length > 0) {
    const matched = preferredRoles.filter((pr) =>
      roles.some((r) => r.includes(pr.toLowerCase())),
    ).length;
    roleScore = (matched / preferredRoles.length) * 20;
  }

  const score = Math.min(100, Math.round(yearsScore + roleScore));

  return { score, passed: true };
}

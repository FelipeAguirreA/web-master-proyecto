import { parseCVText, type CVData } from "./cv-extractor";
import { scoreSkills } from "./scorers/skills.scorer";
import { scoreExperience } from "./scorers/experience.scorer";
import { scoreEducation } from "./scorers/education.scorer";
import { scoreLanguages } from "./scorers/languages.scorer";
import { scorePortfolio } from "./scorers/portfolio.scorer";

export interface ATSModuleInput {
  id: string;
  type: string;
  label: string;
  isActive: boolean;
  weight: number;
  params: Record<string, unknown>;
}

export interface ModuleScoreDetail {
  moduleId: string;
  type: string;
  label: string;
  weight: number;
  score: number;
  passed: boolean;
  reason?: string;
}

export interface ATSResult {
  atsScore: number;
  moduleScores: ModuleScoreDetail[];
  passedFilters: boolean;
  filterReason: string | null;
}

function scoreModule(
  cv: CVData,
  module: ATSModuleInput,
): { score: number; passed: boolean; reason?: string } {
  const params = module.params ?? {};

  switch (module.type) {
    case "SKILLS":
      return scoreSkills(cv, params as Parameters<typeof scoreSkills>[1]);
    case "EXPERIENCE":
      return scoreExperience(
        cv,
        params as Parameters<typeof scoreExperience>[1],
      );
    case "EDUCATION":
      return scoreEducation(cv, params as Parameters<typeof scoreEducation>[1]);
    case "LANGUAGES":
      return scoreLanguages(cv, params as Parameters<typeof scoreLanguages>[1]);
    case "PORTFOLIO":
      return scorePortfolio(cv, params as Parameters<typeof scorePortfolio>[1]);
    case "CUSTOM":
      // Los módulos CUSTOM arrancan en 50 hasta revisión manual
      return { score: 50, passed: true };
    default:
      return { score: 50, passed: true };
  }
}

export function scoreApplication(
  cvText: string,
  profileSkills: string[],
  modules: ATSModuleInput[],
): ATSResult {
  const activeModules = modules.filter((m) => m.isActive);

  if (activeModules.length === 0) {
    return {
      atsScore: 0,
      moduleScores: [],
      passedFilters: true,
      filterReason: null,
    };
  }

  const cv: CVData = parseCVText(cvText, profileSkills);

  const moduleScores: ModuleScoreDetail[] = [];
  let firstFailReason: string | null = null;

  for (const mod of activeModules) {
    const result = scoreModule(cv, mod);

    moduleScores.push({
      moduleId: mod.id,
      type: mod.type,
      label: mod.label,
      weight: mod.weight,
      score: result.score,
      passed: result.passed,
      reason: result.reason,
    });

    if (!result.passed && !firstFailReason) {
      firstFailReason = result.reason ?? `Módulo "${mod.label}" no superado`;
    }
  }

  // Si algún módulo con hardFilter falló → score total = 0
  if (firstFailReason) {
    return {
      atsScore: 0,
      moduleScores,
      passedFilters: false,
      filterReason: firstFailReason,
    };
  }

  // Suma ponderada normalizada
  const totalWeight = activeModules.reduce((sum, m) => sum + m.weight, 0);
  const weightedSum = moduleScores.reduce(
    (sum, ms) => sum + ms.score * ms.weight,
    0,
  );

  const atsScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    atsScore,
    moduleScores,
    passedFilters: true,
    filterReason: null,
  };
}

import { parseCVText } from "./cv-extractor";
import {
  SCORER_REGISTRY,
  type ScorerType,
  type ScorerResult,
} from "./scorer-registry";

export interface ATSModuleInput {
  id: string;
  type: string;
  label: string;
  isActive: boolean;
  weight: number;
  params: Record<string, unknown>;
}

interface ModuleScoreDetail {
  moduleId: string;
  type: string;
  label: string;
  weight: number;
  score: number;
  passed: boolean;
  reason?: string;
}

interface ATSResult {
  atsScore: number;
  moduleScores: ModuleScoreDetail[];
  passedFilters: boolean;
  filterReason: string | null;
}

// Lookup en el registry. El cast `as never` es el ÚNICO punto donde aceptamos
// que `module.params: Record<string, unknown>` se trate como el shape concreto
// del scorer correspondiente — la garantía viene del `discriminatedUnion` Zod
// del POST /api/ats/config (#F3 audit), que valida cada `params` contra el
// schema strict del `type` antes de persistir el ATSModule en DB.
//
// Tipos `CUSTOM` o desconocidos caen al default (50, passed) sin lookup.
function scoreModule(
  cv: ReturnType<typeof parseCVText>,
  module: ATSModuleInput,
): ScorerResult {
  const scorer = SCORER_REGISTRY[module.type as ScorerType];
  if (!scorer) {
    return { score: 50, passed: true };
  }
  return scorer(cv, (module.params ?? {}) as never);
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

  const cv = parseCVText(cvText, profileSkills);

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

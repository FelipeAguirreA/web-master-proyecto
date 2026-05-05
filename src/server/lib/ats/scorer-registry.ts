import type { CVData } from "./cv-extractor";
import {
  scoreSkills,
  type SkillsParams,
  type ScorerResult,
} from "./scorers/skills.scorer";
import {
  scoreExperience,
  type ExperienceParams,
} from "./scorers/experience.scorer";
import {
  scoreEducation,
  type EducationParams,
} from "./scorers/education.scorer";
import {
  scoreLanguages,
  type LanguagesParams,
} from "./scorers/languages.scorer";
import {
  scorePortfolio,
  type PortfolioParams,
} from "./scorers/portfolio.scorer";

// Mapping discriminado type → params shape. Un scorer nuevo se agrega acá +
// en el registry de abajo, sin tocar el engine. El cast de runtime queda
// centralizado en `scoring-engine.scoreModule()`.
type ScorerParamsMap = {
  SKILLS: SkillsParams;
  EXPERIENCE: ExperienceParams;
  EDUCATION: EducationParams;
  LANGUAGES: LanguagesParams;
  PORTFOLIO: PortfolioParams;
};

export type ScorerType = keyof ScorerParamsMap;

type ScorerFn<K extends ScorerType> = (
  cv: CVData,
  params: ScorerParamsMap[K],
) => ScorerResult;

export const SCORER_REGISTRY: { [K in ScorerType]: ScorerFn<K> } = {
  SKILLS: scoreSkills,
  EXPERIENCE: scoreExperience,
  EDUCATION: scoreEducation,
  LANGUAGES: scoreLanguages,
  PORTFOLIO: scorePortfolio,
};

export type { ScorerResult };

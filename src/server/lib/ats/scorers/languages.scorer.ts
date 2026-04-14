import type { CVData } from "../cv-extractor";
import type { ScorerResult } from "./skills.scorer";

interface LanguagesParams {
  required: string[]; // ej: ["Inglés B2"]
  preferred: string[];
  hardFilter: boolean;
}

const LEVEL_ORDER = [
  "a1",
  "a2",
  "b1",
  "b2",
  "c1",
  "c2",
  "nativo",
  "native",
  "fluido",
  "fluent",
];

function extractLang(entry: string): { lang: string; level: string } {
  const parts = entry.toLowerCase().split(/\s+/);
  const level = parts.find((p) => LEVEL_ORDER.includes(p)) ?? "";
  const lang = parts
    .filter((p) => !LEVEL_ORDER.includes(p))
    .join(" ")
    .trim();
  return { lang, level };
}

function levelIndex(level: string): number {
  const idx = LEVEL_ORDER.indexOf(level.toLowerCase());
  return idx === -1 ? 0 : idx;
}

function candidateHasLanguage(
  cvLanguages: string[],
  required: string,
): boolean {
  const req = extractLang(required);
  return cvLanguages.some((cvLang) => {
    const cv = extractLang(cvLang);
    if (!cv.lang.includes(req.lang) && !req.lang.includes(cv.lang))
      return false;
    if (!req.level) return true; // sin nivel requerido, basta con tener el idioma
    return levelIndex(cv.level) >= levelIndex(req.level);
  });
}

export function scoreLanguages(
  cv: CVData,
  params: LanguagesParams,
): ScorerResult {
  const { required = [], preferred = [], hardFilter = false } = params;

  // Hard filter
  if (hardFilter && required.length > 0) {
    const missing = required.filter(
      (r) => !candidateHasLanguage(cv.languages, r),
    );
    if (missing.length > 0) {
      return {
        score: 0,
        passed: false,
        reason: `Idiomas requeridos faltantes: ${missing.join(", ")}`,
      };
    }
  }

  let requiredScore = 100;
  if (required.length > 0) {
    const matched = required.filter((r) =>
      candidateHasLanguage(cv.languages, r),
    ).length;
    requiredScore = (matched / required.length) * 100;
  }

  let preferredScore = 100;
  if (preferred.length > 0) {
    const matched = preferred.filter((p) =>
      candidateHasLanguage(cv.languages, p),
    ).length;
    preferredScore = (matched / preferred.length) * 100;
  }

  const score = Math.round(requiredScore * 0.7 + preferredScore * 0.3);

  return { score, passed: true };
}

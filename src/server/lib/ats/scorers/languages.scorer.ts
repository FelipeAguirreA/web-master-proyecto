import type { CVData } from "../cv-extractor";
import type { ScorerResult } from "./skills.scorer";

interface LanguagesParams {
  required: string[]; // ej: ["Inglés B2"]
  preferred: string[];
  hardFilter: boolean;
}

// Orden de menor a mayor nivel — incluye CEFR y etiquetas en español
const LEVEL_ORDER = [
  "a1",
  "a2",
  "básico",
  "basico",
  "b1",
  "intermedio",
  "b2",
  "c1",
  "avanzado",
  "c2",
  "fluido",
  "fluent",
  "nativo",
  "native",
];

/** Elimina acentos y pasa a minúsculas para comparación insensible */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractLang(entry: string): { lang: string; level: string } {
  const parts = normalize(entry).split(/\s+/);
  const level = parts.find((p) => LEVEL_ORDER.map(normalize).includes(p)) ?? "";
  const lang = parts
    .filter((p) => !LEVEL_ORDER.map(normalize).includes(p))
    .join(" ")
    .trim();
  return { lang, level };
}

function levelIndex(level: string): number {
  const normalized = LEVEL_ORDER.map(normalize);
  const idx = normalized.indexOf(normalize(level));
  return idx === -1 ? 0 : idx;
}

function candidateHasLanguage(
  cvLanguages: string[],
  required: string,
): boolean {
  const req = extractLang(required);
  return cvLanguages.some((cvLang) => {
    const cv = extractLang(cvLang);
    // Comparación insensible a acentos
    const langMatch = cv.lang.includes(req.lang) || req.lang.includes(cv.lang);
    if (!langMatch) return false;
    if (!req.level) return true; // sin nivel requerido, basta tener el idioma
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

  const missingRequired = required.filter(
    (r) => !candidateHasLanguage(cv.languages, r),
  );

  let requiredScore = 100;
  if (required.length > 0) {
    requiredScore =
      ((required.length - missingRequired.length) / required.length) * 100;
  }

  let preferredScore = 0;
  if (preferred.length > 0) {
    const matchedPref = preferred.filter((p) =>
      candidateHasLanguage(cv.languages, p),
    ).length;
    preferredScore = (matchedPref / preferred.length) * 100;
  }

  // Si no hay preferred, el score es solo el de requeridos
  const score =
    preferred.length > 0
      ? Math.round(requiredScore * 0.7 + preferredScore * 0.3)
      : Math.round(requiredScore);

  const reason =
    missingRequired.length > 0
      ? `Idiomas no encontrados en CV: ${missingRequired.join(", ")}`
      : undefined;

  return { score, passed: true, reason };
}

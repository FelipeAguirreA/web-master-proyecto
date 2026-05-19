import type { CVData } from "../cv-extractor";
import type { ScorerResult } from "./skills.scorer";

export interface CustomParams {
  // Palabras o frases que el reclutador quiere ver en el CV. El scorer mira
  // el `rawText` completo (todo el texto extraído del PDF/DOCX) en lowercase
  // y cuenta cuántas keywords matchean al menos una vez.
  keywords: string[];
  hardFilter: boolean;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export function scoreCustom(cv: CVData, params: CustomParams): ScorerResult {
  const { keywords = [], hardFilter = false } = params;

  const clean = keywords.map(normalize).filter((k) => k.length > 0);

  // Sin keywords configuradas el módulo no aporta info útil: score neutro 50
  // (no penaliza ni premia). El reclutador decidirá si ajustar el peso o
  // eliminar el módulo.
  if (clean.length === 0) {
    return { score: 50, passed: true };
  }

  const haystack = cv.rawText.toLowerCase();
  const matched = clean.filter((kw) => haystack.includes(kw));
  const ratio = matched.length / clean.length;

  if (hardFilter && matched.length === 0) {
    return {
      score: 0,
      passed: false,
      reason: "Ninguna de las palabras clave fue encontrada en el CV",
    };
  }

  return {
    score: Math.round(ratio * 100),
    passed: true,
  };
}

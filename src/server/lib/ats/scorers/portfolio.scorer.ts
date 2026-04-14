import type { CVData } from "../cv-extractor";
import type { ScorerResult } from "./skills.scorer";

interface PortfolioParams {
  required: boolean;
  keywords: string[];
  hardFilter: boolean;
}

export function scorePortfolio(
  cv: CVData,
  params: PortfolioParams,
): ScorerResult {
  const {
    required = false,
    keywords = ["github", "behance", "portfolio"],
    hardFilter = false,
  } = params;

  const lower = cv.rawText.toLowerCase();
  const hasLinks = cv.portfolioLinks.length > 0;
  const hasKeywords = keywords.some((kw) => lower.includes(kw.toLowerCase()));
  const hasPortfolio = hasLinks || hasKeywords || cv.hasPortfolio;

  if (hardFilter && required && !hasPortfolio) {
    return {
      score: 0,
      passed: false,
      reason: "Portafolio requerido no encontrado en el CV",
    };
  }

  if (!hasPortfolio) {
    return { score: required ? 20 : 50, passed: true };
  }

  // Bonus por links directos vs solo mención
  const score = hasLinks ? 100 : 70;

  return { score, passed: true };
}

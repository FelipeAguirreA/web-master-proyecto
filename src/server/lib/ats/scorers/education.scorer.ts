import type { CVData } from "../cv-extractor";
import type { ScorerResult } from "./skills.scorer";

interface EducationParams {
  minGPA: number;
  preferredDegrees: string[];
  hardFilter: boolean;
}

export function scoreEducation(
  cv: CVData,
  params: EducationParams,
): ScorerResult {
  const { minGPA = 0, preferredDegrees = [], hardFilter = false } = params;
  const { degree, gpa } = cv.education;

  // Hard filter
  if (hardFilter && minGPA > 0 && gpa > 0 && gpa < minGPA) {
    return {
      score: 0,
      passed: false,
      reason: `Promedio mínimo requerido: ${minGPA}, candidato tiene: ${gpa}`,
    };
  }

  // Score por GPA (si se especificó mínimo y el CV tiene GPA)
  let gpaScore = 70; // neutral si no hay info
  if (minGPA > 0 && gpa > 0) {
    const maxExpected = 7; // escala chilena
    gpaScore = Math.min(100, (gpa / maxExpected) * 100);
  }

  // Score por carrera preferida
  let degreeScore = 0;
  if (preferredDegrees.length > 0 && degree) {
    const degLower = degree.toLowerCase();
    const matched = preferredDegrees.some((pd) =>
      degLower.includes(pd.toLowerCase()),
    );
    degreeScore = matched ? 30 : 0;
  } else if (degree) {
    degreeScore = 20; // tiene carrera aunque no sea la preferida
  }

  const score = Math.min(100, Math.round(gpaScore * 0.7 + degreeScore));

  return { score, passed: true };
}

import { describe, it, expect } from "vitest";
import { scoreLanguages } from "@/server/lib/ats/scorers/languages.scorer";
import type { CVData } from "@/server/lib/ats/cv-extractor";

function buildCV(languages: string[] = []): CVData {
  return {
    skills: [],
    softSkills: [],
    experience: { totalYears: 0, roles: [] },
    education: { degree: "", gpa: 0, institution: "" },
    languages,
    hasPortfolio: false,
    portfolioLinks: [],
    rawText: "",
  };
}

describe("scoreLanguages — sin requisitos", () => {
  it("sin required ni preferred → score 100", () => {
    const result = scoreLanguages(buildCV(), {
      required: [],
      preferred: [],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });
});

describe("scoreLanguages — hard filter", () => {
  it("hardFilter + idioma faltante → fail con reason", () => {
    const result = scoreLanguages(buildCV([]), {
      required: ["Inglés B2"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe("Idiomas requeridos faltantes: Inglés B2");
  });

  it("hardFilter + idioma presente → pasa", () => {
    const result = scoreLanguages(buildCV(["Inglés C1"]), {
      required: ["Inglés B2"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });
});

describe("scoreLanguages — match de nivel", () => {
  it("nivel del CV mayor al requerido → matchea (C1 >= B2)", () => {
    const result = scoreLanguages(buildCV(["Inglés C1"]), {
      required: ["Inglés B2"],
      preferred: [],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
  });

  it("nivel del CV igual al requerido → matchea (B2 >= B2)", () => {
    const result = scoreLanguages(buildCV(["Inglés B2"]), {
      required: ["Inglés B2"],
      preferred: [],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
  });

  it("nivel del CV menor al requerido → no matchea (A2 < B2)", () => {
    const result = scoreLanguages(buildCV(["Inglés A2"]), {
      required: ["Inglés B2"],
      preferred: [],
      hardFilter: false,
    });
    expect(result.score).toBe(0);
    expect(result.reason).toBe("Idiomas no encontrados en CV: Inglés B2");
  });

  it("requisito sin nivel → matchea con solo tener el idioma", () => {
    const result = scoreLanguages(buildCV(["Inglés"]), {
      required: ["Inglés"],
      preferred: [],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
  });
});

describe("scoreLanguages — normalización", () => {
  it("idioma con acento matchea sin acento y viceversa", () => {
    const result = scoreLanguages(buildCV(["Portugués B2"]), {
      required: ["Portugues B2"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
  });

  it("labels en español (avanzado) matchean CEFR equivalentes", () => {
    // avanzado está en posición 8 de LEVEL_ORDER, c1 en 7 → avanzado >= c1
    const result = scoreLanguages(buildCV(["Inglés avanzado"]), {
      required: ["Inglés C1"],
      preferred: [],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
  });
});

describe("scoreLanguages — preferred", () => {
  it("solo preferred, todas presentes → 100", () => {
    const result = scoreLanguages(buildCV(["Inglés", "Francés"]), {
      required: [],
      preferred: ["Inglés", "Francés"],
      hardFilter: false,
    });
    // requiredScore=100, preferredScore=100 → round(70+30)
    expect(result.score).toBe(100);
  });

  it("preferred parciales + required todas → mix ponderado", () => {
    const result = scoreLanguages(buildCV(["Inglés B2", "Francés"]), {
      required: ["Inglés B2"],
      preferred: ["Francés", "Alemán"],
      hardFilter: false,
    });
    // requiredScore=100, preferredScore=50 → round(70+15)=85
    expect(result.score).toBe(85);
  });

  it("required presentes pero preferred ausentes → score bajo pondera aún", () => {
    const result = scoreLanguages(buildCV(["Inglés"]), {
      required: ["Inglés"],
      preferred: ["Francés", "Alemán"],
      hardFilter: false,
    });
    // required=100, preferred=0 → round(100*0.7 + 0) = 70
    expect(result.score).toBe(70);
  });
});

describe("scoreLanguages — required parciales", () => {
  it("mitad de required matcheados → requiredScore 50", () => {
    const result = scoreLanguages(buildCV(["Inglés B2"]), {
      required: ["Inglés B2", "Portugués B1"],
      preferred: [],
      hardFilter: false,
    });
    expect(result.score).toBe(50);
    expect(result.reason).toContain("Portugués B1");
  });
});

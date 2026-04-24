import { describe, it, expect } from "vitest";
import { scoreExperience } from "@/server/lib/ats/scorers/experience.scorer";
import type { CVData } from "@/server/lib/ats/cv-extractor";

function buildCV(overrides: Partial<CVData["experience"]> = {}): CVData {
  return {
    skills: [],
    softSkills: [],
    experience: { totalYears: 0, roles: [], ...overrides },
    education: { degree: "", gpa: 0, institution: "" },
    languages: [],
    hasPortfolio: false,
    portfolioLinks: [],
    rawText: "",
  };
}

describe("scoreExperience — hard filter", () => {
  it("hardFilter + años insuficientes → fail con reason detallada", () => {
    const cv = buildCV({ totalYears: 1 });
    const result = scoreExperience(cv, {
      minYears: 3,
      preferredRoles: [],
      hardFilter: true,
    });
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(
      "Requiere 3 años de experiencia, el candidato tiene 1",
    );
  });

  it("hardFilter + años exactos → pasa con yearsScore=80", () => {
    const cv = buildCV({ totalYears: 3 });
    const result = scoreExperience(cv, {
      minYears: 3,
      preferredRoles: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(80); // (3/3)*80
  });

  it("hardFilter false con años insuficientes → passed true y score bajo", () => {
    const cv = buildCV({ totalYears: 0 });
    const result = scoreExperience(cv, {
      minYears: 2,
      preferredRoles: [],
      hardFilter: false,
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(0);
  });
});

describe("scoreExperience — score por años", () => {
  it("minYears=0 y totalYears=0 → yearsScore base 100", () => {
    const cv = buildCV({ totalYears: 0 });
    const result = scoreExperience(cv, {
      minYears: 0,
      preferredRoles: [],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
  });

  it("minYears=0 y totalYears=3 → 60 + 3*5 = 75", () => {
    const cv = buildCV({ totalYears: 3 });
    const result = scoreExperience(cv, {
      minYears: 0,
      preferredRoles: [],
      hardFilter: false,
    });
    expect(result.score).toBe(75);
  });

  it("minYears=0 y totalYears alto → cap en 100", () => {
    const cv = buildCV({ totalYears: 20 });
    const result = scoreExperience(cv, {
      minYears: 0,
      preferredRoles: [],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
  });

  it("minYears=2, totalYears=2.5 → cap: (2.5/2)*80 = 100", () => {
    const cv = buildCV({ totalYears: 2.5 });
    const result = scoreExperience(cv, {
      minYears: 2,
      preferredRoles: [],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
  });
});

describe("scoreExperience — score por roles preferidos", () => {
  it("todos los preferredRoles matcheados suma +20", () => {
    const cv = buildCV({ totalYears: 2, roles: ["developer", "analyst"] });
    const result = scoreExperience(cv, {
      minYears: 2,
      preferredRoles: ["Developer", "Analyst"],
      hardFilter: false,
    });
    // yearsScore = 80, roleScore = (2/2)*20 = 20 → min(100, 100)
    expect(result.score).toBe(100);
  });

  it("solo algunos preferredRoles matcheados → roleScore proporcional", () => {
    const cv = buildCV({ totalYears: 1, roles: ["developer"] });
    const result = scoreExperience(cv, {
      minYears: 2,
      preferredRoles: ["Developer", "Manager"],
      hardFilter: false,
    });
    // yearsScore = (1/2)*80 = 40, roleScore = (1/2)*20 = 10 → 50
    expect(result.score).toBe(50);
  });

  it("ningún preferredRole matchea → roleScore = 0", () => {
    const cv = buildCV({ totalYears: 2, roles: ["intern"] });
    const result = scoreExperience(cv, {
      minYears: 2,
      preferredRoles: ["Manager"],
      hardFilter: false,
    });
    expect(result.score).toBe(80); // yearsScore solo
  });

  it("preferredRoles vacío no altera el score de años", () => {
    const cv = buildCV({ totalYears: 3, roles: ["developer"] });
    const result = scoreExperience(cv, {
      minYears: 0,
      preferredRoles: [],
      hardFilter: false,
    });
    expect(result.score).toBe(75); // solo yearsScore
  });
});

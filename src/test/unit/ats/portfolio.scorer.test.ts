import { describe, it, expect } from "vitest";
import { scorePortfolio } from "@/server/lib/ats/scorers/portfolio.scorer";
import type { CVData } from "@/server/lib/ats/cv-extractor";

function buildCV(overrides: Partial<CVData> = {}): CVData {
  return {
    skills: [],
    softSkills: [],
    experience: { totalYears: 0, roles: [] },
    education: { degree: "", gpa: 0, institution: "" },
    languages: [],
    hasPortfolio: false,
    portfolioLinks: [],
    rawText: "",
    ...overrides,
  };
}

describe("scorePortfolio — hard filter", () => {
  it("required=true + hardFilter=true + sin portafolio → fail", () => {
    const result = scorePortfolio(buildCV(), {
      required: true,
      keywords: ["github"],
      hardFilter: true,
    });
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe("Portafolio requerido no encontrado en el CV");
  });

  it("required=true + hardFilter=true + con links → pasa con 100", () => {
    const cv = buildCV({ portfolioLinks: ["https://github.com/user"] });
    const result = scorePortfolio(cv, {
      required: true,
      keywords: ["github"],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it("required=false + hardFilter=true + sin portafolio → NO falla (required gobierna hard)", () => {
    const result = scorePortfolio(buildCV(), {
      required: false,
      keywords: ["github"],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(50);
  });
});

describe("scorePortfolio — sin portafolio", () => {
  it("required=true → score 20", () => {
    const result = scorePortfolio(buildCV(), {
      required: true,
      keywords: ["github"],
      hardFilter: false,
    });
    expect(result.score).toBe(20);
    expect(result.passed).toBe(true);
  });

  it("required=false → score 50", () => {
    const result = scorePortfolio(buildCV(), {
      required: false,
      keywords: ["github"],
      hardFilter: false,
    });
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });
});

describe("scorePortfolio — con portafolio", () => {
  it("links directos → score 100", () => {
    const cv = buildCV({
      portfolioLinks: ["https://github.com/foo", "https://behance.net/bar"],
    });
    const result = scorePortfolio(cv, {
      required: false,
      keywords: [],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
  });

  it("solo keyword en rawText → score 70", () => {
    const cv = buildCV({ rawText: "tengo un github con mis proyectos" });
    const result = scorePortfolio(cv, {
      required: false,
      keywords: ["github"],
      hardFilter: false,
    });
    expect(result.score).toBe(70);
  });

  it("flag hasPortfolio del extractor → score 70", () => {
    const cv = buildCV({ hasPortfolio: true });
    const result = scorePortfolio(cv, {
      required: false,
      keywords: [],
      hardFilter: false,
    });
    expect(result.score).toBe(70);
  });

  it("keyword case-insensitive", () => {
    const cv = buildCV({ rawText: "revisá mi BEHANCE" });
    const result = scorePortfolio(cv, {
      required: true,
      keywords: ["behance"],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(70);
  });
});

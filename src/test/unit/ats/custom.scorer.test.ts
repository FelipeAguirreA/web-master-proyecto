import { describe, it, expect } from "vitest";
import { scoreCustom } from "@/server/lib/ats/scorers/custom.scorer";
import type { CVData } from "@/server/lib/ats/cv-extractor";

function buildCV(rawText: string = ""): CVData {
  return {
    skills: [],
    softSkills: [],
    experience: { totalYears: 0, roles: [] },
    education: { degree: "", gpa: 0, institution: "" },
    languages: [],
    hasPortfolio: false,
    portfolioLinks: [],
    rawText,
  };
}

describe("scoreCustom", () => {
  it("retorna score neutro 50 cuando no hay keywords configuradas", () => {
    const result = scoreCustom(buildCV("cualquier texto"), {
      keywords: [],
      hardFilter: false,
    });
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });

  it("retorna score neutro 50 cuando keywords son solo espacios (se filtran)", () => {
    const result = scoreCustom(buildCV("cualquier texto"), {
      keywords: ["   ", ""],
      hardFilter: false,
    });
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });

  it("retorna 100 cuando todas las keywords aparecen en el CV", () => {
    const result = scoreCustom(buildCV("experiencia en react y typescript"), {
      keywords: ["react", "typescript"],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("retorna 0 cuando ninguna keyword aparece y hardFilter es false", () => {
    const result = scoreCustom(buildCV("experiencia en java y spring"), {
      keywords: ["react", "typescript"],
      hardFilter: false,
    });
    expect(result.score).toBe(0);
    expect(result.passed).toBe(true);
  });

  it("retorna passed:false y score:0 cuando hardFilter:true y ninguna keyword matchea", () => {
    const result = scoreCustom(buildCV("experiencia en java y spring"), {
      keywords: ["react", "typescript"],
      hardFilter: true,
    });
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("retorna 50 cuando la mitad de las keywords aparecen", () => {
    const result = scoreCustom(buildCV("usa react diariamente"), {
      keywords: ["react", "typescript"],
      hardFilter: false,
    });
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });

  it("la búsqueda es case-insensitive (keyword en mayúscula, CV en minúscula)", () => {
    const result = scoreCustom(buildCV("domina react y typescript"), {
      keywords: ["REACT", "TypeScript"],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
  });

  it("no lanza cuando hardFilter:true y hay al menos una keyword que matchea", () => {
    // "domina react solamente" NO contiene "typescript" como substring
    const result = scoreCustom(buildCV("domina react solamente"), {
      keywords: ["react", "typescript"],
      hardFilter: true,
    });
    // Matchea 1 de 2 → score 50, passed true (hardFilter solo bloquea si matched.length === 0)
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });
});

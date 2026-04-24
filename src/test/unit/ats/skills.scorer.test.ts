import { describe, it, expect } from "vitest";
import { scoreSkills } from "@/server/lib/ats/scorers/skills.scorer";
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

describe("scoreSkills — required empty", () => {
  it("retorna 100 cuando no hay required ni preferred", () => {
    const cv = buildCV();
    const result = scoreSkills(cv, {
      required: [],
      preferred: [],
      hardFilter: false,
    });
    expect(result).toEqual({ score: 100, passed: true, reason: undefined });
  });

  it("con solo preferred y ninguna matcheada: score = round(100*0.7 + 0*0.3) = 70", () => {
    const cv = buildCV({ skills: [], rawText: "" });
    const result = scoreSkills(cv, {
      required: [],
      preferred: ["React", "Vue"],
      hardFilter: false,
    });
    expect(result.score).toBe(70);
    expect(result.passed).toBe(true);
  });
});

describe("scoreSkills — hard filter", () => {
  it("hardFilter + missing required → score 0, passed false, reason con lista", () => {
    const cv = buildCV({ skills: ["python"], rawText: "python" });
    const result = scoreSkills(cv, {
      required: ["React", "Node"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe("Faltan skills requeridas: React, Node");
  });

  it("hardFilter + todo presente → score 100 y passed true", () => {
    const cv = buildCV({ skills: ["react", "node"], rawText: "react node" });
    const result = scoreSkills(cv, {
      required: ["React", "Node"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("hardFilter false con missing → passed true, score refleja match parcial", () => {
    const cv = buildCV({ skills: ["react"], rawText: "react" });
    const result = scoreSkills(cv, {
      required: ["React", "Node", "Postgres"],
      preferred: [],
      hardFilter: false,
    });
    expect(result.score).toBe(33); // round((1/3)*100)
    expect(result.passed).toBe(true);
    expect(result.reason).toBe("Skills no encontradas en CV: Node, Postgres");
  });
});

describe("scoreSkills — mezcla required + preferred", () => {
  it("todas presentes → score 100 (0.7*100 + 0.3*100)", () => {
    const cv = buildCV({
      skills: ["react", "node", "docker"],
      rawText: "react node docker",
    });
    const result = scoreSkills(cv, {
      required: ["React", "Node"],
      preferred: ["Docker"],
      hardFilter: false,
    });
    expect(result.score).toBe(100);
    expect(result.reason).toBeUndefined();
  });

  it("required completas + preferred vacías → 70 = round(100*0.7 + 0*0.3)", () => {
    const cv = buildCV({ skills: ["react"], rawText: "react" });
    const result = scoreSkills(cv, {
      required: ["React"],
      preferred: ["Docker", "K8s"],
      hardFilter: false,
    });
    expect(result.score).toBe(70);
  });

  it("required parciales + preferred parciales → mix ponderada", () => {
    // required: 1/2 = 50; preferred: 1/2 = 50 → round(50*0.7 + 50*0.3) = 50
    const cv = buildCV({
      skills: ["react", "docker"],
      rawText: "react docker",
    });
    const result = scoreSkills(cv, {
      required: ["React", "Node"],
      preferred: ["Docker", "K8s"],
      hardFilter: false,
    });
    expect(result.score).toBe(50);
    expect(result.reason).toContain("Node");
  });
});

describe("scoreSkills — hasSkill detection", () => {
  it("matchea por cv.skills exacta (case insensitive)", () => {
    const cv = buildCV({ skills: ["React"], rawText: "" });
    const result = scoreSkills(cv, {
      required: ["react"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it("matchea cuando la skill del CV incluye el target (react native → react)", () => {
    const cv = buildCV({ skills: ["react native"], rawText: "" });
    const result = scoreSkills(cv, {
      required: ["react"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
  });

  it("NO matchea al revés (skill='c' → target='css' no matchea)", () => {
    const cv = buildCV({ skills: ["c"], rawText: "c" });
    const result = scoreSkills(cv, {
      required: ["css"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("css");
  });

  it("matchea por rawText con word boundary", () => {
    const cv = buildCV({
      skills: [],
      rawText: "Working with TypeScript daily",
    });
    const result = scoreSkills(cv, {
      required: ["TypeScript"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
  });

  it("word boundary evita matches parciales (target 'c' en rawText 'css programming')", () => {
    const cv = buildCV({ skills: [], rawText: "css programming" });
    const result = scoreSkills(cv, {
      required: ["c"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(false);
  });

  it("target con caracteres especiales (C++) no rompe el regex", () => {
    const cv = buildCV({ skills: [], rawText: "programo en java" });
    const result = scoreSkills(cv, {
      required: ["C++"],
      preferred: [],
      hardFilter: false,
    });
    // El escape de los caracteres especiales garantiza que no crashee
    expect(result.passed).toBe(true);
    expect(result.score).toBe(0);
  });

  it("target vacío no matchea (retorna false en hasSkill)", () => {
    const cv = buildCV({ skills: ["react"], rawText: "react" });
    const result = scoreSkills(cv, {
      required: [""],
      preferred: [],
      hardFilter: true,
    });
    // "" normaliza a "" → retorna false directo
    expect(result.passed).toBe(false);
  });

  it("normaliza puntos, guiones y underscores (node.js → node js)", () => {
    const cv = buildCV({ skills: ["Node.js"], rawText: "" });
    const result = scoreSkills(cv, {
      required: ["node-js"],
      preferred: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
  });
});

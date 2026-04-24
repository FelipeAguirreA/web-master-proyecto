import { describe, it, expect } from "vitest";
import { scoreEducation } from "@/server/lib/ats/scorers/education.scorer";
import type { CVData } from "@/server/lib/ats/cv-extractor";

function buildCV(overrides: Partial<CVData["education"]> = {}): CVData {
  return {
    skills: [],
    softSkills: [],
    experience: { totalYears: 0, roles: [] },
    education: { degree: "", gpa: 0, institution: "", ...overrides },
    languages: [],
    hasPortfolio: false,
    portfolioLinks: [],
    rawText: "",
  };
}

describe("scoreEducation — hard filter", () => {
  it("GPA menor al mínimo con hardFilter → fail con reason", () => {
    const cv = buildCV({ gpa: 5.5 });
    const result = scoreEducation(cv, {
      minGPA: 6,
      preferredDegrees: [],
      hardFilter: true,
    });
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(
      "Promedio mínimo requerido: 6, candidato tiene: 5.5",
    );
  });

  it("GPA suficiente con hardFilter → pasa", () => {
    const cv = buildCV({ gpa: 6.5 });
    const result = scoreEducation(cv, {
      minGPA: 6,
      preferredDegrees: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
  });

  it("CV sin GPA (gpa=0) + hardFilter → NO falla (no hay dato para comparar)", () => {
    const cv = buildCV({ gpa: 0 });
    const result = scoreEducation(cv, {
      minGPA: 6,
      preferredDegrees: [],
      hardFilter: true,
    });
    expect(result.passed).toBe(true);
    // gpaScore queda en 70 (default neutral), degreeScore=0
    expect(result.score).toBe(49); // round(70*0.7 + 0)
  });

  it("hardFilter=false con GPA bajo → passed true y score bajo", () => {
    const cv = buildCV({ gpa: 4 });
    const result = scoreEducation(cv, {
      minGPA: 6,
      preferredDegrees: [],
      hardFilter: false,
    });
    expect(result.passed).toBe(true);
    // gpaScore = (4/7)*100 = 57.14 → round(57.14*0.7 + 0) = 40
    expect(result.score).toBe(40);
  });
});

describe("scoreEducation — score por GPA", () => {
  it("sin minGPA ni gpa → usa neutral 70 → score 49", () => {
    const cv = buildCV();
    const result = scoreEducation(cv, {
      minGPA: 0,
      preferredDegrees: [],
      hardFilter: false,
    });
    expect(result.score).toBe(49);
  });

  it("GPA máximo en escala chilena (7) → gpaScore 100 → score 70", () => {
    const cv = buildCV({ gpa: 7 });
    const result = scoreEducation(cv, {
      minGPA: 5,
      preferredDegrees: [],
      hardFilter: false,
    });
    expect(result.score).toBe(70); // round(100*0.7 + 0)
  });

  it("GPA mayor a 7 → cap en 100", () => {
    const cv = buildCV({ gpa: 8 });
    const result = scoreEducation(cv, {
      minGPA: 5,
      preferredDegrees: [],
      hardFilter: false,
    });
    expect(result.score).toBe(70);
  });
});

describe("scoreEducation — score por carrera", () => {
  it("carrera preferida matcheada → +30", () => {
    const cv = buildCV({ degree: "Ingeniería Civil Informática" });
    const result = scoreEducation(cv, {
      minGPA: 0,
      preferredDegrees: ["ingeniería"],
      hardFilter: false,
    });
    // gpaScore=70, degreeScore=30 → round(49+30)=79
    expect(result.score).toBe(79);
  });

  it("carrera preferida NO matcheada → +0", () => {
    const cv = buildCV({ degree: "Licenciatura en Historia" });
    const result = scoreEducation(cv, {
      minGPA: 0,
      preferredDegrees: ["ingeniería", "ciencias"],
      hardFilter: false,
    });
    expect(result.score).toBe(49); // solo gpaScore
  });

  it("sin preferredDegrees pero con degree → +20", () => {
    const cv = buildCV({ degree: "Licenciatura en Historia" });
    const result = scoreEducation(cv, {
      minGPA: 0,
      preferredDegrees: [],
      hardFilter: false,
    });
    // 70*0.7 + 20 = 69
    expect(result.score).toBe(69);
  });

  it("sin degree ni preferredDegrees → degreeScore 0", () => {
    const cv = buildCV({ degree: "" });
    const result = scoreEducation(cv, {
      minGPA: 0,
      preferredDegrees: [],
      hardFilter: false,
    });
    expect(result.score).toBe(49);
  });

  it("match de carrera case-insensitive", () => {
    const cv = buildCV({ degree: "Bachelor in Computer Science" });
    const result = scoreEducation(cv, {
      minGPA: 0,
      preferredDegrees: ["BACHELOR"],
      hardFilter: false,
    });
    expect(result.score).toBe(79);
  });

  it("combinación GPA + carrera preferida cap en 100", () => {
    const cv = buildCV({ gpa: 7, degree: "Ingeniería Informática" });
    const result = scoreEducation(cv, {
      minGPA: 6,
      preferredDegrees: ["ingeniería"],
      hardFilter: false,
    });
    // gpaScore=100, degreeScore=30 → min(100, round(70+30))=100
    expect(result.score).toBe(100);
  });
});

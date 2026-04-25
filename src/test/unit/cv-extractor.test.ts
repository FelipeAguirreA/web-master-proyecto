import { describe, it, expect } from "vitest";
import { parseCVText } from "@/server/lib/ats/cv-extractor";

describe("parseCVText — entrada vacía", () => {
  it("maneja string vacío sin crashear", () => {
    const result = parseCVText("");
    expect(result.skills).toEqual([]);
    expect(result.softSkills).toEqual([]);
    expect(result.experience.totalYears).toBe(0);
    expect(result.experience.roles).toEqual([]);
    expect(result.education.degree).toBe("");
    expect(result.education.gpa).toBe(0);
    expect(result.education.institution).toBe("");
    expect(result.languages).toEqual([]);
    expect(result.hasPortfolio).toBe(false);
    expect(result.portfolioLinks).toEqual([]);
  });

  it("maneja null como entrada (cvText opcional)", () => {
    const result = parseCVText(null as unknown as string);
    expect(result.rawText).toBe("");
    expect(result.skills).toEqual([]);
  });
});

describe("parseCVText — skills", () => {
  it("incluye los profileSkills aunque no estén en el texto", () => {
    const result = parseCVText("Texto vacío", ["TypeScript", "React"]);
    expect(result.skills).toContain("typescript");
    expect(result.skills).toContain("react");
  });

  it("normaliza skills a lowercase", () => {
    const result = parseCVText("", ["Node.JS", "GraphQL"]);
    expect(result.skills).toContain("node.js");
    expect(result.skills).toContain("graphql");
  });
});

describe("parseCVText — soft skills", () => {
  it("detecta soft skills presentes en el texto", () => {
    const result = parseCVText(
      "Tengo liderazgo, trabajo en equipo y comunicación efectiva",
    );
    expect(result.softSkills).toContain("liderazgo");
    expect(result.softSkills).toContain("trabajo en equipo");
    expect(result.softSkills).toContain("comunicación");
  });

  it("no incluye soft skills que no aparecen", () => {
    const result = parseCVText("Solo programador puro");
    expect(result.softSkills).not.toContain("liderazgo");
  });
});

describe("parseCVText — experiencia (totalYears)", () => {
  it("detecta '5 años de experiencia'", () => {
    const result = parseCVText("Tengo 5 años de experiencia en frontend");
    expect(result.experience.totalYears).toBe(5);
  });

  it("detecta '3 years experience'", () => {
    const result = parseCVText("3 years experience as developer");
    expect(result.experience.totalYears).toBe(3);
  });

  it("ignora valores fuera de rango (0 o ≥50)", () => {
    const result = parseCVText(
      "Hace 60 años trabajaba pero 0 años de experiencia",
    );
    expect(result.experience.totalYears).toBe(0);
  });

  it("calcula años por rangos de fecha cuando no hay 'X años'", () => {
    const result = parseCVText("Trabajé en Acme 2018-2022");
    expect(result.experience.totalYears).toBe(4);
  });

  it("calcula desde 'presente' usando el año actual", () => {
    const currentYear = new Date().getFullYear();
    const result = parseCVText("Trabajo en Acme 2020-presente");
    expect(result.experience.totalYears).toBe(currentYear - 2020);
  });

  it("limita el rango a 40 años máximo", () => {
    const result = parseCVText("Carrera 2000-2080");
    // 2080 se interpreta como 2080 dentro del regex 20\d{2}, pero limita a 40
    expect(result.experience.totalYears).toBeLessThanOrEqual(40);
  });
});

describe("parseCVText — roles", () => {
  it("detecta roles únicos sin duplicar", () => {
    const result = parseCVText("Frontend Developer y luego Senior Developer");
    expect(result.experience.roles).toContain("developer");
    expect(
      result.experience.roles.filter((r) => r === "developer"),
    ).toHaveLength(1);
  });

  it("detecta múltiples roles distintos", () => {
    const result = parseCVText("Engineer y luego Manager y Analyst");
    expect(result.experience.roles).toEqual(
      expect.arrayContaining(["engineer", "manager", "analyst"]),
    );
  });

  it("detecta roles en español (pasante, jefe)", () => {
    const result = parseCVText("Pasante en Acme y luego Jefe del área");
    expect(result.experience.roles).toEqual(
      expect.arrayContaining(["pasante", "jefe"]),
    );
  });
});

describe("parseCVText — educación", () => {
  it("detecta carrera por palabra clave 'Ingeniería'", () => {
    const result = parseCVText("Ingeniería en Sistemas - UBA");
    expect(result.education.degree.toLowerCase()).toContain("ingeniería");
  });

  it("detecta GPA con 'promedio 6.2'", () => {
    const result = parseCVText("Promedio: 6.2 en escala de 7");
    expect(result.education.gpa).toBe(6.2);
  });

  it("detecta GPA con coma como decimal ('promedio 6,5')", () => {
    const result = parseCVText("Promedio: 6,5");
    expect(result.education.gpa).toBe(6.5);
  });

  it("detecta institución con 'universidad'", () => {
    const result = parseCVText("Estudié en Universidad de Chile\nOtras cosas");
    expect(result.education.institution.toLowerCase()).toContain("universidad");
  });

  it("detecta institución con 'university'", () => {
    const result = parseCVText("Stanford University\nGraduated 2020");
    expect(result.education.institution).toContain("Stanford");
  });

  it("detecta institución con 'instituto'", () => {
    const result = parseCVText("Instituto Politécnico de Chile");
    expect(result.education.institution.toLowerCase()).toContain("instituto");
  });

  it("detecta institución con 'college'", () => {
    const result = parseCVText("Boston College\n");
    expect(result.education.institution).toContain("Boston College");
  });
});

describe("parseCVText — idiomas", () => {
  it("detecta inglés sin nivel", () => {
    const result = parseCVText("Hablo inglés y español");
    expect(result.languages).toContain("Inglés");
  });

  it("detecta inglés con nivel B2", () => {
    const result = parseCVText("Inglés B2 certificado");
    expect(result.languages).toContain("Inglés B2");
  });

  it("detecta inglés con nivel descriptivo (avanzado)", () => {
    const result = parseCVText("Inglés avanzado");
    expect(result.languages.some((l) => l.startsWith("Inglés"))).toBe(true);
  });

  it("detecta múltiples idiomas", () => {
    const result = parseCVText("Hablo inglés, francés y portugués");
    expect(result.languages).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Inglés"),
        expect.stringContaining("Francés"),
        expect.stringContaining("Portugués"),
      ]),
    );
  });

  it("detecta alemán y italiano", () => {
    const result = parseCVText("Deutsch C1, italiano básico");
    expect(result.languages.some((l) => l.startsWith("Alemán"))).toBe(true);
    expect(result.languages.some((l) => l.startsWith("Italiano"))).toBe(true);
  });

  it("detecta chino (mandarin)", () => {
    const result = parseCVText("Mandarin nativo");
    expect(result.languages.some((l) => l.startsWith("Chino"))).toBe(true);
  });
});

describe("parseCVText — portfolio", () => {
  it("detecta portafolio cuando hay links a github", () => {
    const result = parseCVText("Mi github: https://github.com/usuario");
    expect(result.hasPortfolio).toBe(true);
    expect(result.portfolioLinks).toContain("https://github.com/usuario");
  });

  it("detecta links a behance", () => {
    const result = parseCVText("https://behance.net/diseñador");
    expect(result.hasPortfolio).toBe(true);
    expect(result.portfolioLinks.length).toBeGreaterThan(0);
  });

  it("detecta links a dev.to", () => {
    const result = parseCVText("Mis posts: https://dev.to/usuario/post-1");
    expect(result.hasPortfolio).toBe(true);
    expect(result.portfolioLinks.length).toBeGreaterThan(0);
  });

  it("hasPortfolio true por keyword 'portafolio' aunque no haya link", () => {
    const result = parseCVText("Tengo un portafolio en construcción");
    expect(result.hasPortfolio).toBe(true);
    expect(result.portfolioLinks).toEqual([]);
  });

  it("hasPortfolio false sin links ni keywords", () => {
    const result = parseCVText("Programador con experiencia");
    expect(result.hasPortfolio).toBe(false);
  });
});

describe("parseCVText — rawText", () => {
  it("conserva el texto original en rawText", () => {
    const text = "  Texto Original\n con saltos  ";
    const result = parseCVText(text);
    expect(result.rawText).toBe(text);
  });
});

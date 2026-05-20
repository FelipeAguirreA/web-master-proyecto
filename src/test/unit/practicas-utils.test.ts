import { describe, it, expect, vi } from "vitest";

// companyColor y companyInitials se usan internamente — mockeamos para aislar la lógica
vi.mock("@/components/dashboard/companyColors", () => ({
  companyColor: vi.fn(() => ({ bg: "#FF6A3D", fg: "#fff" })),
  companyInitials: vi.fn((n: string) => n.slice(0, 2).toUpperCase()),
}));

import {
  toCard,
  buildPageList,
  type ApiInternship,
} from "@/app/practicas/utils";

function makeInternship(overrides: Partial<ApiInternship> = {}): ApiInternship {
  return {
    id: "int-1",
    title: "Dev Junior",
    area: "Tech",
    location: "Santiago",
    modality: "REMOTE",
    duration: "3 meses",
    company: { companyName: "TechCo", logo: null },
    ...overrides,
  };
}

describe("toCard", () => {
  it("asigna score de 0 cuando score es null", () => {
    const card = toCard(makeInternship(), null, false);
    expect(card.score).toBe(0);
  });

  it("asigna el score cuando se pasa un valor", () => {
    const card = toCard(makeInternship(), 85, false);
    expect(card.score).toBe(85);
  });

  it("top es 'Top 5%' para score >= 95", () => {
    expect(toCard(makeInternship(), 95, false).top).toBe("Top 5%");
    expect(toCard(makeInternship(), 100, false).top).toBe("Top 5%");
  });

  it("top es 'Top 10%' para score entre 90 y 94", () => {
    expect(toCard(makeInternship(), 90, false).top).toBe("Top 10%");
    expect(toCard(makeInternship(), 94, false).top).toBe("Top 10%");
  });

  it("top es 'Top 20%' para score entre 80 y 89", () => {
    expect(toCard(makeInternship(), 80, false).top).toBe("Top 20%");
    expect(toCard(makeInternship(), 89, false).top).toBe("Top 20%");
  });

  it("top es null para score < 80", () => {
    expect(toCard(makeInternship(), 79, false).top).toBeNull();
    expect(toCard(makeInternship(), 0, false).top).toBeNull();
  });

  it("traduce la modalidad REMOTE a 'Remoto'", () => {
    const card = toCard(makeInternship({ modality: "REMOTE" }), null, false);
    expect(card.mode).toContain("Remoto");
  });

  it("traduce la modalidad ONSITE a 'Presencial'", () => {
    const card = toCard(makeInternship({ modality: "ONSITE" }), null, false);
    expect(card.mode).toContain("Presencial");
  });

  it("traduce la modalidad HYBRID a 'Híbrido'", () => {
    const card = toCard(makeInternship({ modality: "HYBRID" }), null, false);
    expect(card.mode).toContain("Híbrido");
  });

  it("isNew es true para una práctica de menos de 7 días", () => {
    const recentDate = new Date(
      Date.now() - 2 * 24 * 3600 * 1000,
    ).toISOString();
    const card = toCard(makeInternship({ createdAt: recentDate }), null, false);
    expect(card.isNew).toBe(true);
  });

  it("isNew es false para una práctica de más de 7 días", () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
    const card = toCard(makeInternship({ createdAt: oldDate }), null, false);
    expect(card.isNew).toBe(false);
  });

  it("isNew es false cuando no hay createdAt", () => {
    const card = toCard(makeInternship({ createdAt: undefined }), null, false);
    expect(card.isNew).toBe(false);
  });

  it("limita tags a 4 skills", () => {
    const card = toCard(
      makeInternship({ skills: ["a", "b", "c", "d", "e", "f"] }),
      null,
      false,
    );
    expect(card.tags).toHaveLength(4);
  });

  it("applied se pasa correctamente al resultado", () => {
    expect(toCard(makeInternship(), null, true).applied).toBe(true);
    expect(toCard(makeInternship(), null, false).applied).toBe(false);
  });
});

describe("buildPageList", () => {
  it("retorna [1..total] cuando total <= 7", () => {
    expect(buildPageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageList(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("incluye siempre 1 y total", () => {
    const pages = buildPageList(5, 10);
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(10);
  });

  it("agrega '…' antes del rango cuando current está lejos del inicio", () => {
    const pages = buildPageList(6, 10);
    expect(pages).toContain("…");
    expect(pages[1]).toBe("…");
  });

  it("agrega '…' después del rango cuando current está lejos del final", () => {
    const pages = buildPageList(2, 10);
    expect(pages).toContain("…");
  });

  it("no agrega '…' innecesario al inicio cuando current es 2", () => {
    const pages = buildPageList(2, 10);
    // start = max(2, 1) = 2, no gap
    expect(pages[1]).not.toBe("…");
  });

  it("muestra el rango current-1..current+1 en el medio", () => {
    const pages = buildPageList(5, 10);
    expect(pages).toContain(4);
    expect(pages).toContain(5);
    expect(pages).toContain(6);
  });
});

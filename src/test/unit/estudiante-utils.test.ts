import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/dashboard/companyColors", () => ({
  companyColor: vi.fn(() => ({ bg: "#FF6A3D", fg: "#fff" })),
  companyInitials: vi.fn((n: string) => n.slice(0, 2).toUpperCase()),
}));

import {
  relativeTime,
  toPracticaCard,
  stageFor,
  buildPipeline,
  notifToActivity,
} from "@/app/(dashboard)/dashboard/estudiante/utils";

// ─── relativeTime ──────────────────────────────────────────────────────────────

describe("relativeTime", () => {
  it("retorna 'hace un rato' para fechas inválidas", () => {
    expect(relativeTime("not-a-date")).toBe("hace un rato");
  });

  it("retorna 'hace un instante' para menos de 30 segundos (< 1 min redondeado)", () => {
    // Math.round(29000/60000) = 0 → "hace un instante"
    const now = new Date(Date.now() - 29 * 1000).toISOString();
    expect(relativeTime(now)).toBe("hace un instante");
  });

  it("retorna 'hace N min' para menos de 60 minutos", () => {
    const ago = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(ago)).toBe("hace 5 min");
  });

  it("retorna 'hace N h' para menos de 24 horas", () => {
    const ago = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(relativeTime(ago)).toBe("hace 3 h");
  });

  it("retorna 'ayer' cuando Math.round(days)===1 (exactamente 24h)", () => {
    // 24h = 1440 min → hrs = round(1440/60) = 24 → days = round(24/24) = 1
    const ago = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    expect(relativeTime(ago)).toBe("ayer");
  });

  it("retorna 'hace N días' para 2-6 días", () => {
    const ago = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    expect(relativeTime(ago)).toBe("hace 3 días");
  });

  it("retorna fecha formateada para más de 7 días", () => {
    const ago = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const result = relativeTime(ago);
    // Debe ser una fecha formateada, no "hace X días"
    expect(result).not.toMatch(/hace \d+ días/);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── toPracticaCard ────────────────────────────────────────────────────────────

describe("toPracticaCard", () => {
  const baseInternship = {
    id: "int-1",
    title: "Frontend Dev",
    area: "Tech",
    location: "Remoto",
    modality: "REMOTE" as const,
    duration: "3 meses",
    company: { companyName: "TechCo", logo: null },
    skills: ["React", "TS", "Node"],
    matchScore: 92,
  };

  it("redondea el score a entero", () => {
    const card = toPracticaCard({ ...baseInternship, matchScore: 85.7 });
    expect(card.score).toBe(86);
  });

  it("usa 0 como score cuando matchScore es undefined", () => {
    const card = toPracticaCard({ ...baseInternship, matchScore: undefined });
    expect(card.score).toBe(0);
  });

  it("asigna 'Top 10%' cuando score es 90", () => {
    expect(toPracticaCard({ ...baseInternship, matchScore: 90 }).top).toBe(
      "Top 10%",
    );
  });

  it("asigna null cuando score < 80", () => {
    expect(
      toPracticaCard({ ...baseInternship, matchScore: 75 }).top,
    ).toBeNull();
  });

  it("traduce modalidad HYBRID correctamente", () => {
    const card = toPracticaCard({ ...baseInternship, modality: "HYBRID" });
    expect(card.mode).toContain("Híbrido");
  });

  it("limita tags a 4", () => {
    const card = toPracticaCard({
      ...baseInternship,
      skills: ["a", "b", "c", "d", "e"],
    });
    expect(card.tags).toHaveLength(4);
  });

  it("isNew es true para createdAt reciente", () => {
    const recent = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    expect(toPracticaCard({ ...baseInternship, createdAt: recent }).isNew).toBe(
      true,
    );
  });

  it("isNew es false sin createdAt", () => {
    const { createdAt: _omit, ...noDate } = {
      ...baseInternship,
      createdAt: undefined,
    };
    expect(toPracticaCard(noDate).isNew).toBe(false);
  });
});

// ─── stageFor ─────────────────────────────────────────────────────────────────

describe("stageFor", () => {
  const base = {
    id: "a1",
    status: "PENDING" as const,
    pipelineStatus: null,
    matchScore: null,
    createdAt: new Date().toISOString(),
    internship: {
      id: "int-1",
      title: "Dev",
      company: { companyName: "Co", logo: null },
    },
  };

  it("retorna 'Oferta' cuando status es ACCEPTED", () => {
    expect(stageFor({ ...base, status: "ACCEPTED" })).toBe("Oferta");
  });

  it("retorna 'Rechazada' cuando status es REJECTED", () => {
    expect(stageFor({ ...base, status: "REJECTED" })).toBe("Rechazada");
  });

  it("retorna 'Entrevista' cuando pipelineStatus es INTERVIEW", () => {
    expect(stageFor({ ...base, pipelineStatus: "INTERVIEW" })).toBe(
      "Entrevista",
    );
  });

  it("retorna 'En revisión' cuando pipelineStatus es REVIEWING", () => {
    expect(stageFor({ ...base, pipelineStatus: "REVIEWING" })).toBe(
      "En revisión",
    );
  });

  it("retorna 'En revisión' cuando status es REVIEWED", () => {
    expect(stageFor({ ...base, status: "REVIEWED" })).toBe("En revisión");
  });

  it("retorna 'Postulé' como default", () => {
    expect(stageFor(base)).toBe("Postulé");
  });
});

// ─── buildPipeline ────────────────────────────────────────────────────────────

describe("buildPipeline", () => {
  const base = {
    id: "a1",
    status: "PENDING" as const,
    pipelineStatus: null,
    matchScore: null,
    createdAt: new Date().toISOString(),
    internship: {
      id: "int-1",
      title: "Dev",
      company: { companyName: "Co", logo: null },
    },
  };

  it("retorna 4 columnas siempre", () => {
    const cols = buildPipeline([]);
    expect(cols).toHaveLength(4);
  });

  it("excluye aplicaciones Rechazadas del pipeline", () => {
    const rejected = { ...base, id: "r1", status: "REJECTED" as const };
    const cols = buildPipeline([rejected]);
    const total = cols.reduce((s, c) => s + c.count, 0);
    expect(total).toBe(0);
  });

  it("distribuye aplicaciones en las columnas correctas", () => {
    const apps = [
      { ...base, id: "a1", status: "PENDING" as const },
      { ...base, id: "a2", status: "REVIEWED" as const },
      { ...base, id: "a3", status: "ACCEPTED" as const },
    ];
    const cols = buildPipeline(apps);
    expect(cols.find((c) => c.stage === "Postulé")?.count).toBe(1);
    expect(cols.find((c) => c.stage === "En revisión")?.count).toBe(1);
    expect(cols.find((c) => c.stage === "Oferta")?.count).toBe(1);
  });
});

// ─── notifToActivity ──────────────────────────────────────────────────────────

describe("notifToActivity", () => {
  const base = {
    id: "n1",
    type: "SOME_TYPE",
    title: "Título",
    body: "Cuerpo",
    createdAt: new Date().toISOString(),
  };

  it("usa ícono '★' para APPLICATION_ACCEPTED", () => {
    const item = notifToActivity({ ...base, type: "APPLICATION_ACCEPTED" });
    expect(item.icon).toBe("★");
  });

  it("usa ícono '✗' para APPLICATION_REJECTED", () => {
    const item = notifToActivity({ ...base, type: "APPLICATION_REJECTED" });
    expect(item.icon).toBe("✗");
  });

  it("usa ícono '✓' para APPLICATION_REVIEWED", () => {
    const item = notifToActivity({ ...base, type: "APPLICATION_REVIEWED" });
    expect(item.icon).toBe("✓");
  });

  it("usa ícono '✓' y color verde para tipo desconocido", () => {
    const item = notifToActivity(base);
    expect(item.icon).toBe("✓");
  });

  it("construye el label como 'título · cuerpo'", () => {
    const item = notifToActivity({ ...base, title: "Hola", body: "Mundo" });
    expect(item.label).toBe("Hola · Mundo");
  });
});

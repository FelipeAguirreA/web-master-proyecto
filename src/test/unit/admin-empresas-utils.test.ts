import { describe, it, expect } from "vitest";
import {
  getEmailDomain,
  isHighRiskEmail,
  isGenericEmail,
  inferRisk,
  daysWaiting,
  pickInitials,
  statusBadge,
  riskColorClass,
  riskBgClass,
  riskBorderClass,
  riskLabel,
} from "@/app/(admin)/admin/empresas/_components/utils";
import type { Company } from "@/app/(admin)/admin/empresas/_components/types";

// ─── getEmailDomain ────────────────────────────────────────────────────────────

describe("getEmailDomain", () => {
  it("extrae el dominio de un email válido", () => {
    expect(getEmailDomain("user@example.com")).toBe("example.com");
  });

  it("retorna null cuando no hay '@'", () => {
    expect(getEmailDomain("nodomain")).toBeNull();
  });

  it("normaliza a minúsculas", () => {
    expect(getEmailDomain("user@EXAMPLE.COM")).toBe("example.com");
  });
});

// ─── isHighRiskEmail ──────────────────────────────────────────────────────────

describe("isHighRiskEmail", () => {
  it("detecta dominio de alto riesgo (mailinator.com)", () => {
    expect(isHighRiskEmail("test@mailinator.com")).toBe(true);
  });

  it("detecta example.com como alto riesgo", () => {
    expect(isHighRiskEmail("a@example.com")).toBe(true);
  });

  it("no marca corporativos como alto riesgo", () => {
    expect(isHighRiskEmail("admin@empresa.cl")).toBe(false);
  });
});

// ─── isGenericEmail ───────────────────────────────────────────────────────────

describe("isGenericEmail", () => {
  it("marca gmail.com como genérico", () => {
    expect(isGenericEmail("user@gmail.com")).toBe(true);
  });

  it("marca hotmail.com como genérico", () => {
    expect(isGenericEmail("user@hotmail.com")).toBe(true);
  });

  it("no marca corporativos como genéricos", () => {
    expect(isGenericEmail("user@empresa.cl")).toBe(false);
  });

  it("marca alto riesgo también como genérico", () => {
    expect(isGenericEmail("user@mailinator.com")).toBe(true);
  });
});

// ─── inferRisk ────────────────────────────────────────────────────────────────

describe("inferRisk", () => {
  const baseCompany = {
    user: { email: "admin@empresa.cl" },
    website: "https://empresa.cl",
  };

  it("nivel 'low' para email corporativo con web", () => {
    const { level } = inferRisk(baseCompany as unknown as Company);
    expect(level).toBe("low");
  });

  it("nivel 'high' para email desechable (mailinator)", () => {
    const co = { ...baseCompany, user: { email: "x@mailinator.com" } };
    const { level } = inferRisk(co as unknown as Company);
    expect(level).toBe("high");
  });

  it("nivel 'high' para email genérico sin web", () => {
    const co = {
      user: { email: "x@gmail.com" },
      website: "",
    };
    const { level } = inferRisk(co as unknown as Company);
    expect(level).toBe("high");
  });

  it("nivel 'medium' para email genérico con web", () => {
    const co = {
      user: { email: "x@gmail.com" },
      website: "https://empresa.cl",
    };
    const { level } = inferRisk(co as unknown as Company);
    expect(level).toBe("medium");
  });

  it("nivel 'medium' para email corporativo sin web", () => {
    const co = {
      user: { email: "admin@empresa.cl" },
      website: null,
    };
    const { level } = inferRisk(co as unknown as Company);
    expect(level).toBe("medium");
  });
});

// ─── daysWaiting ──────────────────────────────────────────────────────────────

describe("daysWaiting", () => {
  it("retorna 0 para fecha de hoy", () => {
    expect(daysWaiting(new Date().toISOString())).toBe(0);
  });

  it("retorna 3 para hace 3 días", () => {
    const d = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    expect(daysWaiting(d)).toBe(3);
  });

  it("no retorna valores negativos para fechas futuras", () => {
    const future = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    expect(daysWaiting(future)).toBe(0);
  });
});

// ─── pickInitials ─────────────────────────────────────────────────────────────

describe("pickInitials", () => {
  it("extrae iniciales de dos palabras", () => {
    expect(pickInitials("Juan Pérez")).toBe("JP");
  });

  it("retorna solo la primera inicial para una sola palabra", () => {
    // map(w => w[0]).join("") para una sola palabra da solo 1 char
    expect(pickInitials("Empresa")).toBe("E");
  });

  it("convierte a mayúsculas", () => {
    expect(pickInitials("ana garcía")).toBe("AG");
  });
});

// ─── statusBadge ──────────────────────────────────────────────────────────────

describe("statusBadge", () => {
  it("retorna label 'Pendiente revisión' para PENDING", () => {
    expect(statusBadge("PENDING").label).toBe("Pendiente revisión");
  });

  it("retorna label 'Aprobada' para APPROVED", () => {
    expect(statusBadge("APPROVED").label).toBe("Aprobada");
  });

  it("retorna label 'Rechazada' para REJECTED", () => {
    expect(statusBadge("REJECTED").label).toBe("Rechazada");
  });

  it("retorna label 'Suspendida' para SUSPENDED", () => {
    expect(statusBadge("SUSPENDED").label).toBe("Suspendida");
  });
});

// ─── riskColorClass / riskBgClass / riskBorderClass / riskLabel ───────────────

describe("riskColorClass", () => {
  it("retorna clase verde para 'low'", () => {
    expect(riskColorClass("low")).toBe("text-green");
  });

  it("retorna clase amber para 'medium'", () => {
    expect(riskColorClass("medium")).toBe("text-amber");
  });

  it("retorna clase rose para 'high'", () => {
    expect(riskColorClass("high")).toBe("text-rose");
  });
});

describe("riskBgClass", () => {
  it("low → bg-green-bg", () => expect(riskBgClass("low")).toBe("bg-green-bg"));
  it("medium → bg-amber-bg", () =>
    expect(riskBgClass("medium")).toBe("bg-amber-bg"));
  it("high → bg-rose-bg", () => expect(riskBgClass("high")).toBe("bg-rose-bg"));
});

describe("riskBorderClass", () => {
  it("low → border-green/20", () =>
    expect(riskBorderClass("low")).toBe("border-green/20"));
  it("medium → border-amber/20", () =>
    expect(riskBorderClass("medium")).toBe("border-amber/20"));
  it("high → border-rose/20", () =>
    expect(riskBorderClass("high")).toBe("border-rose/20"));
});

describe("riskLabel", () => {
  it("low → 'Bajo'", () => expect(riskLabel("low")).toBe("Bajo"));
  it("medium → 'Medio'", () => expect(riskLabel("medium")).toBe("Medio"));
  it("high → 'Alto'", () => expect(riskLabel("high")).toBe("Alto"));
});

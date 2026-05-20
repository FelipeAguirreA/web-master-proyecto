import { describe, it, expect } from "vitest";
import {
  companyColor,
  companyInitials,
} from "@/components/dashboard/companyColors";

describe("companyColor", () => {
  it("retorna el color conocido para 'falabella'", () => {
    const color = companyColor("Falabella");
    expect(color.bg).toBe("#007A33");
    expect(color.fg).toBe("#fff");
  });

  it("es case-insensitive para nombres conocidos", () => {
    expect(companyColor("FALABELLA")).toEqual(companyColor("falabella"));
    expect(companyColor("BCI")).toEqual(companyColor("bci"));
  });

  it("detecta nombre conocido cuando está incluido en un nombre más largo", () => {
    const color = companyColor("Tiendas Falabella S.A.");
    expect(color.bg).toBe("#007A33");
  });

  it("retorna un color de fallback (determinístico) para empresa desconocida", () => {
    const c1 = companyColor("Empresa Desconocida");
    const c2 = companyColor("Empresa Desconocida");
    expect(c1).toEqual(c2);
    expect(c1.bg).toBeDefined();
    expect(c1.fg).toBeDefined();
  });

  it("diferentes empresas desconocidas pueden tener diferentes colores", () => {
    // No necesariamente distinto, pero el hash debe ser determinístico
    const c1 = companyColor("AAAA");
    const c2 = companyColor("ZZZZ");
    // Solo verificamos que ambos tienen la estructura correcta
    expect(c1).toHaveProperty("bg");
    expect(c2).toHaveProperty("fg");
  });

  it("maneja string vacío sin romper", () => {
    const color = companyColor("");
    expect(color).toHaveProperty("bg");
    expect(color).toHaveProperty("fg");
  });
});

describe("companyInitials", () => {
  it("retorna iniciales de dos palabras: 'Mercado Libre' → 'ML'", () => {
    expect(companyInitials("Mercado Libre")).toBe("ML");
  });

  it("retorna las primeras 2 letras para una sola palabra", () => {
    expect(companyInitials("Falabella")).toBe("FA");
  });

  it("retorna '?' cuando el nombre es string vacío", () => {
    expect(companyInitials("")).toBe("?");
  });

  it("retorna '?' cuando el nombre es solo espacios", () => {
    expect(companyInitials("   ")).toBe("?");
  });

  it("usa solo la primera y segunda palabra para más de dos palabras", () => {
    // "Tech Company SA" → "TC"
    expect(companyInitials("Tech Company SA")).toBe("TC");
  });

  it("convierte a mayúsculas", () => {
    expect(companyInitials("acme corp")).toBe("AC");
  });
});

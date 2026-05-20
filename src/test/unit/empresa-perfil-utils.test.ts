import { describe, it, expect } from "vitest";
import {
  pickInitials,
  deriveTagline,
  normalizeUrl,
  stripProtocol,
} from "@/app/(dashboard)/dashboard/empresa/perfil/_components/utils";

describe("pickInitials", () => {
  it("retorna iniciales de dos palabras", () => {
    expect(pickInitials("Tech Corp")).toBe("TC");
  });

  it("retorna la primera inicial para una sola palabra", () => {
    // map(w => w[0]).join("").slice(0, 2) para ["Empresa"] → "E" (1 char)
    expect(pickInitials("Empresa")).toBe("E");
  });

  it("retorna 'PX' para string vacío", () => {
    expect(pickInitials("")).toBe("PX");
  });

  it("convierte a mayúsculas", () => {
    expect(pickInitials("acme corp")).toBe("AC");
  });
});

describe("deriveTagline", () => {
  it("retorna string vacío cuando description es null", () => {
    expect(deriveTagline(null)).toBe("");
  });

  it("retorna string vacío cuando description es string vacío", () => {
    expect(deriveTagline("")).toBe("");
  });

  it("retorna la primera línea de la descripción", () => {
    expect(deriveTagline("Línea uno\nLínea dos")).toBe("Línea uno");
  });

  it("trunca a 137+1 chars ('…') para líneas de más de 140 chars", () => {
    // slice(0, 137) + "…" → 138 chars total ("…" es 1 codepoint JS)
    const longLine = "a".repeat(150);
    const result = deriveTagline(longLine);
    expect(result).toHaveLength(138);
    expect(result.endsWith("…")).toBe(true);
  });

  it("no trunca líneas de exactamente 140 chars", () => {
    const line140 = "a".repeat(140);
    expect(deriveTagline(line140)).toBe(line140);
    expect(deriveTagline(line140).endsWith("…")).toBe(false);
  });

  it("no trunca líneas de menos de 141 chars", () => {
    const short = "Una descripción corta.";
    expect(deriveTagline(short)).toBe(short);
  });

  it("ignora líneas vacías al inicio", () => {
    expect(deriveTagline("\n\nPrimera línea real")).toBe("Primera línea real");
  });
});

describe("normalizeUrl", () => {
  it("no modifica URLs que ya empiezan con http", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("agrega 'https://' a URLs sin protocolo", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });
});

describe("stripProtocol", () => {
  it("elimina 'https://'", () => {
    expect(stripProtocol("https://example.com")).toBe("example.com");
  });

  it("elimina 'http://'", () => {
    expect(stripProtocol("http://example.com")).toBe("example.com");
  });

  it("no modifica URLs sin protocolo", () => {
    expect(stripProtocol("example.com")).toBe("example.com");
  });
});

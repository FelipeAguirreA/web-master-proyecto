import { describe, it, expect } from "vitest";
import {
  publishedAgo,
  avatarColors,
  initialsFor,
  formatRelative,
  startOfDay,
  startOfWeek,
} from "@/components/dashboard/sections/empresa/utils";

// ─── publishedAgo ─────────────────────────────────────────────────────────────

describe("publishedAgo", () => {
  it("retorna 'hoy' para fecha de hoy", () => {
    expect(publishedAgo(new Date().toISOString())).toBe("hoy");
  });

  it("retorna 'ayer' para hace 1 día", () => {
    const d = new Date(Date.now() - 1.5 * 24 * 3600 * 1000).toISOString();
    expect(publishedAgo(d)).toBe("ayer");
  });

  it("retorna 'hace N días' para 2-29 días", () => {
    const d = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    expect(publishedAgo(d)).toBe("hace 5 días");
  });

  it("retorna 'hace 1 mes' para ~30 días", () => {
    const d = new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString();
    expect(publishedAgo(d)).toBe("hace 1 mes");
  });

  it("retorna 'hace N meses' para 2-11 meses", () => {
    const d = new Date(Date.now() - 61 * 24 * 3600 * 1000).toISOString();
    expect(publishedAgo(d)).toBe("hace 2 meses");
  });

  it("retorna 'hace 1 año' para ~365 días", () => {
    const d = new Date(Date.now() - 370 * 24 * 3600 * 1000).toISOString();
    expect(publishedAgo(d)).toBe("hace 1 año");
  });

  it("retorna 'hace N años' para más de 2 años", () => {
    const d = new Date(Date.now() - 750 * 24 * 3600 * 1000).toISOString();
    expect(publishedAgo(d)).toBe("hace 2 años");
  });
});

// ─── avatarColors ─────────────────────────────────────────────────────────────

describe("avatarColors", () => {
  it("retorna un par [bg, fg] de strings", () => {
    const [bg, fg] = avatarColors("Juan Pérez");
    expect(typeof bg).toBe("string");
    expect(typeof fg).toBe("string");
  });

  it("es determinístico — mismo nombre, mismo resultado", () => {
    expect(avatarColors("Empresa ABC")).toEqual(avatarColors("Empresa ABC"));
  });

  it("nombres distintos pueden producir colores distintos (hash)", () => {
    // Solo verificamos que ambos tienen estructura correcta
    const [bg1] = avatarColors("AAAA");
    const [bg2] = avatarColors("ZZZZ");
    expect(bg1).toMatch(/^#/);
    expect(bg2).toMatch(/^#/);
  });
});

// ─── initialsFor ──────────────────────────────────────────────────────────────

describe("initialsFor", () => {
  it("retorna las iniciales del primer y último nombre", () => {
    expect(initialsFor("Juan Carlos Pérez")).toBe("JP");
  });

  it("usa las primeras 2 letras para una sola palabra", () => {
    expect(initialsFor("Empresa")).toBe("EM");
  });

  it("retorna string vacío para string vacío (split devuelve [''])", () => {
    // "".split(/\s+/) = [""] → parts[0].slice(0,2) = "" (sin filter(Boolean))
    expect(initialsFor("")).toBe("");
  });

  it("convierte a mayúsculas", () => {
    expect(initialsFor("ana")).toBe("AN");
  });
});

// ─── formatRelative ───────────────────────────────────────────────────────────

describe("formatRelative", () => {
  it("retorna 'ahora' para menos de 1 minuto", () => {
    const now = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatRelative(now)).toBe("ahora");
  });

  it("retorna 'hace N min' para minutos recientes", () => {
    const ago = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelative(ago)).toBe("hace 10 min");
  });

  it("retorna 'hace N h' para horas recientes", () => {
    const ago = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(formatRelative(ago)).toBe("hace 2 h");
  });

  it("retorna 'hace N d' para días recientes (< 7 días)", () => {
    const ago = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    expect(formatRelative(ago)).toBe("hace 3 d");
  });

  it("retorna fecha formateada para más de 7 días", () => {
    const ago = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const result = formatRelative(ago);
    expect(result).not.toMatch(/hace/);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── startOfDay / startOfWeek ─────────────────────────────────────────────────

describe("startOfDay", () => {
  it("retorna medianoche del mismo día", () => {
    const d = new Date("2026-05-20T15:30:00");
    const sod = startOfDay(d);
    expect(sod.getHours()).toBe(0);
    expect(sod.getMinutes()).toBe(0);
    expect(sod.getSeconds()).toBe(0);
    expect(sod.getDate()).toBe(20);
  });

  it("no muta el objeto original", () => {
    const d = new Date("2026-05-20T15:30:00");
    startOfDay(d);
    expect(d.getHours()).toBe(15);
  });
});

describe("startOfWeek", () => {
  it("retorna el lunes de la semana que contiene la fecha", () => {
    // 2026-05-20 es miércoles
    const d = new Date("2026-05-20T10:00:00");
    const sow = startOfWeek(d);
    // Lunes 2026-05-18
    expect(sow.getDate()).toBe(18);
    expect(sow.getDay()).toBe(1); // 1 = Monday
  });

  it("cuando la fecha ya es lunes, la retorna a sí misma (medianoche)", () => {
    const mon = new Date("2026-05-18T14:00:00"); // lunes
    const sow = startOfWeek(mon);
    expect(sow.getDate()).toBe(18);
    expect(sow.getHours()).toBe(0);
  });

  it("cuando la fecha es domingo, retorna el lunes anterior", () => {
    const sun = new Date("2026-05-17T10:00:00"); // domingo
    const sow = startOfWeek(sun);
    expect(sow.getDate()).toBe(11); // lunes 11 mayo
  });
});

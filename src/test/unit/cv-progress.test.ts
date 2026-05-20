import { describe, it, expect } from "vitest";
import { computeCompleteness, computeCvProgress } from "@/lib/cv-progress";

// ─── computeCompleteness ───────────────────────────────────────────────────────

describe("computeCompleteness", () => {
  it("retorna array vacío cuando el user es null", () => {
    expect(computeCompleteness(null)).toEqual([]);
  });

  it("retorna array vacío cuando el user es undefined", () => {
    expect(computeCompleteness(undefined)).toEqual([]);
  });

  it("todos los items están pendientes cuando el user está vacío", () => {
    const items = computeCompleteness({});
    expect(items).toHaveLength(8);
    expect(items.every((i) => !i.done)).toBe(true);
  });

  it("marca 'name' done cuando name y lastName existen", () => {
    const items = computeCompleteness({ name: "Juan", lastName: "Pérez" });
    expect(items.find((i) => i.key === "name")?.done).toBe(true);
  });

  it("no marca 'name' done si solo tiene name sin lastName", () => {
    const items = computeCompleteness({ name: "Juan" });
    expect(items.find((i) => i.key === "name")?.done).toBe(false);
  });

  it("marca 'photo' done cuando image existe", () => {
    const items = computeCompleteness({ image: "https://example.com/a.jpg" });
    expect(items.find((i) => i.key === "photo")?.done).toBe(true);
  });

  it("marca 'bio' done cuando studentProfile.bio existe", () => {
    const items = computeCompleteness({
      studentProfile: { bio: "Apasionado por la IA" },
    });
    expect(items.find((i) => i.key === "bio")?.done).toBe(true);
  });

  it("marca 'education' done cuando university y career existen", () => {
    const items = computeCompleteness({
      studentProfile: { university: "UBA", career: "Ingeniería" },
    });
    expect(items.find((i) => i.key === "education")?.done).toBe(true);
  });

  it("no marca 'education' done si solo tiene university", () => {
    const items = computeCompleteness({
      studentProfile: { university: "UBA" },
    });
    expect(items.find((i) => i.key === "education")?.done).toBe(false);
  });

  it("marca 'semester' done cuando semester es número > 0", () => {
    const items = computeCompleteness({
      studentProfile: { semester: 5 },
    });
    expect(items.find((i) => i.key === "semester")?.done).toBe(true);
  });

  it("no marca 'semester' done cuando semester es 0", () => {
    const items = computeCompleteness({
      studentProfile: { semester: 0 },
    });
    expect(items.find((i) => i.key === "semester")?.done).toBe(false);
  });

  it("marca 'skills' done cuando hay 3 o más skills", () => {
    const items = computeCompleteness({
      studentProfile: { skills: ["JS", "TS", "React"] },
    });
    expect(items.find((i) => i.key === "skills")?.done).toBe(true);
  });

  it("no marca 'skills' done cuando hay menos de 3", () => {
    const items = computeCompleteness({
      studentProfile: { skills: ["JS", "TS"] },
    });
    expect(items.find((i) => i.key === "skills")?.done).toBe(false);
  });

  it("marca 'cv' done cuando cvUrl existe", () => {
    const items = computeCompleteness({
      studentProfile: { cvUrl: "https://supabase.io/cv.pdf" },
    });
    expect(items.find((i) => i.key === "cv")?.done).toBe(true);
  });

  it("marca 'phone' done cuando phone existe", () => {
    const items = computeCompleteness({ phone: "+54911234567" });
    expect(items.find((i) => i.key === "phone")?.done).toBe(true);
  });

  it("la suma de pts es siempre 100", () => {
    const items = computeCompleteness({});
    const total = items.reduce((s, i) => s + i.pts, 0);
    expect(total).toBe(100);
  });
});

// ─── computeCvProgress ────────────────────────────────────────────────────────

describe("computeCvProgress", () => {
  it("retorna 0 cuando el user es null", () => {
    expect(computeCvProgress(null)).toBe(0);
  });

  it("retorna 0 cuando no hay campos completados", () => {
    expect(computeCvProgress({})).toBe(0);
  });

  it("retorna 100 cuando todos los campos están completos", () => {
    const user = {
      name: "Ana",
      lastName: "García",
      image: "https://x.co/a.jpg",
      phone: "+1234567890",
      studentProfile: {
        bio: "Bio de prueba",
        university: "UBA",
        career: "Sistemas",
        semester: 4,
        skills: ["JS", "TS", "React"],
        cvUrl: "https://cv.pdf",
      },
    };
    expect(computeCvProgress(user)).toBe(100);
  });

  it("retorna el porcentaje correcto con perfil parcial", () => {
    // Solo name+lastName (10pts) + photo (10pts) = 20 / 100
    const user = {
      name: "Ana",
      lastName: "García",
      image: "https://x.co/a.jpg",
    };
    expect(computeCvProgress(user)).toBe(20);
  });

  it("retorna 0 cuando studentProfile es null", () => {
    expect(computeCvProgress({ studentProfile: null })).toBe(0);
  });
});

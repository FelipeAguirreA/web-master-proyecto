import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../test/mocks/prisma";
import { prismaMock } from "../../test/mocks/prisma";

// Mocks de infraestructura — evitan llamadas reales a Supabase y HuggingFace
vi.mock("@/server/lib/storage", () => ({
  uploadFile: vi.fn().mockResolvedValue("https://storage.example.com/cv.pdf"),
}));

vi.mock("@/server/lib/cv-parser", () => ({
  extractTextFromCV: vi.fn().mockResolvedValue("Texto del CV de prueba"),
}));

vi.mock("@/server/lib/embeddings", () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  calculateMatchScore: vi.fn(),
}));

import { calculateMatchScore } from "@/server/lib/embeddings";
import { uploadFile } from "@/server/lib/storage";
import { extractTextFromCV } from "@/server/lib/cv-parser";
import { generateEmbedding } from "@/server/lib/embeddings";
import {
  getRecommendations,
  processCV,
  deleteCV,
} from "@/server/services/matching.service";

// ─── Tests de calculateMatchScore (función pura — implementación real) ────────
// Se testea a través del módulo real, no del mock

describe("calculateMatchScore — implementación real", () => {
  // Importamos la función real con importActual dentro de cada test
  it("retorna 0 si ambos embeddings están vacíos", async () => {
    const { calculateMatchScore: real } = await vi.importActual<
      typeof import("@/server/lib/embeddings")
    >("@/server/lib/embeddings");
    expect(real([], [])).toBe(0);
  });

  it("retorna 0 si los embeddings tienen longitudes distintas", async () => {
    const { calculateMatchScore: real } = await vi.importActual<
      typeof import("@/server/lib/embeddings")
    >("@/server/lib/embeddings");
    expect(real([1, 2, 3], [1, 2])).toBe(0);
  });

  it("retorna 100 para vectores idénticos", async () => {
    const { calculateMatchScore: real } = await vi.importActual<
      typeof import("@/server/lib/embeddings")
    >("@/server/lib/embeddings");
    expect(real([1, 0, 0], [1, 0, 0])).toBe(100);
  });

  it("retorna 0 para vectores opuestos ([1,0] vs [-1,0])", async () => {
    const { calculateMatchScore: real } = await vi.importActual<
      typeof import("@/server/lib/embeddings")
    >("@/server/lib/embeddings");
    expect(real([1, 0], [-1, 0])).toBe(0);
  });

  it("retorna un valor entre 0 y 100 para vectores similares pero no idénticos", async () => {
    const { calculateMatchScore: real } = await vi.importActual<
      typeof import("@/server/lib/embeddings")
    >("@/server/lib/embeddings");
    const score = real([1, 0, 0], [0.5, 0.5, 0]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("retorna 0 si el denominador es cero (vector de ceros)", async () => {
    const { calculateMatchScore: real } = await vi.importActual<
      typeof import("@/server/lib/embeddings")
    >("@/server/lib/embeddings");
    expect(real([0, 0, 0], [1, 2, 3])).toBe(0);
  });
});

// ─── Tests de getRecommendations ─────────────────────────────────────────────

describe("getRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna lista vacía si el estudiante no tiene embedding", async () => {
    prismaMock.studentProfile.findUnique.mockResolvedValue({
      id: "sp-1",
      userId: "user-1",
      embedding: [],
    });

    const result = await getRecommendations("user-1");
    expect(result).toEqual([]);
  });

  it("retorna lista vacía si no hay prácticas activas con embedding", async () => {
    prismaMock.studentProfile.findUnique.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
    });

    prismaMock.internship.findMany.mockResolvedValue([]);

    const result = await getRecommendations("user-1");
    expect(result).toEqual([]);
  });

  it("ordena las prácticas por matchScore de mayor a menor", async () => {
    prismaMock.studentProfile.findUnique.mockResolvedValue({
      embedding: [1, 0, 0],
    });

    prismaMock.internship.findMany.mockResolvedValue([
      {
        id: "int-1",
        title: "A",
        embedding: [0.5, 0.5, 0],
        company: { companyName: "Co" },
      },
      {
        id: "int-2",
        title: "B",
        embedding: [1, 0, 0],
        company: { companyName: "Co" },
      },
      {
        id: "int-3",
        title: "C",
        embedding: [0.1, 0.9, 0],
        company: { companyName: "Co" },
      },
    ]);

    vi.mocked(calculateMatchScore)
      .mockReturnValueOnce(50)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(30);

    const result = await getRecommendations("user-1");

    expect(result[0].matchScore).toBe(100);
    expect(result[1].matchScore).toBe(50);
    expect(result[2].matchScore).toBe(30);
  });

  it("no incluye el campo embedding en los resultados", async () => {
    prismaMock.studentProfile.findUnique.mockResolvedValue({
      embedding: [1, 0, 0],
    });

    prismaMock.internship.findMany.mockResolvedValue([
      {
        id: "int-1",
        title: "A",
        embedding: [1, 0, 0],
        company: { companyName: "Co" },
      },
    ]);

    vi.mocked(calculateMatchScore).mockReturnValue(80);

    const result = await getRecommendations("user-1");

    expect(result[0]).not.toHaveProperty("embedding");
  });

  it("limita los resultados a 20", async () => {
    prismaMock.studentProfile.findUnique.mockResolvedValue({
      embedding: [1, 0, 0],
    });

    const manyInternships = Array.from({ length: 30 }, (_, i) => ({
      id: `int-${i}`,
      title: `Práctica ${i}`,
      embedding: [1, 0, 0],
      company: { companyName: "Co" },
    }));

    prismaMock.internship.findMany.mockResolvedValue(manyInternships);
    vi.mocked(calculateMatchScore).mockReturnValue(75);

    const result = await getRecommendations("user-1");

    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("filtra prácticas con matchScore 0 (embedding vacío)", async () => {
    prismaMock.studentProfile.findUnique.mockResolvedValue({
      embedding: [1, 0, 0],
    });

    prismaMock.internship.findMany.mockResolvedValue([
      {
        id: "int-with-emb",
        title: "Con embedding",
        embedding: [1, 0, 0],
        company: { companyName: "Co" },
      },
      {
        id: "int-no-emb",
        title: "Sin embedding",
        embedding: [],
        company: { companyName: "Co" },
      },
    ]);

    vi.mocked(calculateMatchScore).mockReturnValue(80);

    const result = await getRecommendations("user-1");

    // Solo se incluye la que tiene embedding (matchScore > 0)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("int-with-emb");
  });
});

// ─── Tests de processCV ───────────────────────────────────────────────────────

describe("processCV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sube el archivo, extrae texto, genera embedding y upserta el perfil", async () => {
    vi.mocked(uploadFile).mockResolvedValue("https://cdn.example.com/cv.pdf");
    vi.mocked(extractTextFromCV).mockResolvedValue("Texto del CV");
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    prismaMock.studentProfile.upsert.mockResolvedValue({
      userId: "user-1",
      cvUrl: "https://cdn.example.com/cv.pdf",
      cvText: "Texto del CV",
      embedding: [0.1, 0.2, 0.3],
    });

    const buffer = Buffer.from("fake pdf bytes");
    const result = await processCV(
      "user-1",
      buffer,
      "application/pdf",
      "cv.pdf",
    );

    expect(uploadFile).toHaveBeenCalledWith(
      "documents",
      expect.stringMatching(/^cvs\/user-1\/\d+-cv\.pdf$/),
      buffer,
      "application/pdf",
    );
    expect(extractTextFromCV).toHaveBeenCalledWith(buffer, "application/pdf");
    expect(generateEmbedding).toHaveBeenCalledWith("Texto del CV");
    expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: {
        cvUrl: "https://cdn.example.com/cv.pdf",
        cvText: "Texto del CV",
        embedding: [0.1, 0.2, 0.3],
      },
      create: {
        userId: "user-1",
        cvUrl: "https://cdn.example.com/cv.pdf",
        cvText: "Texto del CV",
        embedding: [0.1, 0.2, 0.3],
      },
    });
    expect(result).toEqual({
      cvUrl: "https://cdn.example.com/cv.pdf",
      embeddingSize: 3,
    });
  });
});

// ─── Tests de deleteCV ────────────────────────────────────────────────────────

describe("deleteCV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("limpia cvUrl, cvText y embedding mediante upsert", async () => {
    prismaMock.studentProfile.upsert.mockResolvedValue({
      userId: "user-1",
      cvUrl: null,
      cvText: null,
      embedding: [],
    });

    await deleteCV("user-1");

    expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: { cvUrl: null, cvText: null, embedding: [] },
      create: { userId: "user-1" },
    });
  });
});

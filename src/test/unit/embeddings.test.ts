import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    HUGGINGFACE_API_KEY: "hf_test_key",
  },
}));

const { mockLog } = vi.hoisted(() => ({
  mockLog: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  createLogger: () => mockLog,
  getRequestId: () => undefined,
}));

import {
  generateEmbedding,
  calculateMatchScore,
  computeSkillOverlap,
  calculateHybridMatchScore,
} from "@/server/lib/embeddings";
import { env as mockedEnv } from "@/lib/env";

const HUGGINGFACE_URL =
  "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5";

beforeEach(() => {
  vi.restoreAllMocks();
  mockLog.warn.mockClear();
  mockLog.error.mockClear();
  (mockedEnv as { HUGGINGFACE_API_KEY?: string }).HUGGINGFACE_API_KEY =
    "hf_test_key";
});

describe("generateEmbedding", () => {
  it("retorna [] cuando no hay HUGGINGFACE_API_KEY", async () => {
    (mockedEnv as { HUGGINGFACE_API_KEY?: string }).HUGGINGFACE_API_KEY =
      undefined;

    const result = await generateEmbedding("hola mundo");

    expect(result).toEqual([]);
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.stringContaining("HUGGINGFACE_API_KEY no configurada"),
    );
  });

  it("llama a HuggingFace con Authorization Bearer y body inputs truncado a 2000 chars", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(Array(384).fill(0.1)), { status: 200 }),
      );

    const longText = "a".repeat(3000);
    await generateEmbedding(longText);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(HUGGINGFACE_URL);
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>).Authorization).toBe(
      "Bearer hf_test_key",
    );
    const parsedBody = JSON.parse(options.body as string) as { inputs: string };
    expect(parsedBody.inputs).toHaveLength(2000);
  });

  it("retorna result[0] cuando la respuesta es number[][] (nested)", async () => {
    const nested = [[0.1, 0.2, 0.3]];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(nested), { status: 200 }),
    );

    const result = await generateEmbedding("hola");

    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("retorna result tal cual cuando la respuesta es number[] (flat)", async () => {
    const flat = [0.5, 0.6, 0.7];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(flat), { status: 200 }),
    );

    const result = await generateEmbedding("hola");

    expect(result).toEqual([0.5, 0.6, 0.7]);
  });

  it("retorna [] cuando res.ok es false (loguea error)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("model is loading", { status: 503 }),
    );

    const result = await generateEmbedding("hola");

    expect(result).toEqual([]);
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 503, error: "model is loading" }),
      "HuggingFace API error",
    );
  });

  it("retorna [] cuando fetch lanza una excepción", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const result = await generateEmbedding("hola");

    expect(result).toEqual([]);
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "error al generar embedding",
    );
  });
});

describe("calculateMatchScore", () => {
  it("retorna 0 si embeddingA está vacío", () => {
    expect(calculateMatchScore([], [0.1, 0.2])).toBe(0);
  });

  it("retorna 0 si embeddingB está vacío", () => {
    expect(calculateMatchScore([0.1, 0.2], [])).toBe(0);
  });

  it("retorna 0 si los embeddings tienen longitudes distintas", () => {
    expect(calculateMatchScore([0.1, 0.2], [0.1, 0.2, 0.3])).toBe(0);
  });

  it("retorna 100 para embeddings idénticos", () => {
    const a = [1, 0, 0];
    expect(calculateMatchScore(a, a)).toBe(100);
  });

  it("retorna 0 para embeddings ortogonales (cosine = 0)", () => {
    expect(calculateMatchScore([1, 0, 0], [0, 1, 0])).toBe(0);
  });

  it("retorna 0 para vectores con cosine negativo (clamp a 0 con Math.max)", () => {
    expect(calculateMatchScore([1, 0], [-1, 0])).toBe(0);
  });

  it("retorna un score entero entre 0 y 100 para vectores parcialmente alineados", () => {
    const a = [1, 1, 0];
    const b = [1, 0, 1];
    const score = calculateMatchScore(a, b);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
    expect(Number.isInteger(score)).toBe(true);
  });

  it("retorna 0 cuando un vector es todo ceros (denominador 0)", () => {
    expect(calculateMatchScore([0, 0, 0], [1, 1, 1])).toBe(0);
  });

  it("trabaja con embeddings de 384 dimensiones (caso real)", () => {
    const a = Array(384).fill(0.1);
    const b = Array(384).fill(0.1);
    expect(calculateMatchScore(a, b)).toBe(100);
  });
});

describe("computeSkillOverlap", () => {
  it("retorna 0 si studentSkills está vacío", () => {
    expect(computeSkillOverlap([], ["React"])).toBe(0);
  });

  it("retorna 0 si internshipSkills está vacío", () => {
    expect(computeSkillOverlap(["React"], [])).toBe(0);
  });

  it("retorna 100 cuando el estudiante tiene todas las skills requeridas", () => {
    expect(
      computeSkillOverlap(["React", "TypeScript"], ["React", "TypeScript"]),
    ).toBe(100);
  });

  it("retorna 50 cuando el estudiante matchea la mitad", () => {
    expect(computeSkillOverlap(["React"], ["React", "TypeScript"])).toBe(50);
  });

  it("compara case-insensitive — react matchea React", () => {
    expect(computeSkillOverlap(["react"], ["React"])).toBe(100);
  });

  it("ignora whitespace circundante", () => {
    expect(computeSkillOverlap([" React "], ["React"])).toBe(100);
  });

  it("ignora skills extra del estudiante que no están en la práctica", () => {
    expect(computeSkillOverlap(["React", "Vue", "Angular"], ["React"])).toBe(
      100,
    );
  });

  it("filtra strings vacíos en la lista del estudiante", () => {
    expect(computeSkillOverlap(["", "  ", "React"], ["React"])).toBe(100);
  });
});

describe("calculateHybridMatchScore", () => {
  it("retorna 0 cuando no hay nada (sin embedding ni skills)", () => {
    expect(calculateHybridMatchScore([], [], [], [])).toBe(0);
  });

  it("retorna 100% semántico cuando no hay skills declaradas en ningún lado", () => {
    // Embeddings idénticos → cosine = 100, sin skills → score = 100 (no penaliza).
    expect(calculateHybridMatchScore([1, 0, 0], [1, 0, 0], [], [])).toBe(100);
  });

  it("retorna overlap directo cuando NO hay CV pero SÍ skills declaradas", () => {
    expect(calculateHybridMatchScore([], [], ["React"], ["React"])).toBe(100);
  });

  it("retorna overlap directo cuando solo el internship tiene embedding", () => {
    expect(calculateHybridMatchScore([], [1, 0, 0], ["React"], ["React"])).toBe(
      100,
    );
  });

  it("agregar 1 skill sobre 5 SIEMPRE sube el score (no lo baja)", () => {
    // Bug original: blend 70/30 podía bajar el match al agregar pocas skills.
    // Fix: boost aditivo — semántico 78 + 20% * 20 = 78 + 4 = 82.
    // Sin skills: 78 (semántico puro).
    const noSkills = calculateHybridMatchScore(
      [0.78, 0.62, 0],
      [1, 0, 0],
      [],
      ["React", "TS", "Node", "CSS", "Git"],
    );
    const oneSkill = calculateHybridMatchScore(
      [0.78, 0.62, 0],
      [1, 0, 0],
      ["React"],
      ["React", "TS", "Node", "CSS", "Git"],
    );
    expect(oneSkill).toBeGreaterThan(noSkills);
  });

  it("score 100 + 20% skills = 100 (capeado, no overflow)", () => {
    const result = calculateHybridMatchScore(
      [1, 0, 0],
      [1, 0, 0],
      ["React"],
      ["React", "TypeScript"],
    );
    // 100 + (50/100) * 20 = 110 → cap 100
    expect(result).toBe(100);
  });

  it("score 80 + 100% skills = 100 (max boost de 20 puntos)", () => {
    const result = calculateHybridMatchScore(
      [4, 3, 0], // → score 80 vs [1, 0, 0]
      [1, 0, 0],
      ["React", "TypeScript"],
      ["React", "TypeScript"],
    );
    // semántico ~80 + 20 = 100
    expect(result).toBe(100);
  });

  it("agregar TODAS las skills suma el boost máximo (+20)", () => {
    const noSkills = calculateHybridMatchScore(
      [4, 3, 0],
      [1, 0, 0],
      [],
      ["React", "TS"],
    );
    const allSkills = calculateHybridMatchScore(
      [4, 3, 0],
      [1, 0, 0],
      ["React", "TS"],
      ["React", "TS"],
    );
    expect(allSkills - noSkills).toBe(20);
  });

  it("retorna entero (round)", () => {
    const result = calculateHybridMatchScore(
      [1, 1, 0],
      [1, 0, 1],
      ["React"],
      ["React", "TypeScript", "Node"],
    );
    expect(Number.isInteger(result)).toBe(true);
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    HUGGINGFACE_API_KEY: "hf_test_key",
  },
}));

import {
  generateEmbedding,
  calculateMatchScore,
} from "@/server/lib/embeddings";
import { env as mockedEnv } from "@/lib/env";

const HUGGINGFACE_URL =
  "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5";

beforeEach(() => {
  vi.restoreAllMocks();
  (mockedEnv as { HUGGINGFACE_API_KEY?: string }).HUGGINGFACE_API_KEY =
    "hf_test_key";
});

describe("generateEmbedding", () => {
  it("retorna [] cuando no hay HUGGINGFACE_API_KEY", async () => {
    (mockedEnv as { HUGGINGFACE_API_KEY?: string }).HUGGINGFACE_API_KEY =
      undefined;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await generateEmbedding("hola mundo");

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
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
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("model is loading", { status: 503 }),
    );

    const result = await generateEmbedding("hola");

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      "[embeddings] HuggingFace API error:",
      "model is loading",
    );
  });

  it("retorna [] cuando fetch lanza una excepción", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const result = await generateEmbedding("hola");

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      "[embeddings] Error al generar embedding:",
      expect.any(Error),
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

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Hoisted: setear env ANTES de cualquier import del módulo bajo test
// (env.ts parsea process.env al import-time).
vi.hoisted(() => {
  process.env.UPSTASH_REDIS_REST_URL = "https://test-redis.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token-mock";
});

// Hoisted helpers para que estén disponibles en el factory de vi.mock.
const { mockLimit, mockSlidingWindow } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
  mockSlidingWindow: vi.fn(() => "sliding-window-config"),
}));

// Mock de @upstash/redis: Redis debe ser construible con `new`, así que uso
// una function regular (NO arrow) — las arrow no son constructors en JS.
vi.mock("@upstash/redis", () => {
  const Redis = vi.fn(function (this: { __mock: string }) {
    this.__mock = "redis-instance";
  });
  return { Redis };
});

// Mock de @upstash/ratelimit: Ratelimit construible + propiedad estática
// slidingWindow.
vi.mock("@upstash/ratelimit", () => {
  const Ratelimit = vi.fn(function (this: { limit: typeof mockLimit }) {
    this.limit = mockLimit;
  }) as unknown as { slidingWindow: typeof mockSlidingWindow } & ReturnType<
    typeof vi.fn
  >;
  Ratelimit.slidingWindow = mockSlidingWindow;
  return { Ratelimit };
});

// Helper: importa el módulo fresco (state module-level reseteado entre tests).
async function importRateLimit() {
  vi.resetModules();
  const mod = await import("@/server/lib/rate-limit");
  return mod.rateLimit;
}

beforeEach(() => {
  mockLimit.mockReset();
  mockSlidingWindow.mockClear();
  // Los constructores Redis/Ratelimit son mocks persistentes entre tests
  // (vi.resetModules limpia el module cache pero no el call history del mock).
  vi.mocked(Redis).mockClear();
  vi.mocked(Ratelimit).mockClear();
});

describe("rateLimit — modo Upstash (config presente)", () => {
  it("instancia Redis con URL y token del env la primera vez", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 60_000,
      limit: 5,
    });

    const rateLimit = await importRateLimit();

    await rateLimit("first-call-id", 5, 60_000);

    expect(Redis).toHaveBeenCalledWith({
      url: "https://test-redis.upstash.io",
      token: "test-token-mock",
    });
  });

  it("delega a Ratelimit.limit con el identifier y mapea reset → resetAt", async () => {
    const reset = 1_900_000_000_000;
    mockLimit.mockResolvedValue({
      success: true,
      remaining: 2,
      reset,
      limit: 5,
    });

    const rateLimit = await importRateLimit();
    const result = await rateLimit("user-x", 5, 60_000);

    expect(mockLimit).toHaveBeenCalledWith("user-x");
    expect(result).toEqual({
      success: true,
      remaining: 2,
      resetAt: reset,
    });
  });

  it("retorna success: false cuando Upstash bloquea", async () => {
    mockLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 30_000,
      limit: 5,
    });

    const rateLimit = await importRateLimit();
    const result = await rateLimit("blocked-user", 5, 60_000);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("configura sliding window con limit y windowMs", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      remaining: 9,
      reset: Date.now() + 60_000,
      limit: 10,
    });

    const rateLimit = await importRateLimit();

    await rateLimit("config-check", 10, 60_000);

    expect(mockSlidingWindow).toHaveBeenCalledWith(10, "60000 ms");
  });

  it("cachea el Ratelimit por par (limit, windowMs) entre llamadas", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      remaining: 1,
      reset: Date.now() + 1_000,
      limit: 7,
    });

    const rateLimit = await importRateLimit();

    await rateLimit("a", 7, 7_777);
    await rateLimit("b", 7, 7_777); // mismo par → reusa cache
    await rateLimit("c", 13, 7_777); // distinto limit → crea nuevo

    expect(vi.mocked(Ratelimit)).toHaveBeenCalledTimes(2);
  });

  it("fail-open ante error de Upstash (red/timeout/5xx)", async () => {
    mockLimit.mockRejectedValue(new Error("ECONNRESET"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const rateLimit = await importRateLimit();
    const before = Date.now();
    const result = await rateLimit("network-error-user", 5, 60_000);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4); // limit - 1
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60_000);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[rate-limit] Upstash error, fail-open:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("reusa la misma instancia de Redis en llamadas sucesivas (no la recrea)", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 60_000,
      limit: 5,
    });

    const rateLimit = await importRateLimit();

    await rateLimit("reuse-1", 5, 60_000);
    await rateLimit("reuse-2", 5, 60_000);
    await rateLimit("reuse-3", 5, 60_000);

    expect(Redis).toHaveBeenCalledTimes(1);
  });
});

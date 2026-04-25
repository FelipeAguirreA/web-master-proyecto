import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";

// Sin UPSTASH_REDIS_REST_URL/TOKEN en process.env, el módulo cae al fallback
// in-memory. Estos tests ejercitan ese fallback (idéntico al comportamiento
// histórico fixed-window pre-migración a Upstash).
//
// El store es module-level, por eso cada test usa un identifier único
// (prefijo por bloque) y fake timers para controlar el tiempo con precisión.

const BASE_TIME = new Date("2026-04-25T10:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── rateLimit (fallback in-memory) ─────────────────────────────────────────

describe("rateLimit — fallback in-memory", () => {
  it("la primera request de un identifier pasa con remaining = limit - 1", async () => {
    const result = await rateLimit("first-req-user", 5, 60_000);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBe(BASE_TIME.getTime() + 60_000);
  });

  it("remaining decrementa en cada request sucesiva dentro de la ventana", async () => {
    const id = "decrement-user";
    const limit = 3;

    const r1 = await rateLimit(id, limit, 60_000);
    const r2 = await rateLimit(id, limit, 60_000);
    const r3 = await rateLimit(id, limit, 60_000);

    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
  });

  it("resetAt se mantiene estable entre requests dentro de la misma ventana", async () => {
    const id = "stable-reset-user";

    const r1 = await rateLimit(id, 5, 60_000);
    vi.advanceTimersByTime(10_000); // avanzo 10s dentro de la ventana
    const r2 = await rateLimit(id, 5, 60_000);

    expect(r2.resetAt).toBe(r1.resetAt);
  });

  it("retorna success: false cuando se supera el límite", async () => {
    const id = "over-limit-user";
    const limit = 2;

    await rateLimit(id, limit, 60_000);
    await rateLimit(id, limit, 60_000);
    const blocked = await rateLimit(id, limit, 60_000);

    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("no incrementa el count cuando ya está bloqueado (resetAt no se extiende)", async () => {
    const id = "no-increment-user";
    const limit = 2;

    await rateLimit(id, limit, 60_000);
    await rateLimit(id, limit, 60_000);
    const firstBlock = await rateLimit(id, limit, 60_000);
    vi.advanceTimersByTime(5_000);
    const secondBlock = await rateLimit(id, limit, 60_000);

    // resetAt no se mueve al bloquear — sigue siendo el de la primera request
    expect(secondBlock.resetAt).toBe(firstBlock.resetAt);
    expect(secondBlock.success).toBe(false);
  });

  it("resetea la ventana cuando windowMs vence (count vuelve a 1)", async () => {
    const id = "window-reset-user";
    const limit = 2;
    const windowMs = 60_000;

    await rateLimit(id, limit, windowMs);
    await rateLimit(id, limit, windowMs); // consumimos el límite
    const beforeReset = await rateLimit(id, limit, windowMs);
    expect(beforeReset.success).toBe(false);

    vi.advanceTimersByTime(windowMs + 1);
    const afterReset = await rateLimit(id, limit, windowMs);

    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(limit - 1);
    expect(afterReset.resetAt).toBe(
      BASE_TIME.getTime() + windowMs + 1 + windowMs,
    );
  });

  it("trata resetAt <= now como ventana expirada (edge exacto)", async () => {
    const id = "edge-expiry-user";
    const windowMs = 60_000;

    await rateLimit(id, 1, windowMs); // ocupa toda la ventana (limit=1)
    const blocked = await rateLimit(id, 1, windowMs);
    expect(blocked.success).toBe(false);

    vi.advanceTimersByTime(windowMs); // now === resetAt
    const onEdge = await rateLimit(id, 1, windowMs);

    // La condición del código es `resetAt <= now`, por lo que se considera expirada
    expect(onEdge.success).toBe(true);
    expect(onEdge.remaining).toBe(0);
  });

  it("dos identifiers distintos no se afectan mutuamente", async () => {
    const limit = 2;

    await rateLimit("user-A", limit, 60_000);
    await rateLimit("user-A", limit, 60_000);
    const aBlocked = await rateLimit("user-A", limit, 60_000);

    const bFirst = await rateLimit("user-B", limit, 60_000);

    expect(aBlocked.success).toBe(false);
    expect(bFirst.success).toBe(true);
    expect(bFirst.remaining).toBe(limit - 1);
  });

  it("cleanup lazy: entries vencidas de otros identifiers no afectan la respuesta del nuevo", async () => {
    // Populate: identifier vencible con ventana corta
    await rateLimit("stale-other", 1, 1_000);
    await rateLimit("stale-other", 1, 1_000); // dejo entry al tope

    vi.advanceTimersByTime(2_000); // stale-other ya vencido

    // Al llamar con un identifier nuevo, el cleanup limpia stale-other silenciosamente
    const fresh = await rateLimit("fresh-identifier", 5, 60_000);

    expect(fresh.success).toBe(true);
    expect(fresh.remaining).toBe(4);

    // Y stale-other al volver se trata como primera request (entry borrada por el cleanup)
    const staleAgain = await rateLimit("stale-other", 1, 1_000);
    expect(staleAgain.success).toBe(true);
    expect(staleAgain.remaining).toBe(0);
  });

  it("remaining nunca es negativo aunque cambie el limit entre llamadas", async () => {
    const id = "limit-change-user";

    await rateLimit(id, 5, 60_000);
    await rateLimit(id, 5, 60_000);
    // El caller cambia el limit — función usa el nuevo limit para calcular remaining
    const withLowerLimit = await rateLimit(id, 3, 60_000);

    expect(withLowerLimit.remaining).toBe(0);
    expect(withLowerLimit.success).toBe(true); // count=3, limit=3 → aún dentro
  });

  it("retorna una Promise (interfaz async post-Upstash)", () => {
    const result = rateLimit("promise-shape-user", 5, 60_000);
    expect(result).toBeInstanceOf(Promise);
  });
});

// ─── rateLimitResponse ──────────────────────────────────────────────────────

describe("rateLimitResponse", () => {
  it("retorna Response con status 429", () => {
    const resetAt = Date.now() + 30_000;

    const res = rateLimitResponse(resetAt);

    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(429);
  });

  it("incluye header Content-Type application/json", () => {
    const res = rateLimitResponse(Date.now() + 30_000);

    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("incluye header Retry-After con los segundos enteros restantes (ceil)", () => {
    // 30.4s → Math.ceil → 31
    const resetAt = Date.now() + 30_400;

    const res = rateLimitResponse(resetAt);

    expect(res.headers.get("Retry-After")).toBe("31");
  });

  it("el body JSON contiene el mensaje en español con los segundos restantes", async () => {
    const resetAt = Date.now() + 45_000;

    const res = rateLimitResponse(resetAt);
    const body = await res.json();

    expect(body).toEqual({
      error: "Demasiadas solicitudes. Intentá de nuevo en 45 segundos.",
    });
  });

  it("Retry-After es al menos 1 mientras quede tiempo (evita loops de retry inmediato)", () => {
    const resetAt = Date.now() + 1; // 1ms restante

    const res = rateLimitResponse(resetAt);

    expect(res.headers.get("Retry-After")).toBe("1");
  });
});

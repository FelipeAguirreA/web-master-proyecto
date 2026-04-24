import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";

// El store de rate-limit es un Map module-level que persiste entre tests.
// Para aislar cada test usamos identifiers únicos (prefijo por bloque) y
// fake timers para controlar el tiempo con precisión.

const BASE_TIME = new Date("2026-04-24T10:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── rateLimit ──────────────────────────────────────────────────────────────

describe("rateLimit", () => {
  it("la primera request de un identifier pasa con remaining = limit - 1", () => {
    const result = rateLimit("first-req-user", 5, 60_000);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBe(BASE_TIME.getTime() + 60_000);
  });

  it("remaining decrementa en cada request sucesiva dentro de la ventana", () => {
    const id = "decrement-user";
    const limit = 3;

    const r1 = rateLimit(id, limit, 60_000);
    const r2 = rateLimit(id, limit, 60_000);
    const r3 = rateLimit(id, limit, 60_000);

    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
  });

  it("resetAt se mantiene estable entre requests dentro de la misma ventana", () => {
    const id = "stable-reset-user";

    const r1 = rateLimit(id, 5, 60_000);
    vi.advanceTimersByTime(10_000); // avanzo 10s dentro de la ventana
    const r2 = rateLimit(id, 5, 60_000);

    expect(r2.resetAt).toBe(r1.resetAt);
  });

  it("retorna success: false cuando se supera el límite", () => {
    const id = "over-limit-user";
    const limit = 2;

    rateLimit(id, limit, 60_000);
    rateLimit(id, limit, 60_000);
    const blocked = rateLimit(id, limit, 60_000);

    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("no incrementa el count cuando ya está bloqueado (resetAt no se extiende)", () => {
    const id = "no-increment-user";
    const limit = 2;

    rateLimit(id, limit, 60_000);
    rateLimit(id, limit, 60_000);
    const firstBlock = rateLimit(id, limit, 60_000);
    vi.advanceTimersByTime(5_000);
    const secondBlock = rateLimit(id, limit, 60_000);

    // resetAt no se mueve al bloquear — sigue siendo el de la primera request
    expect(secondBlock.resetAt).toBe(firstBlock.resetAt);
    expect(secondBlock.success).toBe(false);
  });

  it("resetea la ventana cuando windowMs vence (count vuelve a 1)", () => {
    const id = "window-reset-user";
    const limit = 2;
    const windowMs = 60_000;

    rateLimit(id, limit, windowMs);
    rateLimit(id, limit, windowMs); // consumimos el límite
    const beforeReset = rateLimit(id, limit, windowMs);
    expect(beforeReset.success).toBe(false);

    vi.advanceTimersByTime(windowMs + 1);
    const afterReset = rateLimit(id, limit, windowMs);

    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(limit - 1);
    expect(afterReset.resetAt).toBe(
      BASE_TIME.getTime() + windowMs + 1 + windowMs,
    );
  });

  it("trata resetAt <= now como ventana expirada (edge exacto)", () => {
    const id = "edge-expiry-user";
    const windowMs = 60_000;

    rateLimit(id, 1, windowMs); // ocupa toda la ventana (limit=1)
    const blocked = rateLimit(id, 1, windowMs);
    expect(blocked.success).toBe(false);

    vi.advanceTimersByTime(windowMs); // now === resetAt
    const onEdge = rateLimit(id, 1, windowMs);

    // La condición del código es `resetAt <= now`, por lo que se considera expirada
    expect(onEdge.success).toBe(true);
    expect(onEdge.remaining).toBe(0);
  });

  it("dos identifiers distintos no se afectan mutuamente", () => {
    const limit = 2;

    rateLimit("user-A", limit, 60_000);
    rateLimit("user-A", limit, 60_000);
    const aBlocked = rateLimit("user-A", limit, 60_000);

    const bFirst = rateLimit("user-B", limit, 60_000);

    expect(aBlocked.success).toBe(false);
    expect(bFirst.success).toBe(true);
    expect(bFirst.remaining).toBe(limit - 1);
  });

  it("cleanup lazy: entries vencidas de otros identifiers no afectan la respuesta del nuevo", () => {
    // Populate: identifier vencible con ventana corta
    rateLimit("stale-other", 1, 1_000);
    rateLimit("stale-other", 1, 1_000); // dejo entry al tope

    vi.advanceTimersByTime(2_000); // stale-other ya vencido

    // Al llamar con un identifier nuevo, el cleanup limpia stale-other silenciosamente
    const fresh = rateLimit("fresh-identifier", 5, 60_000);

    expect(fresh.success).toBe(true);
    expect(fresh.remaining).toBe(4);

    // Y stale-other al volver se trata como primera request (entry borrada por el cleanup)
    const staleAgain = rateLimit("stale-other", 1, 1_000);
    expect(staleAgain.success).toBe(true);
    expect(staleAgain.remaining).toBe(0);
  });

  it("remaining nunca es negativo aunque cambie el limit entre llamadas", () => {
    const id = "limit-change-user";

    rateLimit(id, 5, 60_000);
    rateLimit(id, 5, 60_000);
    // El caller cambia el limit — función usa el nuevo limit para calcular remaining
    const withLowerLimit = rateLimit(id, 3, 60_000);

    expect(withLowerLimit.remaining).toBe(0);
    expect(withLowerLimit.success).toBe(true); // count=3, limit=3 → aún dentro
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

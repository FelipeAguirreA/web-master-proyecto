import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

let upstashRedis: Redis | null = null;
let upstashWarned = false;
const ratelimiterCache = new Map<string, Ratelimit>();

function getUpstashRedis(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    if (!upstashWarned) {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN no configurados — usando fallback in-memory (no apto para producción multi-instancia)",
      );
      upstashWarned = true;
    }
    return null;
  }

  if (!upstashRedis) {
    upstashRedis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return upstashRedis;
}

function getRatelimiter(
  redis: Redis,
  limit: number,
  windowMs: number,
): Ratelimit {
  const key = `${limit}:${windowMs}`;
  let limiter = ratelimiterCache.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "practix",
    });
    ratelimiterCache.set(key, limiter);
  }
  return limiter;
}

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

function rateLimitInMemory(
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt <= now) {
      memoryStore.delete(key);
    }
  }

  const entry = memoryStore.get(identifier);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redis = getUpstashRedis();

  if (!redis) {
    return rateLimitInMemory(identifier, limit, windowMs);
  }

  try {
    const limiter = getRatelimiter(redis, limit, windowMs);
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch (error) {
    console.error("[rate-limit] Upstash error, fail-open:", error);
    return {
      success: true,
      remaining: limit - 1,
      resetAt: Date.now() + windowMs,
    };
  }
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: `Demasiadas solicitudes. Intentá de nuevo en ${retryAfter} segundos.`,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

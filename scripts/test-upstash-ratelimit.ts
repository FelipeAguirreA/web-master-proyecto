/**
 * Smoke test del rate limit contra Upstash REAL.
 *
 * Requiere UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en .env.local.
 *
 * Cómo distinguir Upstash vs fallback in-memory:
 *   - Si en la salida aparece "[rate-limit] UPSTASH... no configurado" → fallback.
 *   - Si la latencia de la primera llamada es ~20-100ms (network) → Upstash.
 *   - Si la latencia es <1ms en todas → fallback in-memory.
 *
 * Uso:
 *   pnpm tsx scripts/test-upstash-ratelimit.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  console.log("─".repeat(70));
  console.log("Smoke test rate-limit contra Upstash");
  console.log("─".repeat(70));
  console.log(
    "UPSTASH_REDIS_REST_URL:",
    process.env.UPSTASH_REDIS_REST_URL ? "✓ set" : "✗ NOT SET",
  );
  console.log(
    "UPSTASH_REDIS_REST_TOKEN:",
    process.env.UPSTASH_REDIS_REST_TOKEN ? "✓ set" : "✗ NOT SET",
  );
  console.log("─".repeat(70));

  // Dynamic import para que las env vars de dotenv estén cargadas antes de
  // que env.ts las parsee con Zod.
  const { rateLimit } = await import("../src/server/lib/rate-limit");

  const id = `smoke-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(`Identifier: ${id}`);
  console.log("Test: 7 llamadas sucesivas, limit=5, window=60s\n");

  for (let i = 1; i <= 7; i++) {
    const start = Date.now();
    const result = await rateLimit(id, 5, 60_000);
    const elapsed = Date.now() - start;
    const reset = new Date(result.resetAt).toISOString();
    console.log(
      `Call ${i}: success=${String(result.success).padEnd(5)} remaining=${String(result.remaining).padEnd(2)} latency=${elapsed}ms resetAt=${reset}`,
    );
  }

  console.log("\n─".repeat(70));
  console.log("Esperado:");
  console.log("  Calls 1-5: success=true, remaining decremento de 4 a 0");
  console.log("  Calls 6-7: success=false, remaining=0");
  console.log(
    "  Latencia primera call: ~20-150ms (network round-trip a Upstash)",
  );
  console.log("─".repeat(70));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

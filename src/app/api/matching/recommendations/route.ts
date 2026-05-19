import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { getRecommendations } from "@/server/services/matching.service";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";

const HOUR_MS = 60 * 60 * 1000;

export async function GET() {
  const auth = await requireAuth("STUDENT");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 120/hora: el endpoint solo lee de DB y calcula cosine similarity (barato).
  // Antes era 20 cuando regeneraba embeddings; ahora no llama APIs externas.
  const rl = await rateLimit(`recommendations:${auth.user.id}`, 120, HOUR_MS);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const recommendations = await getRecommendations(auth.user.id);
    return NextResponse.json(recommendations);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "matching.recommendations.GET" },
      extra: { userId: auth.user.id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

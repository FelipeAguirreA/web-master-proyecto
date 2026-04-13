import { NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { getRecommendations } from "@/server/services/matching.service";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";

const HOUR_MS = 60 * 60 * 1000;

export async function GET() {
  try {
    const auth = await requireAuth("STUDENT");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rl = rateLimit(`recommendations:${auth.user.id}`, 20, HOUR_MS);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const recommendations = await getRecommendations(auth.user.id);
    return NextResponse.json(recommendations);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

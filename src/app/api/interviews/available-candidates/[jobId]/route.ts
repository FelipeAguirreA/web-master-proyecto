import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { getAvailableCandidates } from "@/server/services/interviews.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { jobId } = await params;

  try {
    const candidates = await getAvailableCandidates(jobId, auth.user.id);
    return NextResponse.json(candidates);
  } catch (err) {
    const code = (err as Error & { code?: string }).code;

    if (code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Práctica no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    Sentry.captureException(err, {
      tags: { route: "interviews.available-candidates.GET" },
      extra: { userId: auth.user.id, jobId },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

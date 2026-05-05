import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { sendInterviewToChat } from "@/server/services/interviews.service";

const MIN_MS = 60_000;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> },
) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 10/min/user — el handler dispara una transacción de 3 ops (create message,
  // update interview, bump conversation.updatedAt) más broadcast realtime al
  // student. Sin throttle, una company podía spamear notifications al chat.
  const rl = await rateLimit(
    `interview-send-to-chat:${auth.user.id}`,
    10,
    MIN_MS,
  );
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  const { interviewId } = await params;

  try {
    const result = await sendInterviewToChat(interviewId, auth.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const code = (err as Error & { code?: string }).code;

    if (code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Entrevista no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    Sentry.captureException(err, {
      tags: { route: "interviews.send-to-chat.POST" },
      extra: { userId: auth.user.id, interviewId },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

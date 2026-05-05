import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { getMessages, sendMessage } from "@/server/services/chat.service";
import { z } from "zod";

const sendSchema = z.object({
  content: z.string().min(1).max(4000),
});

const MIN_MS = 60_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { conversationId } = await params;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);

  try {
    const result = await getMessages(
      conversationId,
      auth.user.id,
      cursor,
      limit,
    );
    return NextResponse.json(result);
  } catch (err) {
    const code = (err as Error & { code?: string }).code;

    if (code === "NOT_FOUND" || code === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Conversación no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    Sentry.captureException(err, {
      tags: { route: "chat.messages.GET" },
      extra: { userId: auth.user.id, conversationId },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 30 mensajes/min/user para frenar spam-flood en chat sin afectar UX normal.
  const rl = await rateLimit(`chat-message:${auth.user.id}`, 30, MIN_MS);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  const { conversationId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Contenido inválido", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const message = await sendMessage(
      conversationId,
      auth.user.id,
      parsed.data.content,
    );
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const code = (err as Error & { code?: string }).code;

    if (code === "NOT_FOUND" || code === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Conversación no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (code === "STUDENT_CANNOT_INITIATE") {
      return NextResponse.json(
        {
          error: "La empresa debe iniciar la conversación",
          code: "STUDENT_CANNOT_INITIATE",
        },
        { status: 403 },
      );
    }

    Sentry.captureException(err, {
      tags: { route: "chat.messages.POST" },
      extra: { userId: auth.user.id, conversationId },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

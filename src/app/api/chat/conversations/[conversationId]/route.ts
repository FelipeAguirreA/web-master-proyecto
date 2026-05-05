import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { getConversationById } from "@/server/services/chat.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { conversationId } = await params;

  try {
    const conversation = await getConversationById(
      conversationId,
      auth.user.id,
    );
    return NextResponse.json(conversation);
  } catch (err) {
    const code = (err as Error & { code?: string }).code;

    // 404 unification: NOT_FOUND y FORBIDDEN devuelven el mismo 404 para no
    // permitir enumeration de IDs válidos.
    if (code === "NOT_FOUND" || code === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Conversación no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    Sentry.captureException(err, {
      tags: { route: "chat.conversations.[id].GET" },
      extra: { userId: auth.user.id, conversationId },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

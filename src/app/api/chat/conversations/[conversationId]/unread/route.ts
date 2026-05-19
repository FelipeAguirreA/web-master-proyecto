import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { toggleConversationMarkedUnread } from "@/server/services/chat.service";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { conversationId } = await params;

  try {
    const result = await toggleConversationMarkedUnread(
      conversationId,
      auth.user.id,
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
      tags: { route: "chat.unread.PATCH" },
      extra: { userId: auth.user.id, conversationId },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

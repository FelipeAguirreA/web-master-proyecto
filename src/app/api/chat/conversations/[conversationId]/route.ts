import { NextRequest, NextResponse } from "next/server";
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
    const message = err instanceof Error ? err.message : "Error interno";
    if (message.includes("Not authorized")) {
      return NextResponse.json(
        { error: "No autorizado", code: "FORBIDDEN" },
        { status: 403 },
      );
    }
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: "Conversación no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

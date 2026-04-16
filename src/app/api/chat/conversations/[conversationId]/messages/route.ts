import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { getMessages, sendMessage } from "@/server/services/chat.service";
import { z } from "zod";

const sendSchema = z.object({
  content: z.string().min(1).max(4000),
});

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
    const message = err instanceof Error ? err.message : "Error interno";
    if (message.includes("Not authorized")) {
      return NextResponse.json(
        { error: "No autorizado", code: "FORBIDDEN" },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
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
    const message = err instanceof Error ? err.message : "Error interno";
    const code = (err as Error & { code?: string }).code;

    if (code === "STUDENT_CANNOT_INITIATE") {
      return NextResponse.json(
        {
          error: "La empresa debe iniciar la conversación",
          code: "STUDENT_CANNOT_INITIATE",
        },
        { status: 403 },
      );
    }
    if (message.includes("Not authorized")) {
      return NextResponse.json(
        { error: "No autorizado", code: "FORBIDDEN" },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

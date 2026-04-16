import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import {
  getOrCreateConversation,
  getConversationsByUser,
} from "@/server/services/chat.service";
import { z } from "zod";

const createSchema = z.object({
  applicationId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "applicationId es requerido", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const conversation = await getOrCreateConversation(
      auth.user.id,
      parsed.data.applicationId,
    );
    return NextResponse.json(conversation, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    if (message.includes("INTERVIEW stage")) {
      return NextResponse.json(
        {
          error:
            "El chat solo está disponible para postulaciones en etapa INTERVIEW",
          code: "PIPELINE_STATUS_REQUIRED",
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

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const role = auth.user.role as "COMPANY" | "STUDENT";
  if (role !== "COMPANY" && role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const conversations = await getConversationsByUser(auth.user.id, role);
    return NextResponse.json(conversations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

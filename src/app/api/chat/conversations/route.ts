import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
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
    const code = (err as Error & { code?: string }).code;

    if (code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Postulación no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (code === "INTERVIEW_REQUIRED") {
      return NextResponse.json(
        {
          error:
            "El chat solo está disponible para postulaciones en etapa INTERVIEW",
          code: "PIPELINE_STATUS_REQUIRED",
        },
        { status: 403 },
      );
    }

    Sentry.captureException(err, {
      tags: { route: "chat.conversations.POST" },
      extra: { userId: auth.user.id, applicationId: parsed.data.applicationId },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const role = auth.user.role as "COMPANY" | "STUDENT";
  if (role !== "COMPANY" && role !== "STUDENT") {
    return NextResponse.json(
      { error: "No autorizado", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  try {
    const conversations = await getConversationsByUser(auth.user.id, role);
    return NextResponse.json(conversations);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "chat.conversations.GET" },
      extra: { userId: auth.user.id, role },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import {
  getInterviewById,
  updateInterview,
  deleteInterview,
} from "@/server/services/interviews.service";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduledAt: z.string().min(1).optional(),
  durationMins: z.number().int().positive().optional(),
  meetingLink: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  applicationId: z.string().min(1).optional(),
});

type Params = { params: Promise<{ interviewId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { interviewId } = await params;

  try {
    const interview = await getInterviewById(interviewId, auth.user.id);
    return NextResponse.json(interview);
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
        { error: "Entrevista no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { interviewId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateInterview(interviewId, auth.user.id, {
      ...parsed.data,
      scheduledAt: parsed.data.scheduledAt
        ? new Date(parsed.data.scheduledAt)
        : undefined,
      meetingLink:
        parsed.data.meetingLink === "" ? null : parsed.data.meetingLink,
    });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    const code = (err as Error & { code?: string }).code;
    if (code === "INTERVIEW_ALREADY_EXISTS") {
      return NextResponse.json(
        { error: message, code: "INTERVIEW_ALREADY_EXISTS" },
        { status: 409 },
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

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { interviewId } = await params;

  try {
    await deleteInterview(interviewId, auth.user.id);
    return NextResponse.json({ ok: true });
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
        { error: "Entrevista no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

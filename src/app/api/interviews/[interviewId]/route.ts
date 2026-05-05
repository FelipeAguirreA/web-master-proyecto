import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
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
    const code = (err as Error & { code?: string }).code;

    if (code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Entrevista no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    Sentry.captureException(err, {
      tags: { route: "interviews.[id].GET" },
      extra: { userId: auth.user.id, interviewId },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
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
    const code = (err as Error & { code?: string }).code;

    if (code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Entrevista no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (code === "INTERVIEW_ALREADY_EXISTS") {
      return NextResponse.json(
        {
          error: "Este candidato ya tiene una entrevista agendada.",
          code: "INTERVIEW_ALREADY_EXISTS",
        },
        { status: 409 },
      );
    }
    if (code === "NEW_CANDIDATE_NO_CONVERSATION") {
      return NextResponse.json(
        {
          error:
            "El nuevo candidato no tiene una conversación activa. Iniciá el chat primero.",
          code: "NEW_CANDIDATE_NO_CONVERSATION",
        },
        { status: 400 },
      );
    }

    Sentry.captureException(err, {
      tags: { route: "interviews.[id].PATCH" },
      extra: { userId: auth.user.id, interviewId },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
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
    const code = (err as Error & { code?: string }).code;

    if (code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Entrevista no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    Sentry.captureException(err, {
      tags: { route: "interviews.[id].DELETE" },
      extra: { userId: auth.user.id, interviewId },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

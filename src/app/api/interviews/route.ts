import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import {
  createInterview,
  getInterviewsByCompany,
} from "@/server/services/interviews.service";
import { z } from "zod";

const createSchema = z.object({
  internshipId: z.string().min(1),
  applicationId: z.string().min(1),
  conversationId: z.string().min(1),
  title: z.string().min(1).max(200),
  scheduledAt: z.string().min(1),
  durationMins: z.number().int().positive().optional(),
  meetingLink: z.string().optional(),
  notes: z.string().max(2000).optional(),
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
      {
        error: "Datos inválidos",
        code: "VALIDATION_ERROR",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const interview = await createInterview(auth.user.id, {
      ...parsed.data,
      scheduledAt: new Date(parsed.data.scheduledAt),
      meetingLink: parsed.data.meetingLink || undefined,
    });
    return NextResponse.json(interview, { status: 201 });
  } catch (err) {
    const code = (err as Error & { code?: string }).code;

    if (code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Postulación no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (code === "APPLICATION_MISMATCH") {
      return NextResponse.json(
        {
          error: "La postulación no pertenece a esta práctica",
          code: "APPLICATION_MISMATCH",
        },
        { status: 400 },
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

    Sentry.captureException(err, {
      tags: { route: "interviews.POST" },
      extra: {
        userId: auth.user.id,
        applicationId: parsed.data.applicationId,
      },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const internshipId = searchParams.get("internshipId") ?? undefined;
  const status = searchParams.get("status") as
    | "SCHEDULED"
    | "COMPLETED"
    | "CANCELLED"
    | null;

  try {
    const interviews = await getInterviewsByCompany(auth.user.id, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      internshipId,
      status: status ?? undefined,
    });
    return NextResponse.json(interviews);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "interviews.GET" },
      extra: { userId: auth.user.id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
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
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

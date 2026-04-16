import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { sendInterviewToChat } from "@/server/services/interviews.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> },
) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { interviewId } = await params;

  try {
    const result = await sendInterviewToChat(interviewId, auth.user.id);
    return NextResponse.json(result, { status: 201 });
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

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { getAvailableCandidates } from "@/server/services/interviews.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { jobId } = await params;

  try {
    const candidates = await getAvailableCandidates(jobId, auth.user.id);
    return NextResponse.json(candidates);
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
        { error: "Práctica no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

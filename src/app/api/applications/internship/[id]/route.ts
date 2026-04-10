import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { getApplicantsByInternship } from "@/server/services/applications.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const applicants = await getApplicantsByInternship(id, auth.user.id);
    return NextResponse.json(applicants);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

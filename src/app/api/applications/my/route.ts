import { NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { getMyApplications } from "@/server/services/applications.service";

export async function GET() {
  try {
    const auth = await requireAuth("STUDENT");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const applications = await getMyApplications(auth.user.id);
    return NextResponse.json(applications);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

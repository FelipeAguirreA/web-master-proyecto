import { NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { getRecommendations } from "@/server/services/matching.service";

export async function GET() {
  try {
    const auth = await requireAuth("STUDENT");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const recommendations = await getRecommendations(auth.user.id);
    return NextResponse.json(recommendations);
  } catch (error) {
    if (error instanceof Error && error.message === "Upload your CV first") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

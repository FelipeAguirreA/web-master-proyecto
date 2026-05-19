import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { getSavedInternships } from "@/server/services/saved-internships.service";

export async function GET() {
  const auth = await requireAuth("STUDENT");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const saved = await getSavedInternships(auth.user.id);
    return NextResponse.json(saved);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "internships.saved.GET" },
      extra: { userId: auth.user.id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

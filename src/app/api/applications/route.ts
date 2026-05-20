import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/server/lib/auth-guard";
import {
  applyToInternship,
  CV_REQUIRED_MESSAGE,
} from "@/server/services/applications.service";
import { applySchema } from "@/server/validators";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth("STUDENT");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const data = applySchema.parse(body);

    const application = await applyToInternship(
      auth.user.id,
      data.internshipId,
      data.coverLetter,
    );

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      if (error.message === "Already applied") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message === CV_REQUIRED_MESSAGE) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

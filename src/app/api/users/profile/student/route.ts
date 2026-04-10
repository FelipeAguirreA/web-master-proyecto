import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/server/lib/auth-guard";
import { updateStudentProfile } from "@/server/services/users.service";
import { studentProfileSchema } from "@/server/validators";

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth("STUDENT");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const data = studentProfileSchema.parse(body);

    const profile = await updateStudentProfile(auth.user.id, data);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

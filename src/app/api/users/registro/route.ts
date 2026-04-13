import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/server/lib/auth-guard";
import { completeStudentRegistration } from "@/server/services/users.service";
import { registrationSchema, normalizarRUT } from "@/server/validators";
import { prisma } from "@/server/lib/db";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth("STUDENT");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const data = registrationSchema.parse(body);

    const rutNormalizado = normalizarRUT(data.rut);

    // Check RUT uniqueness before writing
    const existing = await prisma.user.findUnique({
      where: { rut: rutNormalizado },
    });
    if (existing && existing.id !== auth.user.id) {
      return NextResponse.json(
        { error: "Este RUT ya está registrado" },
        { status: 409 },
      );
    }

    await completeStudentRegistration(auth.user.id, {
      name: data.name,
      lastName: data.lastName,
      rut: rutNormalizado,
      phone: data.phone,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      // Zod v4 usa .issues, v3 usaba .errors
      const issues =
        error.issues ??
        (error as unknown as { errors: typeof error.issues }).errors ??
        [];
      const message = issues[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

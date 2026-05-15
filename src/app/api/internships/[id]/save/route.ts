import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";
import { toggleSavedInternship } from "@/server/services/saved-internships.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth("STUDENT");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  // Verifica que la práctica exista, esté activa y la empresa esté aprobada.
  // Anti-enumeration: 404 indistinguible para "no existe", "inactiva" o
  // "empresa suspendida" — no leak de estados internos.
  const internship = await prisma.internship.findFirst({
    where: {
      id,
      isActive: true,
      company: { companyStatus: "APPROVED" },
    },
    select: { id: true },
  });

  if (!internship) {
    return NextResponse.json(
      { error: "Práctica no encontrada", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  try {
    const result = await toggleSavedInternship(auth.user.id, id);
    return NextResponse.json(result);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "internships.save.POST" },
      extra: { userId: auth.user.id, internshipId: id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

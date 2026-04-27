import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error, code: "UNAUTHORIZED" },
        { status: auth.status },
      );
    }

    const { jobId } = await params;

    const company = await prisma.companyProfile.findUnique({
      where: { userId: auth.user.id },
    });
    // #F1 — 404 unificado en ownership fail (anti enumeration).
    if (!company) {
      return NextResponse.json(
        { error: "Recurso no encontrado", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const internship = await prisma.internship.findFirst({
      where: { id: jobId, companyId: company.id },
    });
    if (!internship) {
      return NextResponse.json(
        { error: "Recurso no encontrado", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const config = await prisma.aTSConfig.findUnique({
      where: { internshipId: jobId },
      include: { modules: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ config: config ?? null });
  } catch (error) {
    // #F2 — observabilidad + no leak de mensajes crudos de Prisma/infra.
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";

const patchSchema = z.object({
  status: z.enum(["PENDING", "REVIEWING", "INTERVIEW", "REJECTED"]),
});

// El pipelineStatus (operativo) dicta el status (decisión) para mantenerlos
// sincronizados: mover una tarjeta en el kanban refleja la decisión final.
const PIPELINE_TO_STATUS = {
  PENDING: "PENDING",
  REVIEWING: "REVIEWED",
  INTERVIEW: "ACCEPTED",
  REJECTED: "REJECTED",
} as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error, code: "UNAUTHORIZED" },
        { status: auth.status },
      );
    }

    const { applicationId } = await params;

    const raw = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Estado inválido", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        internship: { include: { company: true } },
      },
    });

    // #F1 — 404 unificado en ownership fail (anti enumeration). Antes
    // diferenciaba 404 (no existe) vs 403 (no es del owner) → atacante
    // podía enumerar IDs válidos de applications.
    if (!application) {
      return NextResponse.json(
        { error: "Recurso no encontrado", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const company = await prisma.companyProfile.findUnique({
      where: { userId: auth.user.id },
    });

    if (!company || application.internship.company.id !== company.id) {
      return NextResponse.json(
        { error: "Recurso no encontrado", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        pipelineStatus: parsed.data.status,
        status: PIPELINE_TO_STATUS[parsed.data.status],
      },
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    // #F2 — observabilidad + no leak de mensajes crudos de Prisma/infra.
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

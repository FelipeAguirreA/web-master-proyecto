import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";

const patchSchema = z.object({
  status: z.enum(["PENDING", "REVIEWING", "INTERVIEW", "REJECTED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: "UNAUTHORIZED" },
      { status: auth.status },
    );
  }

  const { applicationId } = await params;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Estado inválido", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  // Verificar ownership
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      internship: { include: { company: true } },
    },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Postulación no encontrada", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const company = await prisma.companyProfile.findUnique({
    where: { userId: auth.user.id },
  });

  if (!company || application.internship.company.id !== company.id) {
    return NextResponse.json(
      { error: "No autorizado", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  // El pipelineStatus (operativo) dicta el status (decisión) para mantenerlos
  // sincronizados: mover una tarjeta en el kanban refleja la decisión final.
  const PIPELINE_TO_STATUS = {
    PENDING: "PENDING",
    REVIEWING: "REVIEWED",
    INTERVIEW: "ACCEPTED",
    REJECTED: "REJECTED",
  } as const;

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      pipelineStatus: parsed.data.status,
      status: PIPELINE_TO_STATUS[parsed.data.status],
    },
  });

  return NextResponse.json({ application: updated });
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";
import { scoreApplication } from "@/server/lib/ats/scoring-engine";

export async function POST(
  _req: NextRequest,
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

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      internship: {
        include: {
          company: true,
          atsConfig: { include: { modules: { orderBy: { order: "asc" } } } },
        },
      },
      student: {
        include: { studentProfile: true },
      },
    },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Postulación no encontrada", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  // Verificar que la empresa es dueña de la práctica
  const company = await prisma.companyProfile.findUnique({
    where: { userId: auth.user.id },
  });
  if (!company || application.internship.company.id !== company.id) {
    return NextResponse.json(
      { error: "No autorizado", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const atsConfig = application.internship.atsConfig;
  if (!atsConfig || !atsConfig.isActive) {
    return NextResponse.json(
      { error: "ATS no está activo para esta práctica", code: "ATS_INACTIVE" },
      { status: 400 },
    );
  }

  const cvText = application.student.studentProfile?.cvText ?? "";
  const profileSkills = application.student.studentProfile?.skills ?? [];

  const result = scoreApplication(
    cvText,
    profileSkills,
    atsConfig.modules as Parameters<typeof scoreApplication>[2],
  );

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      atsScore: result.atsScore,
      moduleScores: result.moduleScores as unknown as Prisma.InputJsonValue,
      passedFilters: result.passedFilters,
      filterReason: result.filterReason,
    },
  });

  return NextResponse.json({ application: updated, result });
}

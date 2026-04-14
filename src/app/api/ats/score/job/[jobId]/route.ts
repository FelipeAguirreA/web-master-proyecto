import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";
import { scoreApplication } from "@/server/lib/ats/scoring-engine";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
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
  if (!company) {
    return NextResponse.json(
      { error: "Empresa no encontrada", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const internship = await prisma.internship.findFirst({
    where: { id: jobId, companyId: company.id },
    include: {
      atsConfig: { include: { modules: { orderBy: { order: "asc" } } } },
    },
  });

  if (!internship) {
    return NextResponse.json(
      { error: "Práctica no encontrada o no autorizada", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const atsConfig = internship.atsConfig;
  if (!atsConfig || !atsConfig.isActive) {
    return NextResponse.json(
      { error: "ATS no está activo para esta práctica", code: "ATS_INACTIVE" },
      { status: 400 },
    );
  }

  const applications = await prisma.application.findMany({
    where: { internshipId: jobId },
    include: {
      student: { include: { studentProfile: true } },
    },
  });

  const results = await Promise.all(
    applications.map(async (app) => {
      const cvText = app.student.studentProfile?.cvText ?? "";
      const profileSkills = app.student.studentProfile?.skills ?? [];
      const result = scoreApplication(
        cvText,
        profileSkills,
        atsConfig.modules as Parameters<typeof scoreApplication>[2],
      );

      await prisma.application.update({
        where: { id: app.id },
        data: {
          atsScore: result.atsScore,
          moduleScores: result.moduleScores,
          passedFilters: result.passedFilters,
          filterReason: result.filterReason,
        },
      });

      return { applicationId: app.id, ...result };
    }),
  );

  return NextResponse.json({ scored: results.length, results });
}

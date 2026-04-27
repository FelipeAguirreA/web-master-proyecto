import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";
import { scoreApplication } from "@/server/lib/ats/scoring-engine";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";

const MIN_MS = 60_000;

export async function POST(
  _req: NextRequest,
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

    // #F5 — rate limit antes de tocar DB. scoreApplication es CPU (parsing CV
    // + matching de skills/experience por módulo). Sin throttle, una COMPANY
    // autenticada puede hacer DoS interno disparando POSTs en loop.
    const rl = await rateLimit(`ats-score-one:${auth.user.id}`, 60, MIN_MS);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

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

    // #F1 — 404 unificado en ownership fail (anti enumeration).
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

    const atsConfig = application.internship.atsConfig;
    if (!atsConfig || !atsConfig.isActive) {
      return NextResponse.json(
        {
          error: "ATS no está activo para esta práctica",
          code: "ATS_INACTIVE",
        },
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
  } catch (error) {
    // #F2 — observabilidad + no leak de mensajes crudos de Prisma/infra.
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

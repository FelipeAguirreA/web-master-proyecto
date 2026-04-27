import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";
import { scoreApplication } from "@/server/lib/ats/scoring-engine";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";

const MIN_MS = 60_000;
const BATCH_SIZE = 5;

export async function POST(
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

    // #F4 — rate limit antes de tocar DB. Este endpoint scorea TODAS las
    // applications de una internship → costo proporcional a N. Sin throttle,
    // una COMPANY puede saturar CPU + connection pool de Prisma con loops.
    const rl = await rateLimit(`ats-score-job:${auth.user.id}`, 5, MIN_MS);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

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
      include: {
        atsConfig: { include: { modules: { orderBy: { order: "asc" } } } },
      },
    });

    if (!internship) {
      return NextResponse.json(
        { error: "Recurso no encontrado", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const atsConfig = internship.atsConfig;
    if (!atsConfig || !atsConfig.isActive) {
      return NextResponse.json(
        {
          error: "ATS no está activo para esta práctica",
          code: "ATS_INACTIVE",
        },
        { status: 400 },
      );
    }

    const applications = await prisma.application.findMany({
      where: { internshipId: jobId },
      include: {
        student: { include: { studentProfile: true } },
      },
    });

    // #F4 — batch processing con concurrencia limitada. Antes era
    // `Promise.all(applications.map(...))` crudo: con N=200 disparaba 200
    // updates a Prisma simultáneos + 200 ejecuciones de scoreApplication
    // (CPU). Procesar en chunks de BATCH_SIZE limita el pico de carga.
    const results: Array<
      { applicationId: string } & ReturnType<typeof scoreApplication>
    > = [];
    for (let i = 0; i < applications.length; i += BATCH_SIZE) {
      const batch = applications.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (app) => {
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
              moduleScores:
                result.moduleScores as unknown as Prisma.InputJsonValue,
              passedFilters: result.passedFilters,
              filterReason: result.filterReason,
            },
          });

          return { applicationId: app.id, ...result };
        }),
      );
      results.push(...batchResults);
    }

    return NextResponse.json({ scored: results.length, results });
  } catch (error) {
    // #F2 — observabilidad + no leak de mensajes crudos de Prisma/infra.
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";

// #F3 — params discriminado por type. Antes era `z.any()` y entraba al
// JSON column de Postgres sin validar; los scorers asumen formas concretas
// (skills.scorer espera { required: string[], preferred: string[], hardFilter: bool },
// experience espera { minYears, preferredRoles, hardFilter }, etc.). Schema
// estricto por type cierra superficie y previene basura llegando a los scorers.
const skillsParamsSchema = z
  .object({
    required: z.array(z.string().min(1)).max(50).default([]),
    preferred: z.array(z.string().min(1)).max(50).default([]),
    hardFilter: z.boolean().default(false),
  })
  .strict();

const experienceParamsSchema = z
  .object({
    minYears: z.number().min(0).max(50).default(0),
    preferredRoles: z.array(z.string().min(1)).max(50).default([]),
    hardFilter: z.boolean().default(false),
  })
  .strict();

const educationParamsSchema = z
  .object({
    minGPA: z.number().min(0).max(7).default(0),
    preferredDegrees: z.array(z.string().min(1)).max(50).default([]),
    hardFilter: z.boolean().default(false),
  })
  .strict();

const languagesParamsSchema = z
  .object({
    required: z.array(z.string().min(1)).max(20).default([]),
    preferred: z.array(z.string().min(1)).max(20).default([]),
    hardFilter: z.boolean().default(false),
  })
  .strict();

const portfolioParamsSchema = z
  .object({
    required: z.boolean().default(false),
    keywords: z.array(z.string().min(1)).max(20).default([]),
    hardFilter: z.boolean().default(false),
  })
  .strict();

// CUSTOM no tiene scorer real (devuelve 50 por default). Aceptamos objeto
// vacío o cualquier shape passthrough — el scoring engine lo ignora.
const customParamsSchema = z.object({}).passthrough();

const moduleBaseFields = {
  label: z.string().min(1).max(120),
  isActive: z.boolean(),
  weight: z.number().int().min(0).max(100),
  order: z.number().int().min(0).max(100),
};

const moduleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SKILLS"),
    ...moduleBaseFields,
    params: skillsParamsSchema,
  }),
  z.object({
    type: z.literal("EXPERIENCE"),
    ...moduleBaseFields,
    params: experienceParamsSchema,
  }),
  z.object({
    type: z.literal("EDUCATION"),
    ...moduleBaseFields,
    params: educationParamsSchema,
  }),
  z.object({
    type: z.literal("LANGUAGES"),
    ...moduleBaseFields,
    params: languagesParamsSchema,
  }),
  z.object({
    type: z.literal("PORTFOLIO"),
    ...moduleBaseFields,
    params: portfolioParamsSchema,
  }),
  z.object({
    type: z.literal("CUSTOM"),
    ...moduleBaseFields,
    params: customParamsSchema,
  }),
]);

const configSchema = z.object({
  internshipId: z.string().min(1),
  isActive: z.boolean(),
  modules: z.array(moduleSchema).max(20),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error, code: "UNAUTHORIZED" },
        { status: auth.status },
      );
    }

    const raw = await req.json().catch(() => null);
    const parsed = configSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { internshipId, isActive, modules } = parsed.data;

    const company = await prisma.companyProfile.findUnique({
      where: { userId: auth.user.id },
    });
    // #F1 — 404 unificado en ownership fail. Antes el handler diferenciaba
    // 404 (company sin profile) vs 403 (internship ajena), permitiendo
    // enumerar IDs válidos. Ahora ambas rutas devuelven 404.
    if (!company) {
      return NextResponse.json(
        { error: "Recurso no encontrado", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const internship = await prisma.internship.findFirst({
      where: { id: internshipId, companyId: company.id },
    });
    if (!internship) {
      return NextResponse.json(
        { error: "Recurso no encontrado", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const activeModules = modules.filter((m) => m.isActive);
    if (activeModules.length > 0) {
      const totalWeight = activeModules.reduce((sum, m) => sum + m.weight, 0);
      if (totalWeight !== 100) {
        return NextResponse.json(
          {
            error: `Los pesos de los módulos activos deben sumar 100 (actual: ${totalWeight})`,
            code: "INVALID_WEIGHTS",
          },
          { status: 400 },
        );
      }
    }

    const config = await prisma.$transaction(async (tx) => {
      const atsConfig = await tx.aTSConfig.upsert({
        where: { internshipId },
        update: { isActive },
        create: { internshipId, isActive },
      });

      await tx.aTSModule.deleteMany({ where: { atsConfigId: atsConfig.id } });

      if (modules.length > 0) {
        await tx.aTSModule.createMany({
          data: modules.map((m) => ({
            atsConfigId: atsConfig.id,
            type: m.type,
            label: m.label,
            isActive: m.isActive,
            weight: m.weight,
            order: m.order,
            params: m.params,
          })),
        });
      }

      return tx.aTSConfig.findUnique({
        where: { id: atsConfig.id },
        include: { modules: { orderBy: { order: "asc" } } },
      });
    });

    return NextResponse.json({ config }, { status: 200 });
  } catch (error) {
    // #F2 — observabilidad + no leak de mensajes crudos de Prisma/infra.
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

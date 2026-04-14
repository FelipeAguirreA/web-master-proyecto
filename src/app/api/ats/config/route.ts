import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";

const moduleSchema = z.object({
  type: z.enum([
    "SKILLS",
    "EXPERIENCE",
    "EDUCATION",
    "LANGUAGES",
    "PORTFOLIO",
    "CUSTOM",
  ]),
  label: z.string().min(1),
  isActive: z.boolean(),
  weight: z.number().int().min(0).max(100),
  order: z.number().int().min(0),
  params: z.record(z.unknown()),
});

const configSchema = z.object({
  internshipId: z.string().min(1),
  isActive: z.boolean(),
  modules: z.array(moduleSchema),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: "UNAUTHORIZED" },
      { status: auth.status },
    );
  }

  const body = await req.json();
  const parsed = configSchema.safeParse(body);
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

  // Verificar que la práctica pertenece a la empresa
  const company = await prisma.companyProfile.findUnique({
    where: { userId: auth.user.id },
  });
  if (!company) {
    return NextResponse.json(
      { error: "Perfil de empresa no encontrado", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const internship = await prisma.internship.findFirst({
    where: { id: internshipId, companyId: company.id },
  });
  if (!internship) {
    return NextResponse.json(
      { error: "Práctica no encontrada o no autorizada", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  // Validar que los pesos activos sumen 100
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

  // Upsert ATSConfig + reemplazar módulos en transacción
  const config = await prisma.$transaction(async (tx) => {
    const atsConfig = await tx.aTSConfig.upsert({
      where: { internshipId },
      update: { isActive },
      create: { internshipId, isActive },
    });

    // Eliminar módulos existentes y recrear
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
}

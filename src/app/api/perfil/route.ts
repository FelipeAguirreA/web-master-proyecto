import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  phone: z.string().max(20).optional(),
});

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        code: "VALIDATION_ERROR",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        name: parsed.data.name.trim(),
        lastName: parsed.data.lastName.trim(),
        phone: parsed.data.phone?.trim() ?? null,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        phone: true,
        image: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "perfil.PUT" },
      extra: { userId: auth.user.id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        rut: true,
        role: true,
        image: true,
        companyProfile: {
          select: { companyName: true, companyStatus: true },
        },
      },
    });

    return NextResponse.json(user);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "perfil.GET" },
      extra: { userId: auth.user.id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";
import { sendCompanyStatusEmail } from "@/server/lib/mail";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const newStatus =
      parsed.data.action === "approve" ? "APPROVED" : "REJECTED";

    let updated;
    try {
      updated = await prisma.companyProfile.update({
        where: { id },
        data: { companyStatus: newStatus },
        include: {
          user: { select: { email: true, name: true } },
        },
      });
    } catch (err) {
      // P2025 = RecordNotFound (Prisma). El admin pasó un id de empresa que
      // no existe → 404, no 500. Cualquier otro error de DB sí es 500.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json(
          { error: "Empresa no encontrada" },
          { status: 404 },
        );
      }
      throw err;
    }

    // Email no bloqueante. Si falla, va a Sentry con tag para alertas y
    // contexto suficiente para que el admin pueda reenviar manualmente.
    sendCompanyStatusEmail(
      updated.user.email,
      updated.companyName,
      newStatus,
    ).catch((err) =>
      Sentry.captureException(err, {
        tags: { mail: "company_status" },
        extra: { empresaId: id, newStatus },
      }),
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

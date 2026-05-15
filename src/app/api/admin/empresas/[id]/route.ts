import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";
import { sendCompanyStatusEmail } from "@/server/lib/mail";
import { createLogger } from "@/server/lib/logger";

const log = createLogger({ route: "api/admin/empresas/[id]" });

// suspend: bloquea el acceso al dashboard de la empresa hasta que el admin la
// reactive. reason es opcional pero recomendado — se muestra al usuario en la
// pantalla de cuenta suspendida y en el email de notificación.
// unsuspend: vuelve a APPROVED y limpia reason+suspendedAt.
// reopen: vuelve a PENDING (cola de revisión). Sin email — el admin sabe lo que
// hizo y la empresa lo descubre al intentar entrar.
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject") }),
  z.object({
    action: z.literal("suspend"),
    reason: z.string().trim().min(1).max(500).optional(),
  }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("reopen") }),
]);

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

    const data = parsed.data;
    const updatePayload: {
      companyStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
      suspensionReason?: string | null;
      suspendedAt?: Date | null;
    } =
      data.action === "approve"
        ? {
            companyStatus: "APPROVED",
            suspensionReason: null,
            suspendedAt: null,
          }
        : data.action === "reject"
          ? { companyStatus: "REJECTED" }
          : data.action === "suspend"
            ? {
                companyStatus: "SUSPENDED",
                suspensionReason: data.reason ?? null,
                suspendedAt: new Date(),
              }
            : data.action === "unsuspend"
              ? {
                  companyStatus: "APPROVED",
                  suspensionReason: null,
                  suspendedAt: null,
                }
              : {
                  companyStatus: "PENDING",
                  suspensionReason: null,
                  suspendedAt: null,
                };

    const newStatus = updatePayload.companyStatus;
    const suspensionReason =
      data.action === "suspend" ? (data.reason ?? null) : null;
    const shouldSendEmail = data.action !== "reopen";

    let updated;
    try {
      updated = await prisma.companyProfile.update({
        where: { id },
        data: updatePayload,
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
    // reopen no manda email (status PENDING no tiene plantilla y el cambio es
    // sólo administrativo — la empresa se entera al intentar entrar).
    if (shouldSendEmail && newStatus !== "PENDING") {
      sendCompanyStatusEmail(
        updated.user.email,
        updated.companyName,
        newStatus,
        suspensionReason,
      ).catch((err) =>
        Sentry.captureException(err, {
          tags: { mail: "company_status" },
          extra: { empresaId: id, newStatus },
        }),
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    log.error({ err }, "admin empresas PATCH failed");
    Sentry.captureException(err, {
      tags: { route: "admin.empresas.PATCH" },
    });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

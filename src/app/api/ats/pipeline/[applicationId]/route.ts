import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";
import { sendStatusUpdateEmail } from "@/server/lib/mail";

const patchSchema = z.object({
  status: z.enum(["PENDING", "REVIEWING", "INTERVIEW", "ACCEPTED", "REJECTED"]),
});

// El pipelineStatus (operativo) dicta el status (decisión) para mantenerlos
// sincronizados: mover una tarjeta en el kanban refleja la decisión final.
// INTERVIEW se mapea a REVIEWED (sigue en evaluación), y ACCEPTED es la
// columna explícita "Aprobado" donde se confirma la decisión final.
const PIPELINE_TO_STATUS = {
  PENDING: "PENDING",
  REVIEWING: "REVIEWED",
  INTERVIEW: "REVIEWED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
} as const;

export async function PATCH(
  req: NextRequest,
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

    const { applicationId } = await params;

    const raw = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Estado inválido", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        internship: { include: { company: true } },
        student: { select: { email: true, name: true } },
      },
    });

    // #F1 — 404 unificado en ownership fail (anti enumeration). Antes
    // diferenciaba 404 (no existe) vs 403 (no es del owner) → atacante
    // podía enumerar IDs válidos de applications.
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

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        pipelineStatus: parsed.data.status,
        status: PIPELINE_TO_STATUS[parsed.data.status],
      },
    });

    // Notificación in-app al estudiante por avance en su postulación. Se
    // dispara solo si el pipelineStatus realmente cambió (evita spam si el
    // dropdown del kanban hace un PATCH redundante con el mismo valor).
    if (application.pipelineStatus !== parsed.data.status) {
      const internshipTitle = application.internship.title;
      const notifMap: Record<
        "REVIEWING" | "INTERVIEW" | "ACCEPTED" | "REJECTED",
        {
          type:
            | "APPLICATION_REVIEWED"
            | "APPLICATION_ACCEPTED"
            | "APPLICATION_REJECTED";
          title: string;
          body: string;
        }
      > = {
        REVIEWING: {
          type: "APPLICATION_REVIEWED",
          title: "Tu postulación está en revisión",
          body: `La empresa está revisando tu postulación a "${internshipTitle}".`,
        },
        INTERVIEW: {
          type: "APPLICATION_REVIEWED",
          title: "¡Pasaste a entrevista!",
          body: `Avanzaste a etapa de entrevista en "${internshipTitle}".`,
        },
        ACCEPTED: {
          type: "APPLICATION_ACCEPTED",
          title: "¡Postulación aprobada! 🎉",
          body: `Tu postulación a "${internshipTitle}" fue aprobada. La empresa te contactará pronto.`,
        },
        REJECTED: {
          type: "APPLICATION_REJECTED",
          title: "Postulación no seleccionada",
          body: `Tu postulación a "${internshipTitle}" no fue seleccionada en esta oportunidad.`,
        },
      };
      const notif =
        parsed.data.status !== "PENDING" ? notifMap[parsed.data.status] : null;
      if (notif) {
        await prisma.notification.create({
          data: {
            userId: application.studentId,
            type: notif.type,
            title: notif.title,
            body: notif.body,
            entityId: applicationId,
          },
        });
      }

      // Email no bloqueante para decisiones finales (ACCEPTED/REJECTED). La
      // notif in-app ya quedó persistida arriba; el email es refuerzo. Falla
      // del transport (Brevo, DNS, etc.) NO debe romper el PATCH del kanban.
      if (
        parsed.data.status === "ACCEPTED" ||
        parsed.data.status === "REJECTED"
      ) {
        sendStatusUpdateEmail(
          application.student.email,
          application.student.name,
          internshipTitle,
          parsed.data.status,
        ).catch((err) =>
          Sentry.captureException(err, {
            tags: { mail: "status_update", route: "ats.pipeline.PATCH" },
            extra: { applicationId, status: parsed.data.status },
          }),
        );
      }
    }

    return NextResponse.json({ application: updated });
  } catch (error) {
    // #F2 — observabilidad + no leak de mensajes crudos de Prisma/infra.
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

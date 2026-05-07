import * as Sentry from "@sentry/nextjs";

import { prisma } from "@/server/lib/db";
import { removeFile, pathFromPublicUrl } from "@/server/lib/storage";
import { logEvent, AuditAction } from "@/server/services/audit-log.service";

/**
 * F-Legal-2.3 (Ley 21.719): derecho de cancelación / supresión.
 *
 * Borrado real:
 *  1. Recuperamos cvUrl si es estudiante (necesitamos el path antes de borrar).
 *  2. prisma.user.delete cascadea a TODAS las relaciones (configurado en
 *     schema con onDelete: Cascade): StudentProfile, CompanyProfile,
 *     Application, Conversation, Message, Interview, Notification,
 *     RefreshToken. ATSConfig + ATSModule cascadean vía Internship.
 *  3. removeFile en Supabase Storage para eliminar el blob del CV.
 *     Si falla (red, archivo huérfano), va a Sentry pero NO bloquea el
 *     borrado de DB — el user no debería quedar con cuenta viva por un
 *     fallo de Storage.
 *
 * Trade-off: si el Storage falla, el blob del CV queda huérfano en
 * Supabase. Conscientemente aceptado: la prioridad es que el user pueda
 * irse de la plataforma. Limpieza de huérfanos = job futuro de F-Legal-3
 * (retention policy + cron de purga).
 */
export async function deleteAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: { select: { cvUrl: true } } },
  });

  if (!user) throw new Error("User not found");

  const cvUrl = user.studentProfile?.cvUrl ?? null;

  await prisma.user.delete({ where: { id: userId } });

  // F-Legal-3.4: audit log forense. userId queda null (el user ya no existe);
  // el ID borrado se persiste en targetId para trazabilidad sin PII directa.
  await logEvent({
    userId: null,
    action: AuditAction.ACCOUNT_DELETED,
    targetType: "User",
    targetId: userId,
    metadata: { hadCv: cvUrl !== null },
  });

  if (cvUrl) {
    const path = pathFromPublicUrl(cvUrl, "documents");
    if (path) {
      try {
        await removeFile("documents", path);
      } catch (err) {
        Sentry.captureException(err, {
          tags: { route: "users.me.delete", phase: "storage_cleanup" },
          extra: { userId, path },
        });
      }
    }
  }
}

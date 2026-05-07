import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/server/lib/db";

/**
 * F-Legal-3.4 (Ley 21.719): trazabilidad forense de eventos sensibles.
 *
 * Eventos que registramos (lista no exhaustiva — agregar a medida que
 * surjan necesidades de auditoría):
 *  - ACCOUNT_DELETED: cuenta eliminada vía ARCO+.
 *  - DATA_EXPORTED: el user descargó su ZIP de datos.
 *  - COMPANY_APPROVED / COMPANY_REJECTED: decisión admin sobre empresa.
 *
 * NO registramos:
 *  - Logins (ya están en Sentry breadcrumbs + login_failed alerts).
 *  - Lecturas comunes (sería ruido infinito).
 *  - Mutaciones triviales sobre data del propio user (perfil personal).
 *
 * Principio: registrar lo que un auditor de la APDP querría poder
 * reconstruir si pasara un incidente.
 */

export const AuditAction = {
  ACCOUNT_DELETED: "ACCOUNT_DELETED",
  DATA_EXPORTED: "DATA_EXPORTED",
  COMPANY_APPROVED: "COMPANY_APPROVED",
  COMPANY_REJECTED: "COMPANY_REJECTED",
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

interface LogEventInput {
  userId: string | null;
  action: AuditActionValue;
  targetType?: string;
  targetId?: string;
  requestId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Persiste un evento de auditoría. Defensa: si el insert falla por
 * cualquier razón (DB caída, schema desync, etc.), NO bloqueamos el
 * flujo del caller — el evento operacional ya pasó (el user ya borró
 * su cuenta, el admin ya aprobó la empresa). El fail va a Sentry para
 * que sepamos del gap pero no rompemos UX.
 */
export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        requestId: input.requestId ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { audit: "log_failed", action: input.action },
      extra: { userId: input.userId, requestId: input.requestId },
    });
  }
}

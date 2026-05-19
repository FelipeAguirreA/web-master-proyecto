import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";

/**
 * GET /api/chat/unread-count
 *
 * Endpoint dedicado al badge de unread del topbar/sidebar. Antes ese badge
 * lo calculaba el frontend trayendo la lista COMPLETA de conversaciones
 * (con joins pesados) cada 5s solo para sumar `unreadCount`. Esta ruta hace
 * un único SELECT COUNT(*) contra `messages` — orden de magnitud más barato.
 *
 * Cuenta mensajes:
 * - No leídos (`isRead = false`)
 * - NO enviados por el propio user (no se cuenta lo que el user mismo escribió)
 * - En conversaciones donde el user es company o student participant
 *
 * Returns: { count: number }
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const role = auth.user.role as "COMPANY" | "STUDENT";
  if (role !== "COMPANY" && role !== "STUDENT") {
    return NextResponse.json(
      { error: "No autorizado", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  try {
    const count = await prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: auth.user.id },
        conversation:
          role === "COMPANY"
            ? { companyId: auth.user.id }
            : { studentId: auth.user.id },
      },
    });

    return NextResponse.json({ count });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "chat.unread-count.GET" },
      extra: { userId: auth.user.id, role },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    // deleteMany con filtro de owner: si no es del user, count=0 → 404 sin
    // leak (anti-enumeration natural — no diferencia "no existe" vs "ajena").
    const result = await prisma.notification.deleteMany({
      where: { id, userId: auth.user.id },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Notificación no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "notifications.[id].DELETE" },
      extra: { userId: auth.user.id, notificationId: id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

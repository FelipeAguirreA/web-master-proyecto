import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { prisma } from "@/server/lib/db";

const MIN_MS = 60_000;

export async function PATCH() {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 10/min/user — el handler dispara updateMany sobre TODAS las notificaciones
  // del user (puede tocar muchas rows). Sin throttle, ataque hot-loop a la DB.
  const rl = await rateLimit(
    `notifications-read-all:${auth.user.id}`,
    10,
    MIN_MS,
  );
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    await prisma.notification.updateMany({
      where: { userId: auth.user.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "notifications.read-all.PATCH" },
      extra: { userId: auth.user.id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { requireAuth } from "@/server/lib/auth-guard";
import { getUserWithProfile } from "@/server/services/users.service";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { deleteAccount } from "@/server/services/delete-account.service";
import {
  buildClearCookie,
  sessionCookieName,
  refreshCookieName,
} from "@/server/lib/auth-cookies";
import { createLogger, getRequestId } from "@/server/lib/logger";

const HOUR_MS = 60 * 60 * 1000;

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const user = await getUserWithProfile(auth.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * F-Legal-2.3: derecho de cancelación / supresión (Ley 21.719).
 *
 * Confirmación obligatoria vía header `X-Confirm-Delete: yes`. Sin ella,
 * 400 — defensa contra clicks accidentales o requests CSRF mal armados
 * (aunque ya tenemos SameSite=Lax cookies, defense in depth).
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const confirm = request.headers.get("x-confirm-delete");
  if (confirm !== "yes") {
    return NextResponse.json(
      {
        error:
          "Falta confirmación. Para eliminar tu cuenta, enviá el header X-Confirm-Delete: yes.",
        code: "CONFIRMATION_REQUIRED",
      },
      { status: 400 },
    );
  }

  const rl = await rateLimit(`delete-account:${auth.user.id}`, 3, HOUR_MS);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    await deleteAccount(auth.user.id);

    const response = NextResponse.json({ success: true }, { status: 200 });

    // Clear cookies de sesión y refresh: la cuenta no existe más, no tiene
    // sentido mantener el JWT viejo en el browser.
    const sessionClear = buildClearCookie(sessionCookieName);
    const refreshClear = buildClearCookie(refreshCookieName);
    for (const cookie of [sessionClear, refreshClear]) {
      response.cookies.set({
        name: cookie.name,
        value: cookie.value,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        path: cookie.path,
        expires: cookie.expires,
      });
    }

    Sentry.addBreadcrumb({
      category: "auth",
      message: "account deleted (ARCO+)",
      level: "info",
      data: { userId: auth.user.id },
    });

    return response;
  } catch (err) {
    const log = createLogger({
      route: "users.me.DELETE",
      requestId: getRequestId(request.headers),
      userId: auth.user.id,
    });
    log.error({ err }, "delete-account failed");
    Sentry.captureException(err, {
      tags: { route: "users.me.DELETE" },
    });
    return NextResponse.json(
      { error: "Error eliminando la cuenta", code: "DELETE_ERROR" },
      { status: 500 },
    );
  }
}

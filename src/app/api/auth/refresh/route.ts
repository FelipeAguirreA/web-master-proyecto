import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { validateAndRotate } from "@/server/services/refresh-tokens.service";
import { buildJwtPayload, encodeAccessJwt } from "@/server/lib/auth-jwt";
import {
  buildSessionCookie,
  buildRefreshCookie,
  buildClearCookie,
  refreshCookieName,
  sessionCookieName,
} from "@/server/lib/auth-cookies";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";

const REFRESH_RATE_LIMIT = 10;
const REFRESH_RATE_WINDOW_MS = 60 * 1000;

function clearAuthCookies(res: NextResponse) {
  res.cookies.set(buildClearCookie(refreshCookieName));
  res.cookies.set(buildClearCookie(sessionCookieName));
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = await rateLimit(
      `refresh:${ip}`,
      REFRESH_RATE_LIMIT,
      REFRESH_RATE_WINDOW_MS,
    );
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const rawToken = req.cookies.get(refreshCookieName)?.value;
    if (!rawToken) {
      return NextResponse.json(
        { error: "No hay sesión activa." },
        { status: 401 },
      );
    }

    const result = await validateAndRotate(rawToken);

    if (result.kind === "invalid") {
      return clearAuthCookies(
        NextResponse.json(
          { error: "Sesión inválida o expirada." },
          { status: 401 },
        ),
      );
    }

    if (result.kind === "reuse-detected") {
      // Reuse de un refresh token ya rotado = señal fuerte de cuenta
      // comprometida. Va a Sentry como event level=error (no warning) para
      // que dispare alertas — coherente con el paso 3.6 (login attempts).
      // userId interno (cuid) no es PII en sí mismo, no se hashea.
      Sentry.captureMessage("Refresh token reuse detected", {
        level: "error",
        tags: { auth: "refresh_reuse" },
        extra: { userId: result.userId, ip },
      });
      return clearAuthCookies(
        NextResponse.json(
          { error: "Sesión revocada por seguridad. Volvé a iniciar sesión." },
          { status: 401 },
        ),
      );
    }

    const payload = await buildJwtPayload(result.token.userId);
    if (!payload) {
      // El user fue borrado entre la rotación y el lookup — caso raro pero
      // posible. Limpiamos cookies y forzamos re-login.
      return clearAuthCookies(
        NextResponse.json({ error: "Usuario no encontrado." }, { status: 401 }),
      );
    }

    const accessJwt = await encodeAccessJwt(payload);

    const response = NextResponse.json({
      ok: true,
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        registrationCompleted: payload.registrationCompleted,
        companyStatus: payload.companyStatus,
      },
    });
    response.cookies.set(buildSessionCookie(accessJwt));
    response.cookies.set(buildRefreshCookie(result.token.rawToken));
    return response;
  } catch (err) {
    console.error("[auth/refresh]", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

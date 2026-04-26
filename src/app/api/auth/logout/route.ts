import { NextRequest, NextResponse } from "next/server";
import { revokeRefreshToken } from "@/server/services/refresh-tokens.service";
import {
  buildClearCookie,
  refreshCookieName,
  sessionCookieName,
} from "@/server/lib/auth-cookies";

export async function POST(req: NextRequest) {
  try {
    const rawToken = req.cookies.get(refreshCookieName)?.value;
    if (rawToken) {
      await revokeRefreshToken(rawToken);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(buildClearCookie(refreshCookieName));
    response.cookies.set(buildClearCookie(sessionCookieName));
    return response;
  } catch (err) {
    console.error("[auth/logout]", err);
    // Aunque falle el revoke en DB, limpiamos cookies igual — mejor cliente
    // queda con cookie inválida que con cookie válida sin poder revocar.
    const response = NextResponse.json({ ok: true });
    response.cookies.set(buildClearCookie(refreshCookieName));
    response.cookies.set(buildClearCookie(sessionCookieName));
    return response;
  }
}

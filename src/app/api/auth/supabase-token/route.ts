import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { SignJWT } from "jose";
import { requireAuth } from "@/server/lib/auth-guard";
import { env } from "@/lib/env";

/**
 * POST /api/auth/supabase-token
 *
 * Firma un JWT HS256 con el `SUPABASE_JWT_SECRET` (Legacy JWT Secret).
 * El JWT contiene:
 * - `sub: <userId>` — claim estándar; las policies RLS leen esto vía
 *   `auth.jwt() ->> 'sub'`. NO usamos `auth.uid()` porque devuelve UUID y
 *   nuestros userIds son CUIDs (string).
 * - `role: "authenticated"` — Supabase Realtime requiere este claim exacto
 *   para procesar el JWT como user autenticado (no `anon`).
 * - `aud: "authenticated"` — audience requerida por Supabase Auth helpers.
 * - `exp: now + 4h` — válido por 4 horas. El cliente refetchea al expirar
 *   o al re-montar el hook (refresh de página, navegación entre rutas).
 *
 * NOTA arquitectural: el plan original era RS256 + JWKS + Third-Party Auth
 * Provider en Supabase. Pero free tier no expone Generic OIDC en el dashboard,
 * y los 5 providers pre-built (Clerk/Firebase/Auth0/Cognito/WorkOS) tienen
 * sus URLs hardcodeadas. El legacy JWT secret sigue funcionando como
 * verificador en proyectos migrados al nuevo sistema de keys.
 *
 * Ver `docs/supabase-third-party-auth-setup.md` para el plan de migración
 * a RS256 cuando upgradeés a Pro o cuando Supabase abra Generic OIDC.
 */

const TOKEN_TTL_SECONDS = 60 * 60 * 4; // 4 horas

export async function POST() {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    const nowSeconds = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
      sub: auth.user.id,
      role: "authenticated",
      aud: "authenticated",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(nowSeconds)
      .setExpirationTime(nowSeconds + TOKEN_TTL_SECONDS)
      .sign(secret);

    return NextResponse.json({
      token,
      expiresAt: nowSeconds + TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "auth.supabase-token.POST" },
      extra: { userId: auth.user.id },
    });
    return NextResponse.json(
      { error: "Error firmando token", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

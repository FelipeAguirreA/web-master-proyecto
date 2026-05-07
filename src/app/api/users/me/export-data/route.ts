import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { requireAuth } from "@/server/lib/auth-guard";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { exportUserData } from "@/server/services/data-export.service";
import { createLogger, getRequestId } from "@/server/lib/logger";

// 1 export por hora por user. Generar un ZIP es costoso (lectura masiva +
// fetch del CV + compresión); rate limit estricto evita abuso por scripts
// y cubre el caso del propio user que clickea muchas veces.
const HOUR_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rl = await rateLimit(`export-data:${auth.user.id}`, 1, HOUR_MS);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const result = await exportUserData(auth.user.id);

    return new NextResponse(new Uint8Array(result.zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": String(result.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const log = createLogger({
      route: "users.me.export-data.GET",
      requestId: getRequestId(request.headers),
      userId: auth.user.id,
    });
    log.error({ err }, "export-data failed");
    Sentry.captureException(err, {
      tags: { route: "users.me.export-data" },
    });
    return NextResponse.json(
      { error: "Error generando la exportación", code: "EXPORT_ERROR" },
      { status: 500 },
    );
  }
}

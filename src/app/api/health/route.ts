import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/server/lib/db";
import { version } from "../../../../package.json";

export async function GET() {
  let dbStatus: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = "error";
    // Health check es el primer endpoint que debería notificar a Sentry si la
    // DB cae — load balancers / k8s probes / status pages dependen de esta
    // respuesta y un fallo silencioso significa que oncall se entera tarde.
    Sentry.captureMessage("Health check: DB ping failed", {
      level: "error",
      tags: { health: "db_down" },
      extra: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";
  const httpStatus = dbStatus === "ok" ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        version,
      },
    },
    { status: httpStatus },
  );
}

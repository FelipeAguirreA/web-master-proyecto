import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/db";
import { version } from "../../../../package.json";

export async function GET() {
  let dbStatus: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
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
    { status: httpStatus }
  );
}

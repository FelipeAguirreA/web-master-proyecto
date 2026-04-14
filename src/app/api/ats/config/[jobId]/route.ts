import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/lib/db";
import { requireAuth } from "@/server/lib/auth-guard";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await requireAuth("COMPANY");
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: "UNAUTHORIZED" },
      { status: auth.status },
    );
  }

  const { jobId } = await params;

  const company = await prisma.companyProfile.findUnique({
    where: { userId: auth.user.id },
  });
  if (!company) {
    return NextResponse.json(
      { error: "Empresa no encontrada", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const internship = await prisma.internship.findFirst({
    where: { id: jobId, companyId: company.id },
  });
  if (!internship) {
    return NextResponse.json(
      { error: "Práctica no encontrada o no autorizada", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const config = await prisma.aTSConfig.findUnique({
    where: { internshipId: jobId },
    include: { modules: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ config: config ?? null });
}

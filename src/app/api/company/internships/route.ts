import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: auth.user.id },
    });

    if (!profile) {
      return NextResponse.json({ internships: [], companyStatus: "PENDING" });
    }

    const internships = await prisma.internship.findMany({
      where: { companyId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      internships,
      companyStatus: profile.companyStatus,
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

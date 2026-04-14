import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const companies = await prisma.companyProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ companies });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

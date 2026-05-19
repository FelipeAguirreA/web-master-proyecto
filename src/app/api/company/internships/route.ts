import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";

export async function GET(request: NextRequest) {
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

    // ?includeDeleted=1 → devuelve también las soft-deleted (deletedAt!=null).
    // Lo usa el dashboard principal para mostrar la tab "Eliminadas" como
    // archivo histórico. Los demás consumidores (calendar, perfil, topbar
    // search) NO pasan el flag → solo ven activas + finalizadas.
    const includeDeleted =
      request.nextUrl.searchParams.get("includeDeleted") === "1";

    const internships = await prisma.internship.findMany({
      where: includeDeleted
        ? { companyId: profile.id }
        : { companyId: profile.id, deletedAt: null },
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

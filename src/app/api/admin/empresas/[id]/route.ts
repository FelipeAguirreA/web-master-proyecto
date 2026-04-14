import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";
import { sendCompanyStatusEmail } from "@/server/lib/mail";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const { action } = (await request.json()) as { action: string };

    const newStatus =
      action === "approve"
        ? "APPROVED"
        : action === "reject"
          ? "REJECTED"
          : null;

    if (!newStatus) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const updated = await prisma.companyProfile.update({
      where: { id },
      data: { companyStatus: newStatus },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    // Enviar email sin bloquear la respuesta
    sendCompanyStatusEmail(
      updated.user.email,
      updated.companyName,
      newStatus as "APPROVED" | "REJECTED",
    ).catch((err) =>
      console.error("[mail] sendCompanyStatusEmail error:", err),
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

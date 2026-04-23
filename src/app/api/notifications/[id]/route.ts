import { NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  const result = await prisma.notification.deleteMany({
    where: { id, userId: auth.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Notificación no encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}

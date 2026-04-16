import { NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";

export async function PATCH() {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await prisma.notification.updateMany({
    where: { userId: auth.user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}

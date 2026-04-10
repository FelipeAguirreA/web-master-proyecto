import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { role } = body as { role: string };

    if (role !== "STUDENT" && role !== "COMPANY") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { role },
    });

    if (role === "COMPANY") {
      const existing = await prisma.companyProfile.findUnique({
        where: { userId: auth.user.id },
      });
      if (!existing) {
        await prisma.companyProfile.create({
          data: { userId: auth.user.id, companyName: auth.session.user.name ?? "" },
        });
      }
    }

    if (role === "STUDENT") {
      const existing = await prisma.studentProfile.findUnique({
        where: { userId: auth.user.id },
      });
      if (!existing) {
        await prisma.studentProfile.create({
          data: { userId: auth.user.id },
        });
      }
    }

    const updated = await prisma.user.findUnique({
      where: { id: auth.user.id },
      include: { studentProfile: true, companyProfile: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

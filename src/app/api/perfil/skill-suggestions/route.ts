import { NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";
import { matchSkills } from "@/server/lib/skills-catalog";

export async function GET() {
  const auth = await requireAuth("STUDENT");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: auth.user.id },
    select: { cvText: true, skills: true },
  });

  if (!profile?.cvText) {
    return NextResponse.json({ suggestions: [], reason: "no_cv" });
  }

  const matched = matchSkills(profile.cvText);
  const existing = new Set(profile.skills);
  const suggestions = matched.filter((s) => !existing.has(s));

  return NextResponse.json({ suggestions });
}

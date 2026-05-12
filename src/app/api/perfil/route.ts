import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";
import { z } from "zod";

const studentProfileSchema = z
  .object({
    bio: z.string().max(2000).optional().nullable(),
    university: z.string().max(120).optional().nullable(),
    career: z.string().max(120).optional().nullable(),
    semester: z.number().int().min(1).max(20).optional().nullable(),
    skills: z.array(z.string().min(1).max(60)).max(60).optional(),
  })
  .optional();

const updateSchema = z.object({
  name: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  phone: z.string().max(20).optional(),
  studentProfile: studentProfileSchema,
});

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        code: "VALIDATION_ERROR",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        name: parsed.data.name.trim(),
        lastName: parsed.data.lastName.trim(),
        phone: parsed.data.phone?.trim() ?? null,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        phone: true,
        image: true,
        role: true,
      },
    });

    // Persistir studentProfile solo si es STUDENT y vino algo
    let studentProfile: {
      bio: string | null;
      university: string | null;
      career: string | null;
      semester: number | null;
      skills: string[];
      cvUrl: string | null;
    } | null = null;

    if (updated.role === "STUDENT" && parsed.data.studentProfile) {
      const spData = parsed.data.studentProfile;
      const cleaned: {
        bio?: string | null;
        university?: string | null;
        career?: string | null;
        semester?: number | null;
        skills?: string[];
      } = {};
      if (spData.bio !== undefined) cleaned.bio = spData.bio?.trim() || null;
      if (spData.university !== undefined)
        cleaned.university = spData.university?.trim() || null;
      if (spData.career !== undefined)
        cleaned.career = spData.career?.trim() || null;
      if (spData.semester !== undefined)
        cleaned.semester = spData.semester ?? null;
      if (spData.skills !== undefined)
        cleaned.skills = spData.skills.map((s) => s.trim()).filter(Boolean);

      const sp = await prisma.studentProfile.upsert({
        where: { userId: auth.user.id },
        update: cleaned,
        create: { userId: auth.user.id, ...cleaned },
        select: {
          bio: true,
          university: true,
          career: true,
          semester: true,
          skills: true,
          cvUrl: true,
        },
      });
      studentProfile = sp;
    } else if (updated.role === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({
        where: { userId: auth.user.id },
        select: {
          bio: true,
          university: true,
          career: true,
          semester: true,
          skills: true,
          cvUrl: true,
        },
      });
      studentProfile = sp;
    }

    return NextResponse.json({ ...updated, studentProfile });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "perfil.PUT" },
      extra: { userId: auth.user.id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        rut: true,
        role: true,
        image: true,
        companyProfile: {
          select: { companyName: true, companyStatus: true },
        },
        studentProfile: {
          select: {
            bio: true,
            university: true,
            career: true,
            semester: true,
            skills: true,
            cvUrl: true,
          },
        },
      },
    });

    return NextResponse.json(user);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "perfil.GET" },
      extra: { userId: auth.user.id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

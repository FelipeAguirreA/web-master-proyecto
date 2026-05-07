import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/lib/db";
import { companyRegisterSchema } from "@/server/validators";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { createLogger, getRequestId } from "@/server/lib/logger";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy-policy-version";

const HOUR_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const rl = await rateLimit(`empresa-register:${ip}`, 5, HOUR_MS);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const data = companyRegisterSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Este correo ya está registrado" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        lastName: data.lastName,
        phone: data.phone,
        role: "COMPANY",
        passwordHash,
        consentAcceptedAt: new Date(),
        consentVersion: PRIVACY_POLICY_VERSION,
        companyProfile: {
          create: {
            companyName: data.companyName,
            empresaRut: data.empresaRut,
            industry: data.industry ?? null,
            website: data.website ?? null,
            companyStatus: "PENDING",
          },
        },
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 },
      );
    }
    const log = createLogger({
      route: "auth.empresa.register.POST",
      requestId: getRequestId(request.headers),
    });
    log.error({ err: error }, "register failed");
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/server/lib/db";
import { sendPasswordResetEmail } from "@/server/lib/mail";
import { env } from "@/lib/env";

const schema = z.object({
  email: z.string().email(),
});

const EXPIRY_MS = 60 * 60 * 1000; // 1 hora

// Respuesta genérica — nunca revelar si el email existe o no
const GENERIC_OK = NextResponse.json({
  message: "Si el correo está registrado, recibirás instrucciones en breve.",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return GENERIC_OK;

    const { email } = parsed.data;

    // Solo usuarios COMPANY con contraseña propia (no OAuth)
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        role: "COMPANY",
        passwordHash: { not: null },
      },
      select: { id: true, name: true, email: true },
    });

    // No existe → respuesta genérica igual (anti-enumeration)
    if (!user) return GENERIC_OK;

    // Generar token crudo (64 hex chars) — se envía al usuario
    const rawToken = randomBytes(32).toString("hex");

    // Guardar hash SHA-256 en DB — nunca el token crudo
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExp: new Date(Date.now() + EXPIRY_MS),
      },
    });

    const resetUrl = `${env.NEXTAUTH_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    return GENERIC_OK;
  } catch (err) {
    console.error("[forgot-password]", err);
    // Respuesta genérica también en error — no filtrar información
    return GENERIC_OK;
  }
}

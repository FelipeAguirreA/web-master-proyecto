import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/server/lib/db";

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe incluir una mayúscula")
    .regex(/[a-z]/, "Debe incluir una minúscula")
    .regex(/[0-9]/, "Debe incluir un número")
    .regex(/[^A-Za-z0-9]/, "Debe incluir un símbolo"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { token, password } = parsed.data;

    // Hash del token recibido para comparar con el almacenado
    const hashedToken = createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        role: "COMPANY",
        resetTokenExp: { gt: new Date() }, // aún no expiró
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "El enlace es inválido o ya expiró. Solicitá uno nuevo." },
        { status: 400 },
      );
    }

    // Hashear nueva contraseña y limpiar token
    const passwordHash = await hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    return NextResponse.json({
      message: "Contraseña actualizada correctamente.",
    });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { prisma } from "@/server/lib/db";
import { uploadFile } from "@/server/lib/storage";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const HOUR_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 10/hora — simétrico con upload-cv (#J3). Cada llamada hace upload a
  // Supabase Storage + Prisma update + (para COMPANY) un segundo update sobre
  // CompanyProfile. Sin throttle, hot-loop posible y churn de imágenes en CDN.
  const rl = await rateLimit(`avatar:${auth.user.id}`, 10, HOUR_MS);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: "FormData inválido", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const file = formData.get("avatar") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Solo se permiten imágenes JPG, PNG o WebP",
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: "El archivo no puede superar los 2 MB",
          code: "FILE_TOO_LARGE",
        },
        { status: 400 },
      );
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    // El path usa auth.user.id directo (no originalName del cliente) → cero
    // superficie para path traversal. Cada user tiene UN avatar fijo por ext.
    const path = `avatars/${auth.user.id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const baseUrl = await uploadFile("avatars", path, buffer, file.type);
    const url = `${baseUrl}?v=${Date.now()}`;

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { image: url },
    });

    // Para empresas también sincronizar CompanyProfile.logo (usado en el
    // listado de prácticas).
    if (auth.user.role === "COMPANY") {
      await prisma.companyProfile.update({
        where: { userId: auth.user.id },
        data: { logo: url },
      });
    }

    return NextResponse.json({ url });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "perfil.avatar.POST" },
      extra: { userId: auth.user.id, role: auth.user.role },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

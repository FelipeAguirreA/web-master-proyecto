import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";
import { uploadFile } from "@/server/lib/storage";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = formData.get("avatar") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Solo se permiten imágenes JPG, PNG o WebP" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "El archivo no puede superar los 2 MB" },
      { status: 400 },
    );
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `avatars/${auth.user.id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const url = await uploadFile("avatars", path, buffer, file.type);

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { image: url },
  });

  // Para empresas también sincronizar CompanyProfile.logo (usado en el listado de prácticas)
  if (auth.user.role === "COMPANY") {
    await prisma.companyProfile.update({
      where: { userId: auth.user.id },
      data: { logo: url },
    });
  }

  return NextResponse.json({ url });
}

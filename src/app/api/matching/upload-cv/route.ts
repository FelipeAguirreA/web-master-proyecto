import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/server/lib/auth-guard";
import { processCV, deleteCV } from "@/server/services/matching.service";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const HOUR_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const auth = await requireAuth("STUDENT");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rl = await rateLimit(`upload-cv:${auth.user.id}`, 5, HOUR_MS);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  let fileSize = 0;

  try {
    const formData = await request.formData();
    const file = formData.get("cv") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "CV file required", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Only PDF and Word files are supported",
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5MB)", code: "FILE_TOO_LARGE" },
        { status: 400 },
      );
    }

    fileSize = file.size;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processCV(auth.user.id, buffer, file.type, file.name);

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "matching.upload-cv.POST" },
      extra: { userId: auth.user.id, fileSize },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const auth = await requireAuth("STUDENT");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 5/hora consistente con POST: el DELETE limpia cvUrl/cvText/embedding del
  // perfil (un upsert). Sin throttle, hot-loop posible. Mismo límite simétrico.
  const rl = await rateLimit(`delete-cv:${auth.user.id}`, 5, HOUR_MS);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    await deleteCV(auth.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "matching.upload-cv.DELETE" },
      extra: { userId: auth.user.id },
    });
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

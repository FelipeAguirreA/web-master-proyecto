import { NextRequest, NextResponse } from "next/server";
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
  try {
    const auth = await requireAuth("STUDENT");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rl = await rateLimit(`upload-cv:${auth.user.id}`, 5, HOUR_MS);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const formData = await request.formData();
    const file = formData.get("cv") as File | null;

    if (!file) {
      return NextResponse.json({ error: "CV file required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and Word files are supported" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processCV(auth.user.id, buffer, file.type, file.name);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await requireAuth("STUDENT");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await deleteCV(auth.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

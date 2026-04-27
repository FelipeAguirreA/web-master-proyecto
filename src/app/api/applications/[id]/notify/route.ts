import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/lib/auth-guard";
import {
  notifyAcceptedApplication,
  notifyRejectedApplication,
} from "@/server/services/applications.service";

const bodySchema = z.object({
  type: z.enum(["accepted", "rejected"]),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 },
      );
    }

    if (parsed.data.type === "accepted") {
      await notifyAcceptedApplication(id, auth.user.id);
    } else {
      await notifyRejectedApplication(id, auth.user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      // Ownership check fallido o app inexistente → 404 (no leak existence).
      // Cualquier otro error de dominio (status no coincide, etc.) → 400.
      const status =
        error.message === "Not found or not authorized" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import {
  notifyAcceptedApplication,
  notifyRejectedApplication,
} from "@/server/services/applications.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const { type } = (await request.json()) as {
      type: "accepted" | "rejected";
    };

    if (type === "accepted") {
      await notifyAcceptedApplication(id);
    } else if (type === "rejected") {
      await notifyRejectedApplication(id);
    } else {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

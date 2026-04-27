import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { ZodError } from "zod";
import { requireAuth } from "@/server/lib/auth-guard";
import {
  listInternships,
  createInternship,
} from "@/server/services/internships.service";
import {
  filterInternshipSchema,
  createInternshipSchema,
} from "@/server/validators";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";

const HOUR_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const filters = filterInternshipSchema.parse(params);
    const result = await listInternships(filters);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rl = await rateLimit(`internships-post:${auth.user.id}`, 10, HOUR_MS);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const data = createInternshipSchema.parse(body);
    const internship = await createInternship(auth.user.id, data);
    return NextResponse.json(internship, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }
    // #E3/#E4 — solo whitelisted errors propagan su mensaje al cliente.
    // Cualquier otro Error (Prisma, conexión, etc.) puede contener info de
    // schema o infra → Sentry + 500 genérico.
    if (error instanceof Error) {
      if (error.message === "Company not approved") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message === "Company profile required") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

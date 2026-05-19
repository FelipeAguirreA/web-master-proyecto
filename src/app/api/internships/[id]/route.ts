import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z, ZodError } from "zod";
import { requireAuth } from "@/server/lib/auth-guard";
import { getAuthSession } from "@/server/lib/auth";
import {
  getInternshipById,
  updateInternship,
  deleteInternship,
  APPLICATIONS_EXIST_MESSAGE,
} from "@/server/services/internships.service";
import { createInternshipSchema } from "@/server/validators";

type RouteParams = { params: Promise<{ id: string }> };

// #E2 — Zod estricto para el toggle isActive (antes era cast `as { isActive }`).
const patchSchema = z.object({ isActive: z.boolean() });

// #E3 — los services del módulo throwean este mensaje literal cuando el
// ownership check falla. Es la ÚNICA cadena segura para propagar al cliente:
// el resto puede contener info de Prisma/infra y va a Sentry + 500 genérico.
const NOT_FOUND_MESSAGE = "Not found or not authorized";

function notFoundOrInternal(error: unknown) {
  if (error instanceof Error && error.message === NOT_FOUND_MESSAGE) {
    return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
  }
  // 409 Conflict — edición bloqueada porque ya hay postulantes. El frontend
  // detecta este code para mostrar un mensaje específico y deshabilitar el form.
  if (error instanceof Error && error.message === APPLICATIONS_EXIST_MESSAGE) {
    return NextResponse.json(
      {
        error:
          "No podés editar esta práctica porque ya tiene postulantes. " +
          "Si necesitás cambios mayores, cerrá esta práctica y publicá una nueva.",
        code: "APPLICATIONS_EXIST",
      },
      { status: 409 },
    );
  }
  Sentry.captureException(error);
  return NextResponse.json(
    { error: "Error interno del servidor" },
    { status: 500 },
  );
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    // #E5 — el listado público filtra isActive=true + companyStatus=APPROVED.
    // Si la empresa cerró la práctica (isActive=false) y entra al ATS, el GET
    // por ID debe devolverla igual (es SU práctica). Pasamos el userId opcional
    // para activar la rama `ownedByMe` en el service.
    const session = await getAuthSession();
    const internship = await getInternshipById(id, session?.user?.id);
    if (!internship) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(internship);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const raw = await request.json().catch(() => null);
    const parsed = createInternshipSchema.partial().safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const internship = await updateInternship(id, auth.user.id, parsed.data);
    return NextResponse.json(internship);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 },
      );
    }
    return notFoundOrInternal(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const raw = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const internship = await updateInternship(id, auth.user.id, {
      isActive: parsed.data.isActive,
    });
    return NextResponse.json(internship);
  } catch (error) {
    return notFoundOrInternal(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth("COMPANY");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const result = await deleteInternship(id, auth.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return notFoundOrInternal(error);
  }
}

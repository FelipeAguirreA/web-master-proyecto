import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Add X-Request-ID to every response for Sentry tracing
  response.headers.set("x-request-id", crypto.randomUUID());

  const { pathname } = request.nextUrl;

  // API routes: auth is handled per-route, don't gate here
  if (pathname.startsWith("/api/")) {
    return response;
  }

  const token = await getToken({ req: request });

  // Unauthenticated: protect dashboard and registro
  if (!token) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/registro")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const role = token.role as string;
  const registrationCompleted =
    (token.registrationCompleted as boolean) ?? true;

  // STUDENT registration gate
  if (role === "STUDENT") {
    if (!registrationCompleted && !pathname.startsWith("/registro")) {
      return NextResponse.redirect(new URL("/registro", request.url));
    }
    if (registrationCompleted && pathname.startsWith("/registro")) {
      return NextResponse.redirect(
        new URL("/dashboard/estudiante", request.url),
      );
    }
  }

  // Dashboard role-based redirects
  if (pathname.startsWith("/dashboard")) {
    if (pathname.startsWith("/dashboard/empresa") && role !== "COMPANY") {
      return NextResponse.redirect(
        new URL("/dashboard/estudiante", request.url),
      );
    }
    if (pathname.startsWith("/dashboard/estudiante") && role !== "STUDENT") {
      return NextResponse.redirect(new URL("/dashboard/empresa", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/auth).*)",
  ],
};

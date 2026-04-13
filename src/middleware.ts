import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add X-Request-ID to every response for Sentry tracing
  response.headers.set("x-request-id", crypto.randomUUID());

  const { pathname } = request.nextUrl;

  // Only enforce auth on dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return response;
  }

  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = token.role as string;

  if (pathname.startsWith("/dashboard/empresa") && role !== "COMPANY") {
    return NextResponse.redirect(new URL("/dashboard/estudiante", request.url));
  }

  if (pathname.startsWith("/dashboard/estudiante") && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/dashboard/empresa", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/auth).*)",
  ],
};

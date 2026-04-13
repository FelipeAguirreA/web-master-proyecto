import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

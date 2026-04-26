import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildCspHeader, generateNonce } from "@/server/lib/csp";

export async function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCspHeader(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const withSecurity = (res: NextResponse) => {
    res.headers.set("x-request-id", crypto.randomUUID());
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  const passthrough = () =>
    withSecurity(NextResponse.next({ request: { headers: requestHeaders } }));

  const redirect = (path: string) =>
    withSecurity(NextResponse.redirect(new URL(path, request.url)));

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return passthrough();
  }

  const token = await getToken({ req: request });

  if (!token) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/registro")) {
      return redirect("/login");
    }
    return passthrough();
  }

  const role = token.role as string;
  const registrationCompleted =
    (token.registrationCompleted as boolean) ?? true;

  if (role === "STUDENT") {
    if (!registrationCompleted && !pathname.startsWith("/registro")) {
      return redirect("/registro");
    }
    if (registrationCompleted && pathname.startsWith("/registro")) {
      return redirect("/dashboard/estudiante");
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (pathname.startsWith("/dashboard/empresa") && role !== "COMPANY") {
      return redirect("/dashboard/estudiante");
    }
    if (pathname.startsWith("/dashboard/estudiante") && role !== "STUDENT") {
      return redirect("/dashboard/empresa");
    }
  }

  return passthrough();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/auth).*)",
  ],
};

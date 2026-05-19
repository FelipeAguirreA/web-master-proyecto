import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildCspHeader, generateNonce } from "@/server/lib/csp";

export async function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCspHeader(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js extrae el nonce del header CSP del REQUEST y lo inyecta en sus
  // inline scripts (hidratación, datos del SSR). Sin esta línea, los inline
  // scripts no llevan nonce y el CSP los bloquea — rompe el login con Google
  // (NextAuth dispara via inline script). Doc oficial:
  // https://nextjs.org/docs/app/guides/content-security-policy
  requestHeaders.set("Content-Security-Policy", csp);

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

  // Rutas API que una empresa SUSPENDED no puede usar para escribir/cambiar
  // estado. Solo bloqueamos métodos de mutación — los GET de su propio dashboard
  // siguen pasando (igual el dashboard mismo redirige a /empresa/suspendida).
  // El bloqueo es por token: la session trae companyStatus desde el JWT y se
  // refresca dentro del ACCESS_TOKEN_MAX_AGE (15 min). Aceptamos ese delay de
  // propagación post-suspensión a cambio de no pegarle a DB en cada request.
  const isMutatingMethod = ["POST", "PATCH", "PUT", "DELETE"].includes(
    request.method,
  );
  const isCompanyMutationRoute =
    pathname.startsWith("/api/internships") ||
    pathname.startsWith("/api/applications") ||
    pathname.startsWith("/api/chat");

  if (pathname.startsWith("/api/")) {
    if (isMutatingMethod && isCompanyMutationRoute) {
      const apiToken = await getToken({ req: request });
      if (
        apiToken &&
        apiToken.role === "COMPANY" &&
        apiToken.companyStatus === "SUSPENDED"
      ) {
        return withSecurity(
          NextResponse.json(
            { error: "Cuenta suspendida — contactá al administrador" },
            { status: 403 },
          ),
        );
      }
    }
    return passthrough();
  }

  const token = await getToken({ req: request });

  if (!token) {
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/registro") ||
      pathname.startsWith("/empresa/suspendida")
    ) {
      return redirect("/login");
    }
    return passthrough();
  }

  const role = token.role as string;
  const registrationCompleted =
    (token.registrationCompleted as boolean) ?? true;
  const companyStatus = token.companyStatus as string | undefined;

  // Empresa suspendida: solo puede ver /empresa/suspendida + cerrar sesión.
  // Cualquier intento de entrar a dashboard/registro la rebota.
  if (role === "COMPANY" && companyStatus === "SUSPENDED") {
    if (pathname.startsWith("/empresa/suspendida")) {
      return passthrough();
    }
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/registro")) {
      return redirect("/empresa/suspendida");
    }
  }

  // Empresa no-suspendida no debería ver la pantalla de suspensión.
  if (
    role === "COMPANY" &&
    companyStatus !== "SUSPENDED" &&
    pathname.startsWith("/empresa/suspendida")
  ) {
    return redirect("/dashboard/empresa");
  }

  // Estudiante o cualquier rol ≠ COMPANY no debería ver la pantalla.
  if (role !== "COMPANY" && pathname.startsWith("/empresa/suspendida")) {
    return redirect("/dashboard/estudiante");
  }

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

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────
// next/server: NextResponse real necesita el runtime de Next. Lo reemplazamos
// por un doble que captura qué se devolvió (next / redirect / json) y expone un
// `headers` real (Headers global) para que `withSecurity` pueda setear CSP +
// x-request-id como en producción.
vi.mock("next/server", () => {
  const make = (extra: Record<string, unknown>) => ({
    ...extra,
    headers: new Headers(),
  });
  return {
    NextResponse: {
      next: vi.fn((init?: unknown) => make({ kind: "next", init })),
      redirect: vi.fn((url: URL) =>
        make({ kind: "redirect", url: url.toString() }),
      ),
      json: vi.fn((body: unknown, init?: { status?: number }) =>
        make({ kind: "json", body, status: init?.status }),
      ),
    },
  };
});

vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }));

import { getToken } from "next-auth/jwt";
import { proxy } from "@/proxy";

// ── Helpers ────────────────────────────────────────────────────────────────
type ProxyResult = {
  kind: "next" | "redirect" | "json";
  url?: string;
  status?: number;
  body?: { error?: string };
  headers: Headers;
};

function makeReq({
  pathname = "/",
  method = "GET",
  headers = {},
}: {
  pathname?: string;
  method?: string;
  headers?: Record<string, string>;
} = {}): NextRequest {
  return {
    nextUrl: { pathname },
    url: `https://practix.app${pathname}`,
    method,
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

function setToken(token: Record<string, unknown> | null) {
  vi.mocked(getToken).mockResolvedValue(token as never);
}

async function run(req: NextRequest): Promise<ProxyResult> {
  return (await proxy(req)) as unknown as ProxyResult;
}

const STUDENT_NO_REG = { role: "STUDENT", registrationCompleted: false };
const STUDENT_REG = { role: "STUDENT", registrationCompleted: true };
const COMPANY_SUSPENDED = { role: "COMPANY", companyStatus: "SUSPENDED" };
const COMPANY_OK = { role: "COMPANY", companyStatus: "APPROVED" };

beforeEach(() => {
  vi.clearAllMocks();
});

// ── API routes ───────────────────────────────────────────────────────────────
describe("proxy — rutas /api", () => {
  it("deja pasar un GET de API sin tocar el token", async () => {
    setToken(null);
    const res = await run(makeReq({ pathname: "/api/users", method: "GET" }));
    expect(res.kind).toBe("next");
  });

  it("bloquea con 403 una mutación de empresa SUSPENDED", async () => {
    setToken(COMPANY_SUSPENDED);
    const res = await run(
      makeReq({ pathname: "/api/internships", method: "POST" }),
    );
    expect(res.kind).toBe("json");
    expect(res.status).toBe(403);
    expect(res.body?.error).toMatch(/suspendida/i);
  });

  it("deja pasar la mutación si la empresa NO está suspendida", async () => {
    setToken(COMPANY_OK);
    const res = await run(
      makeReq({ pathname: "/api/applications", method: "PATCH" }),
    );
    expect(res.kind).toBe("next");
  });

  it("deja pasar una mutación en ruta API que no es de empresa", async () => {
    setToken(COMPANY_SUSPENDED);
    const res = await run(makeReq({ pathname: "/api/users", method: "POST" }));
    expect(res.kind).toBe("next");
  });

  it("deja pasar una mutación de chat si no hay token", async () => {
    setToken(null);
    const res = await run(makeReq({ pathname: "/api/chat", method: "POST" }));
    expect(res.kind).toBe("next");
  });
});

// ── Sin sesión ─────────────────────────────────────────────────────────────
describe("proxy — sin token", () => {
  it("redirige /dashboard a /login", async () => {
    setToken(null);
    const res = await run(makeReq({ pathname: "/dashboard/estudiante" }));
    expect(res.kind).toBe("redirect");
    expect(res.url).toBe("https://practix.app/login");
  });

  it("redirige /registro a /login", async () => {
    setToken(null);
    const res = await run(makeReq({ pathname: "/registro" }));
    expect(res.url).toBe("https://practix.app/login");
  });

  it("deja pasar la landing pública", async () => {
    setToken(null);
    const res = await run(makeReq({ pathname: "/" }));
    expect(res.kind).toBe("next");
  });

  it("deja pasar /privacidad sin sesión", async () => {
    setToken(null);
    const res = await run(makeReq({ pathname: "/privacidad" }));
    expect(res.kind).toBe("next");
  });
});

// ── Empresa suspendida ───────────────────────────────────────────────────────
describe("proxy — empresa SUSPENDED", () => {
  it("deja ver la pantalla de suspensión", async () => {
    setToken(COMPANY_SUSPENDED);
    const res = await run(makeReq({ pathname: "/empresa/suspendida" }));
    expect(res.kind).toBe("next");
  });

  it("rebota /dashboard a /empresa/suspendida", async () => {
    setToken(COMPANY_SUSPENDED);
    const res = await run(makeReq({ pathname: "/dashboard/empresa" }));
    expect(res.url).toBe("https://practix.app/empresa/suspendida");
  });

  it("rebota /registro a /empresa/suspendida", async () => {
    setToken(COMPANY_SUSPENDED);
    const res = await run(makeReq({ pathname: "/registro" }));
    expect(res.url).toBe("https://practix.app/empresa/suspendida");
  });

  it("puede leer /terminos aunque esté suspendida", async () => {
    setToken(COMPANY_SUSPENDED);
    const res = await run(makeReq({ pathname: "/terminos" }));
    expect(res.kind).toBe("next");
  });
});

// ── Pantalla de suspensión para quien no corresponde ─────────────────────────
describe("proxy — /empresa/suspendida sin estar suspendido", () => {
  it("empresa aprobada va a su dashboard", async () => {
    setToken(COMPANY_OK);
    const res = await run(makeReq({ pathname: "/empresa/suspendida" }));
    expect(res.url).toBe("https://practix.app/dashboard/empresa");
  });

  it("estudiante va a su dashboard", async () => {
    setToken(STUDENT_REG);
    const res = await run(makeReq({ pathname: "/empresa/suspendida" }));
    expect(res.url).toBe("https://practix.app/dashboard/estudiante");
  });
});

// ── Estudiante sin registro completo ─────────────────────────────────────────
describe("proxy — estudiante con registro incompleto", () => {
  it("rebota cualquier ruta protegida a /registro", async () => {
    setToken(STUDENT_NO_REG);
    const res = await run(makeReq({ pathname: "/dashboard/estudiante" }));
    expect(res.url).toBe("https://practix.app/registro");
  });

  it("deja pasar /registro (la pantalla que debe completar)", async () => {
    setToken(STUDENT_NO_REG);
    const res = await run(makeReq({ pathname: "/registro" }));
    expect(res.kind).toBe("next");
  });

  // ── Regresión: el bug que arreglamos ──────────────────────────────────────
  // Antes el middleware rebotaba /privacidad y /terminos a /registro, así que
  // el estudiante no podía LEER lo que tenía que ACEPTAR (consentimiento
  // informado, Ley 21.719). Estos dos tests blindan el fix.
  it("deja LEER /privacidad aunque no haya completado el registro", async () => {
    setToken(STUDENT_NO_REG);
    const res = await run(makeReq({ pathname: "/privacidad" }));
    expect(res.kind).toBe("next");
  });

  it("deja LEER /terminos aunque no haya completado el registro", async () => {
    setToken(STUDENT_NO_REG);
    const res = await run(makeReq({ pathname: "/terminos" }));
    expect(res.kind).toBe("next");
  });
});

// ── Estudiante con registro completo ─────────────────────────────────────────
describe("proxy — estudiante con registro completo", () => {
  it("rebota /registro a su dashboard", async () => {
    setToken(STUDENT_REG);
    const res = await run(makeReq({ pathname: "/registro" }));
    expect(res.url).toBe("https://practix.app/dashboard/estudiante");
  });

  it("deja pasar su propio dashboard", async () => {
    setToken(STUDENT_REG);
    const res = await run(makeReq({ pathname: "/dashboard/estudiante" }));
    expect(res.kind).toBe("next");
  });

  it("rebota el dashboard de empresa a su dashboard", async () => {
    setToken(STUDENT_REG);
    const res = await run(makeReq({ pathname: "/dashboard/empresa" }));
    expect(res.url).toBe("https://practix.app/dashboard/estudiante");
  });
});

// ── Cruce de roles en dashboard ──────────────────────────────────────────────
describe("proxy — segregación de dashboards por rol", () => {
  it("empresa no puede entrar al dashboard de estudiante", async () => {
    setToken(COMPANY_OK);
    const res = await run(makeReq({ pathname: "/dashboard/estudiante" }));
    expect(res.url).toBe("https://practix.app/dashboard/empresa");
  });

  it("empresa entra a su propio dashboard", async () => {
    setToken(COMPANY_OK);
    const res = await run(makeReq({ pathname: "/dashboard/empresa" }));
    expect(res.kind).toBe("next");
  });
});

// ── Headers de seguridad ─────────────────────────────────────────────────────
describe("proxy — headers de seguridad", () => {
  it("toda response passthrough lleva CSP + x-request-id", async () => {
    setToken(STUDENT_REG);
    const res = await run(makeReq({ pathname: "/dashboard/estudiante" }));
    expect(res.headers.get("content-security-policy")).toBeTruthy();
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("toda response de redirect lleva CSP + x-request-id", async () => {
    setToken(null);
    const res = await run(makeReq({ pathname: "/dashboard" }));
    expect(res.headers.get("content-security-policy")).toBeTruthy();
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});

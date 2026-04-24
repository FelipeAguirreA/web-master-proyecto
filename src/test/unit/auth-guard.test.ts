import { describe, it, expect, beforeEach, vi } from "vitest";

// auth-guard.ts importa `getAuthSession` y `ADMIN_EMAIL` desde @/lib/auth.
// Mockeamos el módulo entero: getAuthSession como spy, ADMIN_EMAIL como constante
// aislada del valor real de `src/lib/constants.ts` para que el test no dependa
// del email real del admin.
// vi.hoisted() es necesario porque vi.mock se eleva al top del archivo antes
// de cualquier declaración normal.
const { ADMIN_EMAIL_MOCK } = vi.hoisted(() => ({
  ADMIN_EMAIL_MOCK: "admin@practix.test",
}));

vi.mock("@/lib/auth", () => ({
  getAuthSession: vi.fn(),
  ADMIN_EMAIL: ADMIN_EMAIL_MOCK,
}));

import { requireAuth, requireAdmin } from "@/server/lib/auth-guard";
import { getAuthSession } from "@/lib/auth";

const mockGetAuthSession = vi.mocked(getAuthSession);

// ─── Fixtures ───────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const STUDENT_EMAIL = "student@test.com";

type TestSession = {
  user: {
    id: string;
    role: string;
    email: string | null | undefined;
    name?: string;
  };
  expires: string;
};

const buildSession = (
  overrides: Partial<TestSession["user"]> = {},
): TestSession => ({
  user: {
    id: USER_ID,
    role: "STUDENT",
    email: STUDENT_EMAIL,
    name: "Test User",
    ...overrides,
  },
  expires: "2026-12-31T00:00:00.000Z",
});

beforeEach(() => {
  mockGetAuthSession.mockReset();
});

// ─── requireAuth ────────────────────────────────────────────────────────────

describe("requireAuth", () => {
  it("retorna 401 Unauthorized cuando no hay sesión", async () => {
    mockGetAuthSession.mockResolvedValue(null);

    const result = await requireAuth();

    expect(result).toEqual({ error: "Unauthorized", status: 401 });
  });

  it("retorna 401 Unauthorized cuando no hay sesión aunque se pida un rol", async () => {
    mockGetAuthSession.mockResolvedValue(null);

    const result = await requireAuth("STUDENT");

    expect(result).toEqual({ error: "Unauthorized", status: 401 });
  });

  it("retorna éxito con session y user mapeado cuando hay sesión y no se pide rol", async () => {
    const session = buildSession({ role: "STUDENT" });
    mockGetAuthSession.mockResolvedValue(session as never);

    const result = await requireAuth();

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.session).toBe(session);
    expect(result.user).toEqual({
      id: USER_ID,
      role: "STUDENT",
      email: STUDENT_EMAIL,
    });
  });

  it("retorna éxito cuando el rol de la sesión coincide con requiredRole=STUDENT", async () => {
    const session = buildSession({ role: "STUDENT" });
    mockGetAuthSession.mockResolvedValue(session as never);

    const result = await requireAuth("STUDENT");

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.user.role).toBe("STUDENT");
  });

  it("retorna éxito cuando el rol de la sesión coincide con requiredRole=COMPANY", async () => {
    const session = buildSession({
      role: "COMPANY",
      email: "company@test.com",
    });
    mockGetAuthSession.mockResolvedValue(session as never);

    const result = await requireAuth("COMPANY");

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.user.role).toBe("COMPANY");
    expect(result.user.email).toBe("company@test.com");
  });

  it("retorna 403 Forbidden cuando el rol de la sesión no coincide con requiredRole", async () => {
    mockGetAuthSession.mockResolvedValue(
      buildSession({ role: "STUDENT" }) as never,
    );

    const result = await requireAuth("COMPANY");

    expect(result).toEqual({ error: "Forbidden", status: 403 });
  });

  it("no chequea rol cuando requiredRole es undefined (acceso abierto a cualquier rol autenticado)", async () => {
    mockGetAuthSession.mockResolvedValue(
      buildSession({ role: "COMPANY", email: "empresa@test.com" }) as never,
    );

    const result = await requireAuth();

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.user.role).toBe("COMPANY");
  });

  it("no lanza excepciones — siempre retorna un objeto discriminable", async () => {
    mockGetAuthSession.mockResolvedValue(null);

    await expect(requireAuth("STUDENT")).resolves.toBeDefined();
  });

  it("propaga email null o undefined sin romper", async () => {
    mockGetAuthSession.mockResolvedValue(
      buildSession({ email: null }) as never,
    );

    const result = await requireAuth();

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.user.email).toBeNull();
  });
});

// ─── requireAdmin ───────────────────────────────────────────────────────────

describe("requireAdmin", () => {
  it("retorna 401 Unauthorized cuando no hay sesión", async () => {
    mockGetAuthSession.mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result).toEqual({ error: "Unauthorized", status: 401 });
  });

  it("retorna éxito cuando el email de la sesión coincide con ADMIN_EMAIL", async () => {
    const session = buildSession({
      email: ADMIN_EMAIL_MOCK,
      role: "STUDENT",
    });
    mockGetAuthSession.mockResolvedValue(session as never);

    const result = await requireAdmin();

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.session).toBe(session);
    expect(result.user.email).toBe(ADMIN_EMAIL_MOCK);
  });

  it("retorna 403 Forbidden cuando el email de la sesión no coincide con ADMIN_EMAIL", async () => {
    mockGetAuthSession.mockResolvedValue(
      buildSession({ email: "otro@test.com" }) as never,
    );

    const result = await requireAdmin();

    expect(result).toEqual({ error: "Forbidden", status: 403 });
  });

  it("retorna 403 Forbidden cuando el email de la sesión es null", async () => {
    mockGetAuthSession.mockResolvedValue(
      buildSession({ email: null }) as never,
    );

    const result = await requireAdmin();

    expect(result).toEqual({ error: "Forbidden", status: 403 });
  });

  it("retorna 403 Forbidden cuando el email de la sesión es undefined", async () => {
    mockGetAuthSession.mockResolvedValue(
      buildSession({ email: undefined }) as never,
    );

    const result = await requireAdmin();

    expect(result).toEqual({ error: "Forbidden", status: 403 });
  });

  it("admin identificado por email, no por role (usuario con role=STUDENT puede ser admin)", async () => {
    mockGetAuthSession.mockResolvedValue(
      buildSession({ email: ADMIN_EMAIL_MOCK, role: "STUDENT" }) as never,
    );

    const result = await requireAdmin();

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.user.role).toBe("STUDENT");
    expect(result.user.email).toBe(ADMIN_EMAIL_MOCK);
  });

  it("no lanza excepciones — siempre retorna un objeto discriminable", async () => {
    mockGetAuthSession.mockResolvedValue(null);

    await expect(requireAdmin()).resolves.toBeDefined();
  });
});

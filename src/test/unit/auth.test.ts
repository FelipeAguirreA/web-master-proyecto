import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("bcryptjs", () => {
  const compare = vi.fn();
  return {
    default: { compare },
    compare,
  };
});

vi.mock("next-auth", async () => {
  const actual = await vi.importActual<typeof import("next-auth")>("next-auth");
  return {
    ...actual,
    getServerSession: vi.fn(),
  };
});

const {
  mockRateLimit,
  mockIssueRefresh,
  mockCookieSet,
  mockSentryCaptureMessage,
  mockSentryAddBreadcrumb,
} = vi.hoisted(() => ({
  mockRateLimit: vi.fn(),
  mockIssueRefresh: vi.fn(),
  mockCookieSet: vi.fn(),
  mockSentryCaptureMessage: vi.fn(),
  mockSentryAddBreadcrumb: vi.fn(),
}));

vi.mock("@/server/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/server/services/refresh-tokens.service", () => ({
  issueRefreshToken: mockIssueRefresh,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: mockCookieSet })),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mockSentryCaptureMessage,
  addBreadcrumb: mockSentryAddBreadcrumb,
}));

import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions, getAuthSession } from "@/lib/auth";

function expectedHash(email: string): string {
  return createHash("sha256")
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 8);
}

type AuthorizeReq = { headers?: Record<string, string> | Headers };
type AuthorizeFn = (
  credentials: Record<string, string> | undefined,
  req?: AuthorizeReq,
) => Promise<unknown>;

type MaybeCredentialsProvider = {
  id?: string;
  authorize?: AuthorizeFn;
  options?: {
    authorize?: AuthorizeFn;
  };
};

function getCredentialsAuthorize() {
  const provider = (
    authOptions.providers as Array<MaybeCredentialsProvider & { type?: string }>
  ).find((p) => p.type === "credentials");
  // NextAuth envuelve `authorize` en el provider exterior; el original vive en options.
  return provider?.options?.authorize ?? provider?.authorize;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(prismaMock).forEach((model) => {
    if (model && typeof model === "object") {
      Object.values(model).forEach((fn) => {
        if (typeof fn === "function" && "mockReset" in fn) {
          (fn as ReturnType<typeof vi.fn>).mockReset();
        }
      });
    }
  });
  // Default: rate limit OK — los tests que validan throttling lo overridean.
  mockRateLimit.mockResolvedValue({
    success: true,
    remaining: 4,
    resetAt: Date.now() + 60_000,
  });
  mockIssueRefresh.mockReset();
  mockCookieSet.mockReset();
  mockSentryCaptureMessage.mockReset();
  mockSentryAddBreadcrumb.mockReset();
});

describe("CredentialsProvider — authorize", () => {
  it("retorna null si no hay credentials", async () => {
    const authorize = getCredentialsAuthorize();
    expect(authorize).toBeDefined();

    const result = await authorize!(undefined);
    expect(result).toBeNull();
  });

  it("retorna null si falta email", async () => {
    const authorize = getCredentialsAuthorize();
    const result = await authorize!({ email: "", password: "x" });
    expect(result).toBeNull();
  });

  it("retorna null si falta password", async () => {
    const authorize = getCredentialsAuthorize();
    const result = await authorize!({ email: "a@b.com", password: "" });
    expect(result).toBeNull();
  });

  it("retorna null si el user no existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    const result = await authorize!({
      email: "ghost@example.com",
      password: "x",
    });
    expect(result).toBeNull();
  });

  it("retorna null si el user no es COMPANY", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      role: "STUDENT",
      passwordHash: "hash",
      email: "a@b.com",
      name: "A",
      image: null,
    });
    const authorize = getCredentialsAuthorize();

    const result = await authorize!({ email: "a@b.com", password: "x" });
    expect(result).toBeNull();
  });

  it("retorna null si el user no tiene passwordHash", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      role: "COMPANY",
      passwordHash: null,
      email: "a@b.com",
      name: "A",
      image: null,
    });
    const authorize = getCredentialsAuthorize();

    const result = await authorize!({ email: "a@b.com", password: "x" });
    expect(result).toBeNull();
  });

  it("retorna null si el password no coincide", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      role: "COMPANY",
      passwordHash: "hash",
      email: "a@b.com",
      name: "A",
      image: null,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const authorize = getCredentialsAuthorize();

    const result = await authorize!({ email: "a@b.com", password: "wrong" });
    expect(result).toBeNull();
  });

  it("retorna el user cuando email + password son válidos", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      role: "COMPANY",
      passwordHash: "hash",
      email: "empresa@example.com",
      name: "Empresa",
      image: "https://img.example.com/a.png",
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const authorize = getCredentialsAuthorize();

    const result = await authorize!({
      email: "empresa@example.com",
      password: "Test1234!",
    });

    expect(result).toEqual({
      id: "u-1",
      email: "empresa@example.com",
      name: "Empresa",
      image: "https://img.example.com/a.png",
    });
  });
});

describe("CredentialsProvider — rate limit en login", () => {
  it("retorna null y NO llama a Prisma cuando se excede el límite", async () => {
    mockRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const authorize = getCredentialsAuthorize();

    const result = await authorize!(
      { email: "victim@example.com", password: "Test1234!" },
      { headers: new Headers({ "x-forwarded-for": "1.2.3.4" }) },
    );

    expect(result).toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("login rate limit hit"),
    );
    warnSpy.mockRestore();
  });

  it("compone el identifier como `login:ip:email-lowercased` con Headers", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      role: "COMPANY",
      passwordHash: "hash",
      email: "FOO@BAR.COM",
      name: "F",
      image: null,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const authorize = getCredentialsAuthorize();

    await authorize!(
      { email: "FOO@BAR.COM", password: "Test1234!" },
      { headers: new Headers({ "x-forwarded-for": "9.9.9.9" }) },
    );

    expect(mockRateLimit).toHaveBeenCalledWith(
      "login:9.9.9.9:foo@bar.com",
      5,
      5 * 60 * 1000,
    );
  });

  it("compone el identifier desde headers como plain object", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    await authorize!(
      { email: "user@x.com", password: "x" },
      { headers: { "x-forwarded-for": "10.0.0.1" } },
    );

    expect(mockRateLimit).toHaveBeenCalledWith(
      "login:10.0.0.1:user@x.com",
      5,
      5 * 60 * 1000,
    );
  });

  it("acepta plain object con header capitalizado `X-Forwarded-For`", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    await authorize!(
      { email: "user@x.com", password: "x" },
      { headers: { "X-Forwarded-For": "8.8.8.8" } },
    );

    expect(mockRateLimit).toHaveBeenCalledWith(
      "login:8.8.8.8:user@x.com",
      5,
      5 * 60 * 1000,
    );
  });

  it("usa solo el primer IP cuando x-forwarded-for viene encadenado", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    await authorize!(
      { email: "u@x.com", password: "x" },
      {
        headers: new Headers({
          "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3",
        }),
      },
    );

    expect(mockRateLimit).toHaveBeenCalledWith(
      "login:1.1.1.1:u@x.com",
      5,
      5 * 60 * 1000,
    );
  });

  it("usa `unknown` como IP cuando req es undefined", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    await authorize!({ email: "u@x.com", password: "x" });

    expect(mockRateLimit).toHaveBeenCalledWith(
      "login:unknown:u@x.com",
      5,
      5 * 60 * 1000,
    );
  });

  it("usa `unknown` cuando req existe pero sin headers", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    await authorize!({ email: "u@x.com", password: "x" }, {});

    expect(mockRateLimit).toHaveBeenCalledWith(
      "login:unknown:u@x.com",
      5,
      5 * 60 * 1000,
    );
  });

  it("usa `unknown` cuando Headers no contiene x-forwarded-for", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    await authorize!(
      { email: "u@x.com", password: "x" },
      { headers: new Headers() },
    );

    expect(mockRateLimit).toHaveBeenCalledWith(
      "login:unknown:u@x.com",
      5,
      5 * 60 * 1000,
    );
  });

  it("usa `unknown` cuando plain headers no contiene x-forwarded-for", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    await authorize!(
      { email: "u@x.com", password: "x" },
      { headers: { "user-agent": "test-agent" } },
    );

    expect(mockRateLimit).toHaveBeenCalledWith(
      "login:unknown:u@x.com",
      5,
      5 * 60 * 1000,
    );
  });

  it("NO invoca rateLimit si faltan credentials (short-circuit antes)", async () => {
    const authorize = getCredentialsAuthorize();

    await authorize!(undefined);
    await authorize!({ email: "", password: "x" });
    await authorize!({ email: "a@b.com", password: "" });

    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("cuando rate limit pasa, continúa y retorna user válido en happy path", async () => {
    mockRateLimit.mockResolvedValueOnce({
      success: true,
      remaining: 3,
      resetAt: Date.now() + 60_000,
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-7",
      role: "COMPANY",
      passwordHash: "hash",
      email: "ok@x.com",
      name: "OK",
      image: null,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const authorize = getCredentialsAuthorize();

    const result = await authorize!(
      { email: "ok@x.com", password: "Test1234!" },
      { headers: new Headers({ "x-forwarded-for": "5.5.5.5" }) },
    );

    expect(result).toEqual({
      id: "u-7",
      email: "ok@x.com",
      name: "OK",
      image: null,
    });
    expect(mockRateLimit).toHaveBeenCalledTimes(1);
  });
});

describe("CredentialsProvider — Sentry telemetría de login attempts", () => {
  it("failed login con missing_credentials cuando no hay credentials", async () => {
    const authorize = getCredentialsAuthorize();
    await authorize!(undefined);

    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Failed login attempt",
      expect.objectContaining({
        level: "warning",
        tags: expect.objectContaining({
          auth: "failed_login",
          reason: "missing_credentials",
        }),
        extra: expect.objectContaining({ email_hash: undefined }),
      }),
    );
  });

  it("missing_credentials con email pero sin password incluye email_hash", async () => {
    const authorize = getCredentialsAuthorize();
    await authorize!({ email: "user@x.com", password: "" });

    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Failed login attempt",
      expect.objectContaining({
        tags: expect.objectContaining({ reason: "missing_credentials" }),
        extra: expect.objectContaining({
          email_hash: expectedHash("user@x.com"),
        }),
      }),
    );
  });

  it("rate_limited captura con email_hash + ip cuando excede el límite", async () => {
    mockRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const authorize = getCredentialsAuthorize();

    await authorize!(
      { email: "victim@x.com", password: "x" },
      { headers: new Headers({ "x-forwarded-for": "1.2.3.4" }) },
    );

    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Failed login attempt",
      expect.objectContaining({
        level: "warning",
        tags: expect.objectContaining({
          auth: "failed_login",
          reason: "rate_limited",
        }),
        extra: { email_hash: expectedHash("victim@x.com"), ip: "1.2.3.4" },
      }),
    );
  });

  it("user_not_found_or_not_company cuando el user no existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    await authorize!({ email: "ghost@x.com", password: "x" });

    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Failed login attempt",
      expect.objectContaining({
        tags: expect.objectContaining({
          reason: "user_not_found_or_not_company",
        }),
        extra: expect.objectContaining({
          email_hash: expectedHash("ghost@x.com"),
        }),
      }),
    );
  });

  it("user_not_found_or_not_company cuando role no es COMPANY", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      role: "STUDENT",
      passwordHash: "hash",
      email: "student@x.com",
      name: null,
      image: null,
    });
    const authorize = getCredentialsAuthorize();

    await authorize!({ email: "student@x.com", password: "x" });

    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Failed login attempt",
      expect.objectContaining({
        tags: expect.objectContaining({
          reason: "user_not_found_or_not_company",
        }),
      }),
    );
  });

  it("invalid_password cuando bcrypt no matchea", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      role: "COMPANY",
      passwordHash: "hash",
      email: "ok@x.com",
      name: null,
      image: null,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const authorize = getCredentialsAuthorize();

    await authorize!({ email: "ok@x.com", password: "wrong" });

    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Failed login attempt",
      expect.objectContaining({
        tags: expect.objectContaining({ reason: "invalid_password" }),
      }),
    );
  });

  it("login OK NO llama captureMessage y deja breadcrumb info", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      role: "COMPANY",
      passwordHash: "hash",
      email: "ok@x.com",
      name: "OK",
      image: null,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const authorize = getCredentialsAuthorize();

    await authorize!(
      { email: "ok@x.com", password: "Test1234!" },
      { headers: new Headers({ "x-forwarded-for": "5.5.5.5" }) },
    );

    expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
    expect(mockSentryAddBreadcrumb).toHaveBeenCalledWith({
      category: "auth.login",
      level: "info",
      message: "Successful credentials login",
      data: { email_hash: expectedHash("ok@x.com"), ip: "5.5.5.5" },
    });
  });

  it("email_hash es case-insensitive (lowercase antes de hashear)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    await authorize!({ email: "FOO@BAR.COM", password: "x" });

    const call = mockSentryCaptureMessage.mock.calls[0];
    const extra = (call?.[1] as { extra?: { email_hash?: string } })?.extra;
    expect(extra?.email_hash).toBe(expectedHash("foo@bar.com"));
  });

  it("captureMessage NO incluye plaintext email ni password en extras", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const authorize = getCredentialsAuthorize();

    await authorize!({ email: "leak@x.com", password: "s3cret" });

    const call = mockSentryCaptureMessage.mock.calls[0];
    const serialized = JSON.stringify(call);
    expect(serialized).not.toContain("leak@x.com");
    expect(serialized).not.toContain("s3cret");
  });
});

describe("signIn callback", () => {
  it("permite el sign-in con CredentialsProvider sin tocar la DB", async () => {
    const result = await authOptions.callbacks!.signIn!({
      user: { id: "u-1", email: "a@b.com" } as never,
      account: { provider: "empresa-credentials" } as never,
      profile: undefined,
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(true);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("permite el sign-in cuando el usuario de Google ya existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      email: "a@b.com",
    });

    const result = await authOptions.callbacks!.signIn!({
      user: { email: "a@b.com", name: "Test", image: null } as never,
      account: { provider: "google", providerAccountId: "g-1" } as never,
      profile: undefined,
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(true);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("crea usuario STUDENT + studentProfile cuando el user de Google no existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "u-new" });
    prismaMock.studentProfile.create.mockResolvedValue({ id: "sp-new" });

    const result = await authOptions.callbacks!.signIn!({
      user: { email: "nuevo@example.com", name: "Nuevo", image: null } as never,
      account: { provider: "google", providerAccountId: "g-9" } as never,
      profile: undefined,
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(true);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "nuevo@example.com",
        role: "STUDENT",
        provider: "google",
        providerId: "g-9",
      }),
    });
    expect(prismaMock.studentProfile.create).toHaveBeenCalledWith({
      data: { userId: "u-new" },
    });
  });

  it("retorna false si Prisma falla", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("DB down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await authOptions.callbacks!.signIn!({
      user: { email: "a@b.com", name: "A", image: null } as never,
      account: { provider: "google", providerAccountId: "g-1" } as never,
      profile: undefined,
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(false);
    errorSpy.mockRestore();
  });
});

describe("jwt callback", () => {
  it("popula el token con id, role y registrationCompleted (estudiante con rut)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      role: "STUDENT",
      rut: "12345678-9",
    });

    const token = await authOptions.callbacks!.jwt!({
      token: { email: "a@b.com" } as never,
      user: { id: "u-1", email: "a@b.com" } as never,
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });

    expect(token.id).toBe("u-1");
    expect(token.role).toBe("STUDENT");
    expect(token.registrationCompleted).toBe(true);
  });

  it("registrationCompleted false si STUDENT no tiene rut", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-2",
      role: "STUDENT",
      rut: null,
    });

    const token = await authOptions.callbacks!.jwt!({
      token: { email: "a@b.com" } as never,
      user: { id: "u-2", email: "a@b.com" } as never,
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });

    expect(token.registrationCompleted).toBe(false);
  });

  it("popula companyStatus y reemplaza name con companyName cuando es COMPANY", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-3",
      role: "COMPANY",
      rut: null,
    });
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      companyStatus: "APPROVED",
      companyName: "TechCorp",
    });

    const token = await authOptions.callbacks!.jwt!({
      token: { email: "empresa@b.com", name: "Original" } as never,
      user: { id: "u-3", email: "empresa@b.com" } as never,
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });

    expect(token.companyStatus).toBe("APPROVED");
    expect(token.name).toBe("TechCorp");
    expect(token.registrationCompleted).toBe(true);
  });

  it("usa PENDING como companyStatus default si no hay perfil", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-4",
      role: "COMPANY",
      rut: null,
    });
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    const token = await authOptions.callbacks!.jwt!({
      token: { email: "empresa@b.com" } as never,
      user: { id: "u-4", email: "empresa@b.com" } as never,
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });

    expect(token.companyStatus).toBe("PENDING");
  });

  it("trigger 'update' aplica registrationCompleted desde session", async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: { id: "u-1" } as never,
      user: undefined as never,
      account: null,
      profile: undefined,
      trigger: "update",
      isNewUser: false,
      session: { registrationCompleted: true },
    });

    expect(token.registrationCompleted).toBe(true);
  });

  it("trigger 'update' aplica companyStatus, name e image desde session", async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: { id: "u-1" } as never,
      user: undefined as never,
      account: null,
      profile: undefined,
      trigger: "update",
      isNewUser: false,
      session: {
        companyStatus: "APPROVED",
        name: "Nuevo Nombre",
        image: "https://new.example.com/img.png",
      },
    });

    expect(token.companyStatus).toBe("APPROVED");
    expect(token.name).toBe("Nuevo Nombre");
    expect(token.picture).toBe("https://new.example.com/img.png");
  });

  it("retorna el token sin cambios cuando dbUser no existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const token = await authOptions.callbacks!.jwt!({
      token: { email: "ghost@b.com" } as never,
      user: { id: "u-x", email: "ghost@b.com" } as never,
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });

    expect(token.id).toBeUndefined();
    expect(token.role).toBeUndefined();
  });
});

type SessionUserExt = {
  id?: string;
  role?: string;
  registrationCompleted?: boolean;
  companyStatus?: string;
  name?: string | null;
};

describe("session callback", () => {
  it("mapea id, role y registrationCompleted al session.user", async () => {
    const session = await authOptions.callbacks!.session!({
      session: { user: { email: "a@b.com" } } as never,
      token: {
        id: "u-1",
        role: "STUDENT",
        registrationCompleted: false,
      } as never,
      user: undefined as never,
      newSession: undefined,
      trigger: "update",
    });

    const user = session.user as SessionUserExt;
    expect(user.id).toBe("u-1");
    expect(user.role).toBe("STUDENT");
    expect(user.registrationCompleted).toBe(false);
  });

  it("usa true como default si registrationCompleted está undefined en token", async () => {
    const session = await authOptions.callbacks!.session!({
      session: { user: { email: "a@b.com" } } as never,
      token: { id: "u-1", role: "STUDENT" } as never,
      user: undefined as never,
      newSession: undefined,
      trigger: "update",
    });

    expect((session.user as SessionUserExt).registrationCompleted).toBe(true);
  });

  it("propaga companyStatus y name de empresa al session.user", async () => {
    const session = await authOptions.callbacks!.session!({
      session: { user: { email: "a@b.com" } } as never,
      token: {
        id: "u-1",
        role: "COMPANY",
        companyStatus: "APPROVED",
        name: "TechCorp",
      } as never,
      user: undefined as never,
      newSession: undefined,
      trigger: "update",
    });

    const user = session.user as SessionUserExt;
    expect(user.companyStatus).toBe("APPROVED");
    expect(user.name).toBe("TechCorp");
  });

  it("retorna la session intacta cuando no hay user", async () => {
    const session = await authOptions.callbacks!.session!({
      session: {} as never,
      token: { id: "u-1" } as never,
      user: undefined as never,
      newSession: undefined,
      trigger: "update",
    });

    expect(session).toEqual({});
  });
});

describe("events.signIn — emisión inicial de refresh token", () => {
  function getEventsSignIn() {
    return authOptions.events?.signIn;
  }

  it("emite refresh token y setea cookie cuando user.email existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u-99" });
    mockIssueRefresh.mockResolvedValue({
      id: "rt-1",
      rawToken: "raw-token-x",
      expiresAt: new Date(),
    });

    const event = getEventsSignIn();
    expect(event).toBeDefined();
    await event!({ user: { email: "x@y.com" } } as never);

    expect(mockIssueRefresh).toHaveBeenCalledWith("u-99");
    expect(mockCookieSet).toHaveBeenCalledWith(
      "practix.refresh-token",
      "raw-token-x",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
  });

  it("noop si user no tiene email", async () => {
    const event = getEventsSignIn();
    await event!({ user: { email: null } } as never);

    expect(mockIssueRefresh).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("noop si findUnique no encuentra el user en DB", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const event = getEventsSignIn();
    await event!({ user: { email: "ghost@x.com" } } as never);

    expect(mockIssueRefresh).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("loggea error y NO bloquea sign-in si la emisión falla", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u-1" });
    mockIssueRefresh.mockRejectedValue(new Error("DB down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const event = getEventsSignIn();
    // No debe arrojar.
    await expect(
      event!({ user: { email: "x@y.com" } } as never),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[auth/events.signIn]"),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});

describe("getAuthSession", () => {
  it("delega en getServerSession con authOptions", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u-1" },
    } as never);

    const result = await getAuthSession();

    expect(getServerSession).toHaveBeenCalledWith(authOptions);
    expect(result).toEqual({ user: { id: "u-1" } });
  });
});

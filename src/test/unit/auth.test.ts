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

const { mockRateLimit } = vi.hoisted(() => ({
  mockRateLimit: vi.fn(),
}));

vi.mock("@/server/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
}));

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions, getAuthSession } from "@/lib/auth";

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

    expect(session.user!.id).toBe("u-1");
    expect(session.user!.role).toBe("STUDENT");
    expect(session.user!.registrationCompleted).toBe(false);
  });

  it("usa true como default si registrationCompleted está undefined en token", async () => {
    const session = await authOptions.callbacks!.session!({
      session: { user: { email: "a@b.com" } } as never,
      token: { id: "u-1", role: "STUDENT" } as never,
      user: undefined as never,
      newSession: undefined,
      trigger: "update",
    });

    expect(session.user!.registrationCompleted).toBe(true);
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

    expect(session.user!.companyStatus).toBe("APPROVED");
    expect(session.user!.name).toBe("TechCorp");
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

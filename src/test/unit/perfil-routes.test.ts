import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

const {
  mockRequireAuth,
  mockSentryCaptureException,
  mockUploadFile,
  mockRateLimit,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockSentryCaptureException: vi.fn(),
  mockUploadFile: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock("@/server/lib/auth-guard", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

vi.mock("@/server/lib/storage", () => ({
  uploadFile: mockUploadFile,
}));

vi.mock("@/server/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: "rate limited", resetAt }), {
      status: 429,
    }),
}));

import { GET as perfilGet, PUT as perfilPut } from "@/app/api/perfil/route";
import { POST as avatarPost } from "@/app/api/perfil/avatar/route";

const studentAuth = {
  session: { user: { email: "stu@acme.com" } },
  user: { id: "user-1", role: "STUDENT", email: "stu@acme.com" },
};

const companyAuth = {
  session: { user: { email: "co@acme.com" } },
  user: { id: "co-1", role: "COMPANY", email: "co@acme.com" },
};

const unauthorized = { error: "no session", status: 401 };

const okRateLimit = {
  success: true,
  remaining: 9,
  resetAt: Date.now() + 3_600_000,
};

const blockedRateLimit = {
  success: false,
  remaining: 0,
  resetAt: Date.now() + 3_600_000,
};

function fakeJsonRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

function fakeFile(name: string, type: string, size: number): File {
  return {
    name,
    type,
    size,
    arrayBuffer: async () => new ArrayBuffer(size),
  } as unknown as File;
}

function fakeFormDataRequest(file: File | null): NextRequest {
  const fakeFD = {
    get: (key: string) => (key === "avatar" ? file : null),
  };
  return {
    formData: async () => fakeFD,
  } as unknown as NextRequest;
}

beforeEach(() => {
  resetPrismaMock();
  mockRequireAuth.mockReset();
  mockSentryCaptureException.mockReset();
  mockUploadFile.mockReset();
  mockRateLimit.mockReset();

  mockRequireAuth.mockResolvedValue(studentAuth);
  mockRateLimit.mockResolvedValue(okRateLimit);
});

// ─── GET /api/perfil ─────────────────────────────────────────────────────────

describe("GET /api/perfil", () => {
  it("401 sin sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await perfilGet();
    expect(res.status).toBe(401);
  });

  it("200 con datos del propio user (filtrado por auth.user.id)", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      name: "Juan",
      email: "stu@acme.com",
    });

    const res = await perfilGet();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
      }),
    );
    expect(json.id).toBe("user-1");
  });

  it("500 + Sentry sin leak cuando Prisma falla", async () => {
    prismaMock.user.findUnique.mockRejectedValueOnce(new Error("DB exploded"));

    const res = await perfilGet();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(json.error).not.toContain("DB exploded");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });
});

// ─── PUT /api/perfil ─────────────────────────────────────────────────────────

describe("PUT /api/perfil", () => {
  const validBody = { name: "Juan", lastName: "Pérez", phone: "+56912345" };

  it("401 sin sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await perfilPut(fakeJsonRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("400 cuando body es inválido (Zod)", async () => {
    const res = await perfilPut(fakeJsonRequest({ name: "X" })); // < 2 chars
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("update usa where: id === auth.user.id (no leak ajeno)", async () => {
    prismaMock.user.update.mockResolvedValueOnce({ id: "user-1" });

    await perfilPut(fakeJsonRequest(validBody));

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
      }),
    );
  });

  it("trim a name/lastName/phone antes de guardar", async () => {
    prismaMock.user.update.mockResolvedValueOnce({ id: "user-1" });

    await perfilPut(
      fakeJsonRequest({
        name: "  Juan  ",
        lastName: "  Pérez  ",
        phone: "  +56912  ",
      }),
    );

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "Juan", lastName: "Pérez", phone: "+56912" },
      }),
    );
  });

  it("500 + Sentry sin leak cuando Prisma falla", async () => {
    prismaMock.user.update.mockRejectedValueOnce(new Error("FK violation"));

    const res = await perfilPut(fakeJsonRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).not.toContain("FK");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });
});

// ─── POST /api/perfil/avatar ─────────────────────────────────────────────────

describe("POST /api/perfil/avatar", () => {
  it("401 sin sesión, no toca rate limit", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await avatarPost(fakeFormDataRequest(null));
    expect(res.status).toBe(401);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("429 cuando se excede rate limit, no toca service (#K2)", async () => {
    mockRateLimit.mockResolvedValueOnce(blockedRateLimit);
    const res = await avatarPost(
      fakeFormDataRequest(fakeFile("a.jpg", "image/jpeg", 1000)),
    );
    expect(res.status).toBe(429);
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("rate limit usa key con auth.user.id (no IP)", async () => {
    mockUploadFile.mockResolvedValueOnce("https://cdn.example.com/a.jpg");
    prismaMock.user.update.mockResolvedValueOnce({});

    await avatarPost(
      fakeFormDataRequest(fakeFile("a.jpg", "image/jpeg", 1000)),
    );

    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("user-1"),
      10,
      3_600_000,
    );
  });

  it("400 cuando el mime no está en whitelist", async () => {
    const res = await avatarPost(
      fakeFormDataRequest(fakeFile("a.exe", "application/x-msdownload", 1000)),
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("INVALID_FILE_TYPE");
  });

  it("400 cuando el archivo supera 2MB", async () => {
    const res = await avatarPost(
      fakeFormDataRequest(fakeFile("a.jpg", "image/jpeg", 3 * 1024 * 1024)),
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("FILE_TOO_LARGE");
  });

  it("path usa auth.user.id directo (no originalName del cliente — sin path traversal)", async () => {
    mockUploadFile.mockResolvedValueOnce("https://cdn.example.com/a.png");
    prismaMock.user.update.mockResolvedValueOnce({});

    await avatarPost(
      fakeFormDataRequest(fakeFile("malicious.png", "image/png", 1000)),
    );

    expect(mockUploadFile).toHaveBeenCalledWith(
      "avatars",
      "avatars/user-1.png",
      expect.any(Buffer),
      "image/png",
    );
  });

  it("para COMPANY actualiza también CompanyProfile.logo", async () => {
    mockRequireAuth.mockResolvedValueOnce(companyAuth);
    mockUploadFile.mockResolvedValueOnce("https://cdn.example.com/c.jpg");
    prismaMock.user.update.mockResolvedValueOnce({});
    prismaMock.companyProfile.update.mockResolvedValueOnce({});

    await avatarPost(
      fakeFormDataRequest(fakeFile("c.jpg", "image/jpeg", 1000)),
    );

    expect(prismaMock.companyProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "co-1" } }),
    );
  });

  it("para STUDENT NO toca CompanyProfile", async () => {
    mockUploadFile.mockResolvedValueOnce("https://cdn.example.com/s.jpg");
    prismaMock.user.update.mockResolvedValueOnce({});

    await avatarPost(
      fakeFormDataRequest(fakeFile("s.jpg", "image/jpeg", 1000)),
    );

    expect(prismaMock.companyProfile.update).not.toHaveBeenCalled();
  });

  it("500 + Sentry sin leak cuando uploadFile falla (#K1)", async () => {
    mockUploadFile.mockRejectedValueOnce(
      new Error("Supabase bucket policy denied"),
    );

    const res = await avatarPost(
      fakeFormDataRequest(fakeFile("a.jpg", "image/jpeg", 1000)),
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(json.error).not.toContain("Supabase");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 con url en happy path", async () => {
    mockUploadFile.mockResolvedValueOnce("https://cdn.example.com/a.jpg");
    prismaMock.user.update.mockResolvedValueOnce({});

    const res = await avatarPost(
      fakeFormDataRequest(fakeFile("a.jpg", "image/jpeg", 1000)),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toMatch(/^https:\/\/cdn\.example\.com\/a\.jpg\?v=\d+$/);
  });
});

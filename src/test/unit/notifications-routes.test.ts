import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

const { mockRequireAuth, mockSentryCaptureException, mockRateLimit } =
  vi.hoisted(() => ({
    mockRequireAuth: vi.fn(),
    mockSentryCaptureException: vi.fn(),
    mockRateLimit: vi.fn(),
  }));

vi.mock("@/server/lib/auth-guard", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

vi.mock("@/server/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: "rate limited", resetAt }), {
      status: 429,
    }),
}));

import { GET as listGet } from "@/app/api/notifications/route";
import { DELETE as oneDelete } from "@/app/api/notifications/[id]/route";
import { PATCH as readAllPatch } from "@/app/api/notifications/read-all/route";

const userAuth = {
  session: { user: { email: "user@acme.com" } },
  user: { id: "user-1", role: "STUDENT", email: "user@acme.com" },
};

const unauthorized = { error: "no session", status: 401 };

const okRateLimit = {
  success: true,
  remaining: 9,
  resetAt: Date.now() + 60_000,
};

const blockedRateLimit = {
  success: false,
  remaining: 0,
  resetAt: Date.now() + 60_000,
};

beforeEach(() => {
  resetPrismaMock();
  mockRequireAuth.mockReset();
  mockSentryCaptureException.mockReset();
  mockRateLimit.mockReset();

  mockRequireAuth.mockResolvedValue(userAuth);
  mockRateLimit.mockResolvedValue(okRateLimit);
});

// ─── GET /api/notifications ──────────────────────────────────────────────────

describe("GET /api/notifications", () => {
  it("401 sin sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await listGet();
    expect(res.status).toBe(401);
  });

  it("200 con lista filtrada por userId (last 20)", async () => {
    prismaMock.notification.findMany.mockResolvedValueOnce([{ id: "n-1" }]);

    const res = await listGet();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    );
  });

  it("500 + Sentry sin leak cuando Prisma falla", async () => {
    prismaMock.notification.findMany.mockRejectedValueOnce(
      new Error("DB exploded"),
    );

    const res = await listGet();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(json.error).not.toContain("DB exploded");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });
});

// ─── DELETE /api/notifications/[id] ──────────────────────────────────────────

describe("DELETE /api/notifications/[id]", () => {
  const params = Promise.resolve({ id: "n-1" });

  it("401 sin sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await oneDelete({} as Request, { params });
    expect(res.status).toBe(401);
  });

  it("404 cuando deleteMany devuelve count=0 (no existe o no es del owner — anti-enumeration natural)", async () => {
    prismaMock.notification.deleteMany.mockResolvedValueOnce({ count: 0 });

    const res = await oneDelete({} as Request, { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("deleteMany usa filtro de owner (no permite borrar notifs ajenas)", async () => {
    prismaMock.notification.deleteMany.mockResolvedValueOnce({ count: 1 });

    await oneDelete({} as Request, { params });

    expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: "n-1", userId: "user-1" },
    });
  });

  it("500 + Sentry sin leak cuando Prisma falla", async () => {
    prismaMock.notification.deleteMany.mockRejectedValueOnce(
      new Error("network blip"),
    );

    const res = await oneDelete({} as Request, { params });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).not.toContain("network blip");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 ok happy path", async () => {
    prismaMock.notification.deleteMany.mockResolvedValueOnce({ count: 1 });

    const res = await oneDelete({} as Request, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

describe("PATCH /api/notifications/read-all", () => {
  it("401 sin sesión, no toca rate limit", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);

    const res = await readAllPatch();

    expect(res.status).toBe(401);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("429 cuando se excede rate limit, no toca DB", async () => {
    mockRateLimit.mockResolvedValueOnce(blockedRateLimit);

    const res = await readAllPatch();

    expect(res.status).toBe(429);
    expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
  });

  it("rate limit usa key con auth.user.id (no IP)", async () => {
    prismaMock.notification.updateMany.mockResolvedValueOnce({ count: 5 });

    await readAllPatch();

    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("user-1"),
      10,
      60_000,
    );
  });

  it("updateMany filtra por userId Y read=false (no toca leídas ni ajenas)", async () => {
    prismaMock.notification.updateMany.mockResolvedValueOnce({ count: 5 });

    await readAllPatch();

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", read: false },
      data: { read: true },
    });
  });

  it("500 + Sentry sin leak cuando Prisma falla", async () => {
    prismaMock.notification.updateMany.mockRejectedValueOnce(
      new Error("transaction timeout"),
    );

    const res = await readAllPatch();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).not.toContain("transaction timeout");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 ok happy path", async () => {
    prismaMock.notification.updateMany.mockResolvedValueOnce({ count: 5 });

    const res = await readAllPatch();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

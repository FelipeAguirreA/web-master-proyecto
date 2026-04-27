import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const {
  mockRateLimit,
  mockValidateAndRotate,
  mockBuildJwtPayload,
  mockEncodeAccessJwt,
  mockSentryCaptureMessage,
} = vi.hoisted(() => ({
  mockRateLimit: vi.fn(),
  mockValidateAndRotate: vi.fn(),
  mockBuildJwtPayload: vi.fn(),
  mockEncodeAccessJwt: vi.fn(),
  mockSentryCaptureMessage: vi.fn(),
}));

vi.mock("@/server/lib/rate-limit", async () => {
  const actual = await vi.importActual<
    typeof import("@/server/lib/rate-limit")
  >("@/server/lib/rate-limit");
  return {
    ...actual,
    rateLimit: mockRateLimit,
  };
});

vi.mock("@/server/services/refresh-tokens.service", () => ({
  validateAndRotate: mockValidateAndRotate,
}));

vi.mock("@/server/lib/auth-jwt", () => ({
  buildJwtPayload: mockBuildJwtPayload,
  encodeAccessJwt: mockEncodeAccessJwt,
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mockSentryCaptureMessage,
}));

import { POST } from "@/app/api/auth/refresh/route";
import { refreshCookieName } from "@/server/lib/auth-cookies";

interface FakeReqInit {
  ip?: string;
  refreshCookie?: string | undefined;
}

function fakeRequest({
  ip = "1.2.3.4",
  refreshCookie = "raw-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
}: FakeReqInit = {}): NextRequest {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "x-forwarded-for" ? ip : null,
    },
    cookies: {
      get: (name: string) =>
        name === refreshCookieName && refreshCookie !== undefined
          ? { value: refreshCookie }
          : undefined,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  mockRateLimit.mockReset();
  mockValidateAndRotate.mockReset();
  mockBuildJwtPayload.mockReset();
  mockEncodeAccessJwt.mockReset();
  mockSentryCaptureMessage.mockReset();

  // Defaults: rate limit pasa, no se invoca el resto salvo override
  mockRateLimit.mockResolvedValue({
    success: true,
    resetAt: Date.now() + 1000,
  });
});

describe("POST /api/auth/refresh — reuse detection", () => {
  it("reuse-detected → emite Sentry.captureMessage level=error con tag refresh_reuse", async () => {
    mockValidateAndRotate.mockResolvedValue({
      kind: "reuse-detected",
      userId: "u-victim-123",
    });

    const res = await POST(fakeRequest({ ip: "9.9.9.9" }));

    expect(res.status).toBe(401);
    expect(mockSentryCaptureMessage).toHaveBeenCalledTimes(1);
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Refresh token reuse detected",
      {
        level: "error",
        tags: { auth: "refresh_reuse" },
        extra: { userId: "u-victim-123", ip: "9.9.9.9" },
      },
    );
  });

  it("reuse-detected → respuesta 401 con mensaje de re-login", async () => {
    mockValidateAndRotate.mockResolvedValue({
      kind: "reuse-detected",
      userId: "u-1",
    });

    const res = await POST(fakeRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toMatch(/sesión revocada/i);
  });

  it("reuse-detected → limpia cookies de session y refresh", async () => {
    mockValidateAndRotate.mockResolvedValue({
      kind: "reuse-detected",
      userId: "u-1",
    });

    const res = await POST(fakeRequest());

    // Set-Cookie con expires en epoch 0 = clear
    const setCookies = res.headers.getSetCookie?.() ?? [];
    expect(setCookies.length).toBeGreaterThanOrEqual(2);
    const allClear = setCookies.every((c: string) =>
      /expires=Thu, 01 Jan 1970/i.test(c),
    );
    expect(allClear).toBe(true);
  });

  it("ip 'unknown' cuando falta x-forwarded-for", async () => {
    mockValidateAndRotate.mockResolvedValue({
      kind: "reuse-detected",
      userId: "u-1",
    });

    const req = {
      headers: { get: () => null },
      cookies: { get: () => ({ value: "raw" }) },
    } as unknown as NextRequest;

    await POST(req);

    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Refresh token reuse detected",
      expect.objectContaining({
        extra: expect.objectContaining({ ip: "unknown" }),
      }),
    );
  });
});

describe("POST /api/auth/refresh — Sentry NO se llama en otros paths", () => {
  it("happy path (kind=ok) NO emite captureMessage", async () => {
    mockValidateAndRotate.mockResolvedValue({
      kind: "ok",
      token: {
        userId: "u-1",
        rawToken: "newraw",
        expiresAt: new Date(Date.now() + 1000),
      },
    });
    mockBuildJwtPayload.mockResolvedValue({
      id: "u-1",
      email: "x@y.com",
      name: "X",
      role: "COMPANY",
      registrationCompleted: true,
      companyStatus: "APPROVED",
    });
    mockEncodeAccessJwt.mockResolvedValue("jwt-x");

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
  });

  it("kind=invalid NO emite captureMessage", async () => {
    mockValidateAndRotate.mockResolvedValue({ kind: "invalid" });

    const res = await POST(fakeRequest());

    expect(res.status).toBe(401);
    expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
  });

  it("sin cookie de refresh NO emite captureMessage (early return 401)", async () => {
    const reqSinCookie = {
      headers: { get: () => "1.2.3.4" },
      cookies: { get: () => undefined },
    } as unknown as NextRequest;

    const res = await POST(reqSinCookie);

    expect(res.status).toBe(401);
    expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
    expect(mockValidateAndRotate).not.toHaveBeenCalled();
  });

  it("rate-limited NO emite captureMessage (no es señal de compromiso)", async () => {
    mockRateLimit.mockResolvedValue({
      success: false,
      resetAt: Date.now() + 1000,
    });

    const res = await POST(fakeRequest());

    expect(res.status).toBe(429);
    expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/refresh — payload de Sentry no contiene secrets", () => {
  it("el extra NO contiene rawToken ni email plaintext", async () => {
    mockValidateAndRotate.mockResolvedValue({
      kind: "reuse-detected",
      userId: "u-1",
    });

    await POST(
      fakeRequest({ refreshCookie: "supersecretrawtoken123456789012345" }),
    );

    const call = mockSentryCaptureMessage.mock.calls[0];
    const payload = JSON.stringify(call);
    expect(payload).not.toContain("supersecretrawtoken");
  });
});

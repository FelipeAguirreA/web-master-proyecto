import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

const {
  mockRequireAuth,
  mockSentryCaptureException,
  mockGenerateEmbedding,
  mockRateLimit,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockSentryCaptureException: vi.fn(),
  mockGenerateEmbedding: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock("@/server/lib/auth-guard", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

vi.mock("@/server/lib/embeddings", () => ({
  generateEmbedding: mockGenerateEmbedding,
}));

vi.mock("@/server/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: "rate limited", resetAt }), {
      status: 429,
    }),
}));

import { POST } from "@/app/api/internships/route";

const validBody = {
  title: "Practicante Frontend",
  description: "Trabajo con interfaces modernas",
  area: "Ingeniería",
  location: "Santiago",
  modality: "REMOTE",
  duration: "3 meses",
  requirements: ["Estudiante de último año"],
  skills: ["React"],
};

function fakeRequest(body: unknown = validBody): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

const companyAuth = {
  session: { user: { email: "owner@acme.com" } },
  user: { id: "user-1", role: "COMPANY", email: "owner@acme.com" },
};

beforeEach(() => {
  resetPrismaMock();
  mockRequireAuth.mockReset();
  mockSentryCaptureException.mockReset();
  mockGenerateEmbedding.mockReset();
  mockRateLimit.mockReset();

  mockRequireAuth.mockResolvedValue(companyAuth);
  mockGenerateEmbedding.mockResolvedValue([]);
  mockRateLimit.mockResolvedValue({
    success: true,
    remaining: 9,
    resetAt: Date.now() + 60_000,
  });
});

// ---------------------------------------------------------------------------
// POST /api/internships — gate de companyStatus (#E4)
// ---------------------------------------------------------------------------
describe("POST /api/internships — gate companyStatus (#E4)", () => {
  it("PENDING → 403 'Company not approved' + NO crea + NO embed", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
      companyStatus: "PENDING",
    });

    const res = await POST(fakeRequest());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Company not approved");
    expect(prismaMock.internship.create).not.toHaveBeenCalled();
    expect(mockGenerateEmbedding).not.toHaveBeenCalled();
  });

  it("REJECTED → 403 + NO crea + NO embed", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
      companyStatus: "REJECTED",
    });

    const res = await POST(fakeRequest());

    expect(res.status).toBe(403);
    expect(prismaMock.internship.create).not.toHaveBeenCalled();
    expect(mockGenerateEmbedding).not.toHaveBeenCalled();
  });

  it("APPROVED → 201 con la práctica creada", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
      companyStatus: "APPROVED",
    });
    prismaMock.internship.create.mockResolvedValue({
      id: "int-new",
      companyId: "cp-1",
    });

    const res = await POST(fakeRequest());

    expect(res.status).toBe(201);
    expect(prismaMock.internship.create).toHaveBeenCalled();
    expect(mockGenerateEmbedding).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /api/internships — error mapping
// ---------------------------------------------------------------------------
describe("POST /api/internships — error mapping", () => {
  it("'Company profile required' → 400 (sin profile aún)", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Company profile required");
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it("Zod inválido → 400 sin Sentry", async () => {
    const res = await POST(fakeRequest({ title: "x" })); // min 3

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation error");
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it("error inesperado de DB → 500 genérico + Sentry, NO leak mensaje", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
      companyStatus: "APPROVED",
    });
    const dbErr = new Error("ECONNREFUSED 127.0.0.1:5432 from pg pool");
    prismaMock.internship.create.mockRejectedValue(dbErr);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
    expect(body.error).not.toMatch(/ECONNREFUSED/i);
    expect(body.error).not.toMatch(/5432/);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(dbErr);
  });
});

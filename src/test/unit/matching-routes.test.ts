import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const {
  mockRequireAuth,
  mockSentryCaptureException,
  mockProcessCV,
  mockDeleteCV,
  mockGetRecommendations,
  mockRateLimit,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockSentryCaptureException: vi.fn(),
  mockProcessCV: vi.fn(),
  mockDeleteCV: vi.fn(),
  mockGetRecommendations: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock("@/server/lib/auth-guard", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

vi.mock("@/server/services/matching.service", () => ({
  processCV: mockProcessCV,
  deleteCV: mockDeleteCV,
  getRecommendations: mockGetRecommendations,
}));

vi.mock("@/server/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: "rate limited", resetAt }), {
      status: 429,
    }),
}));

import { GET as recommendationsGet } from "@/app/api/matching/recommendations/route";
import {
  POST as uploadCvPost,
  DELETE as uploadCvDelete,
} from "@/app/api/matching/upload-cv/route";

const studentAuth = {
  session: { user: { email: "stu@acme.com" } },
  user: { id: "stu-1", role: "STUDENT", email: "stu@acme.com" },
};

const unauthorized = { error: "no session", status: 401 };

const okRateLimit = {
  success: true,
  remaining: 4,
  resetAt: Date.now() + 3_600_000,
};

const blockedRateLimit = {
  success: false,
  remaining: 0,
  resetAt: Date.now() + 3_600_000,
};

function fakeFile(name: string, type: string, size: number): File {
  return {
    name,
    type,
    size,
    arrayBuffer: async () => new ArrayBuffer(size),
  } as unknown as File;
}

function fakeFormDataRequest(file: File | null): NextRequest {
  // Mock directo de FormData.get() para preservar el `type` exacto del
  // fakeFile (FormData real envuelve el Blob y puede normalizar el type).
  const fakeFD = {
    get: (key: string) => (key === "cv" ? file : null),
  };
  return {
    formData: async () => fakeFD,
  } as unknown as NextRequest;
}

beforeEach(() => {
  mockRequireAuth.mockReset();
  mockSentryCaptureException.mockReset();
  mockProcessCV.mockReset();
  mockDeleteCV.mockReset();
  mockGetRecommendations.mockReset();
  mockRateLimit.mockReset();

  mockRequireAuth.mockResolvedValue(studentAuth);
  mockRateLimit.mockResolvedValue(okRateLimit);
});

// ─── GET /api/matching/recommendations ───────────────────────────────────────

describe("GET /api/matching/recommendations", () => {
  it("401 sin sesión, no toca rate limit", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await recommendationsGet();
    expect(res.status).toBe(401);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("429 cuando se excede rate limit, no toca service", async () => {
    mockRateLimit.mockResolvedValueOnce(blockedRateLimit);
    const res = await recommendationsGet();
    expect(res.status).toBe(429);
    expect(mockGetRecommendations).not.toHaveBeenCalled();
  });

  it("rate limit usa key con auth.user.id (no IP)", async () => {
    mockGetRecommendations.mockResolvedValueOnce([]);
    await recommendationsGet();
    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("stu-1"),
      120,
      3_600_000,
    );
  });

  it("500 + Sentry sin leak en error inesperado (#J1: ya no swallow silencioso)", async () => {
    mockGetRecommendations.mockRejectedValueOnce(new Error("HF API down"));
    const res = await recommendationsGet();
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(json.error).not.toContain("HF API");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 con recomendaciones en happy path", async () => {
    mockGetRecommendations.mockResolvedValueOnce([
      { id: "int-1", matchScore: 85 },
    ]);
    const res = await recommendationsGet();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json[0].matchScore).toBe(85);
  });
});

// ─── POST /api/matching/upload-cv ────────────────────────────────────────────

describe("POST /api/matching/upload-cv", () => {
  it("401 sin sesión, no toca rate limit", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await uploadCvPost(fakeFormDataRequest(null));
    expect(res.status).toBe(401);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("429 cuando se excede rate limit, no toca service", async () => {
    mockRateLimit.mockResolvedValueOnce(blockedRateLimit);
    const res = await uploadCvPost(
      fakeFormDataRequest(fakeFile("cv.pdf", "application/pdf", 1000)),
    );
    expect(res.status).toBe(429);
    expect(mockProcessCV).not.toHaveBeenCalled();
  });

  it("400 cuando no hay archivo", async () => {
    const res = await uploadCvPost(fakeFormDataRequest(null));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("400 INVALID_FILE_TYPE cuando el mime no está en whitelist", async () => {
    const res = await uploadCvPost(
      fakeFormDataRequest(
        fakeFile("script.exe", "application/x-msdownload", 1000),
      ),
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("INVALID_FILE_TYPE");
    expect(mockProcessCV).not.toHaveBeenCalled();
  });

  it("400 FILE_TOO_LARGE cuando el archivo supera 5MB", async () => {
    const oversized = 6 * 1024 * 1024;
    const res = await uploadCvPost(
      fakeFormDataRequest(fakeFile("cv.pdf", "application/pdf", oversized)),
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("FILE_TOO_LARGE");
    expect(mockProcessCV).not.toHaveBeenCalled();
  });

  it("500 + Sentry sin leak en error inesperado (#J1)", async () => {
    mockProcessCV.mockRejectedValueOnce(new Error("Supabase 500"));
    const res = await uploadCvPost(
      fakeFormDataRequest(fakeFile("cv.pdf", "application/pdf", 1000)),
    );
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(json.error).not.toContain("Supabase");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 happy path con success+cvUrl+embeddingSize", async () => {
    mockProcessCV.mockResolvedValueOnce({
      cvUrl: "https://cdn.example.com/cv.pdf",
      embeddingSize: 384,
    });
    const res = await uploadCvPost(
      fakeFormDataRequest(fakeFile("cv.pdf", "application/pdf", 1000)),
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.embeddingSize).toBe(384);
  });
});

// ─── DELETE /api/matching/upload-cv ──────────────────────────────────────────

describe("DELETE /api/matching/upload-cv", () => {
  it("401 sin sesión, no toca rate limit", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await uploadCvDelete();
    expect(res.status).toBe(401);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("429 cuando se excede rate limit, no toca service (#J3)", async () => {
    mockRateLimit.mockResolvedValueOnce(blockedRateLimit);
    const res = await uploadCvDelete();
    expect(res.status).toBe(429);
    expect(mockDeleteCV).not.toHaveBeenCalled();
  });

  it("rate limit usa key con auth.user.id (no IP)", async () => {
    mockDeleteCV.mockResolvedValueOnce(undefined);
    await uploadCvDelete();
    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("stu-1"),
      5,
      3_600_000,
    );
  });

  it("500 + Sentry sin leak en error inesperado (#J1)", async () => {
    mockDeleteCV.mockRejectedValueOnce(new Error("DB locked"));
    const res = await uploadCvDelete();
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).not.toContain("DB locked");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 success en happy path", async () => {
    mockDeleteCV.mockResolvedValueOnce(undefined);
    const res = await uploadCvDelete();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const {
  mockRequireAuth,
  mockSentryCaptureException,
  mockCreateInterview,
  mockGetInterviewsByCompany,
  mockGetInterviewById,
  mockUpdateInterview,
  mockDeleteInterview,
  mockSendInterviewToChat,
  mockGetAvailableCandidates,
  mockRateLimit,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockSentryCaptureException: vi.fn(),
  mockCreateInterview: vi.fn(),
  mockGetInterviewsByCompany: vi.fn(),
  mockGetInterviewById: vi.fn(),
  mockUpdateInterview: vi.fn(),
  mockDeleteInterview: vi.fn(),
  mockSendInterviewToChat: vi.fn(),
  mockGetAvailableCandidates: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock("@/server/lib/auth-guard", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

vi.mock("@/server/services/interviews.service", () => ({
  createInterview: mockCreateInterview,
  getInterviewsByCompany: mockGetInterviewsByCompany,
  getInterviewById: mockGetInterviewById,
  updateInterview: mockUpdateInterview,
  deleteInterview: mockDeleteInterview,
  sendInterviewToChat: mockSendInterviewToChat,
  getAvailableCandidates: mockGetAvailableCandidates,
}));

vi.mock("@/server/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: "rate limited", resetAt }), {
      status: 429,
    }),
}));

import { GET as listGet, POST as createPost } from "@/app/api/interviews/route";
import {
  GET as oneGet,
  PATCH as onePatch,
  DELETE as oneDelete,
} from "@/app/api/interviews/[interviewId]/route";
import { POST as sendToChatPost } from "@/app/api/interviews/[interviewId]/send-to-chat/route";
import { GET as availableCandidatesGet } from "@/app/api/interviews/available-candidates/[jobId]/route";

interface FakeReqInit {
  body?: unknown;
  url?: string;
}

function fakeRequest({
  body = {},
  url = "http://localhost/api/interviews",
}: FakeReqInit = {}): NextRequest {
  return {
    url,
    json: async () => body,
  } as unknown as NextRequest;
}

function ivError(code: string, message = "boom") {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

const companyAuth = {
  session: { user: { email: "owner@acme.com" } },
  user: { id: "user-1", role: "COMPANY", email: "owner@acme.com" },
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

const validCreateBody = {
  internshipId: "int-1",
  applicationId: "app-1",
  conversationId: "conv-1",
  title: "Entrevista técnica",
  scheduledAt: "2026-05-01T15:00:00Z",
  durationMins: 60,
};

beforeEach(() => {
  mockRequireAuth.mockReset();
  mockSentryCaptureException.mockReset();
  mockCreateInterview.mockReset();
  mockGetInterviewsByCompany.mockReset();
  mockGetInterviewById.mockReset();
  mockUpdateInterview.mockReset();
  mockDeleteInterview.mockReset();
  mockSendInterviewToChat.mockReset();
  mockGetAvailableCandidates.mockReset();
  mockRateLimit.mockReset();

  mockRequireAuth.mockResolvedValue(companyAuth);
  mockRateLimit.mockResolvedValue(okRateLimit);
});

// ─── POST /api/interviews ────────────────────────────────────────────────────

describe("POST /api/interviews", () => {
  it("401 sin sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await createPost(fakeRequest({ body: validCreateBody }));
    expect(res.status).toBe(401);
  });

  it("400 body inválido (Zod)", async () => {
    const res = await createPost(fakeRequest({ body: { title: "" } }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(mockCreateInterview).not.toHaveBeenCalled();
  });

  it("404 cuando service lanza NOT_FOUND", async () => {
    mockCreateInterview.mockRejectedValueOnce(
      ivError("NOT_FOUND", "Application not found"),
    );
    const res = await createPost(fakeRequest({ body: validCreateBody }));
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it("400 APPLICATION_MISMATCH cuando la app no pertenece al internship", async () => {
    mockCreateInterview.mockRejectedValueOnce(
      ivError("APPLICATION_MISMATCH", "Application does not belong..."),
    );
    const res = await createPost(fakeRequest({ body: validCreateBody }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("APPLICATION_MISMATCH");
  });

  it("409 INTERVIEW_ALREADY_EXISTS cuando ya hay entrevista", async () => {
    mockCreateInterview.mockRejectedValueOnce(
      ivError("INTERVIEW_ALREADY_EXISTS", "Ya existe..."),
    );
    const res = await createPost(fakeRequest({ body: validCreateBody }));
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.code).toBe("INTERVIEW_ALREADY_EXISTS");
  });

  it("500 + Sentry sin leak en error inesperado", async () => {
    mockCreateInterview.mockRejectedValueOnce(new Error("DB exploded"));
    const res = await createPost(fakeRequest({ body: validCreateBody }));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(json.error).not.toContain("DB exploded");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("201 con interview creada en happy path", async () => {
    mockCreateInterview.mockResolvedValueOnce({ id: "iv-1" });
    const res = await createPost(fakeRequest({ body: validCreateBody }));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.id).toBe("iv-1");
  });
});

// ─── GET /api/interviews ─────────────────────────────────────────────────────

describe("GET /api/interviews", () => {
  it("401 sin sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await listGet(fakeRequest());
    expect(res.status).toBe(401);
  });

  it("200 con lista filtrada por company", async () => {
    mockGetInterviewsByCompany.mockResolvedValueOnce([{ id: "iv-1" }]);
    const res = await listGet(fakeRequest());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(mockGetInterviewsByCompany).toHaveBeenCalledWith(
      "user-1",
      expect.any(Object),
    );
  });

  it("500 + Sentry sin leak cuando service falla", async () => {
    mockGetInterviewsByCompany.mockRejectedValueOnce(new Error("redis down"));
    const res = await listGet(fakeRequest());
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).not.toContain("redis");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });
});

// ─── GET /api/interviews/[id] ────────────────────────────────────────────────

describe("GET /api/interviews/[interviewId]", () => {
  const params = Promise.resolve({ interviewId: "iv-1" });

  it("401 sin sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await oneGet(fakeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("404 NOT_FOUND (incluye ownership fail — anti-enumeration)", async () => {
    mockGetInterviewById.mockRejectedValueOnce(
      ivError("NOT_FOUND", "Interview not found"),
    );
    const res = await oneGet(fakeRequest(), { params });
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("500 + Sentry en error inesperado", async () => {
    mockGetInterviewById.mockRejectedValueOnce(new Error("oops"));
    const res = await oneGet(fakeRequest(), { params });
    expect(res.status).toBe(500);
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 happy path", async () => {
    mockGetInterviewById.mockResolvedValueOnce({ id: "iv-1" });
    const res = await oneGet(fakeRequest(), { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.id).toBe("iv-1");
  });
});

// ─── PATCH /api/interviews/[id] ──────────────────────────────────────────────

describe("PATCH /api/interviews/[interviewId]", () => {
  const params = Promise.resolve({ interviewId: "iv-1" });

  it("401 sin sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await onePatch(fakeRequest({ body: { title: "X" } }), {
      params,
    });
    expect(res.status).toBe(401);
  });

  it("400 body inválido", async () => {
    const res = await onePatch(fakeRequest({ body: { title: "" } }), {
      params,
    });
    expect(res.status).toBe(400);
    expect(mockUpdateInterview).not.toHaveBeenCalled();
  });

  it("404 NOT_FOUND incluye ownership fail (anti-enumeration)", async () => {
    mockUpdateInterview.mockRejectedValueOnce(
      ivError("NOT_FOUND", "Interview not found"),
    );
    const res = await onePatch(fakeRequest({ body: { title: "Nuevo" } }), {
      params,
    });
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("409 INTERVIEW_ALREADY_EXISTS al reasignar candidato", async () => {
    mockUpdateInterview.mockRejectedValueOnce(
      ivError("INTERVIEW_ALREADY_EXISTS", "Ya existe..."),
    );
    const res = await onePatch(
      fakeRequest({ body: { applicationId: "app-2" } }),
      {
        params,
      },
    );
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.code).toBe("INTERVIEW_ALREADY_EXISTS");
  });

  it("400 NEW_CANDIDATE_NO_CONVERSATION cuando el nuevo candidato no tiene conv", async () => {
    mockUpdateInterview.mockRejectedValueOnce(
      ivError("NEW_CANDIDATE_NO_CONVERSATION", "..."),
    );
    const res = await onePatch(
      fakeRequest({ body: { applicationId: "app-2" } }),
      {
        params,
      },
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("NEW_CANDIDATE_NO_CONVERSATION");
  });

  it("500 + Sentry en error inesperado, sin leak", async () => {
    mockUpdateInterview.mockRejectedValueOnce(new Error("network blip"));
    const res = await onePatch(fakeRequest({ body: { title: "X" } }), {
      params,
    });
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).not.toContain("network blip");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 happy path", async () => {
    mockUpdateInterview.mockResolvedValueOnce({ id: "iv-1", title: "X" });
    const res = await onePatch(fakeRequest({ body: { title: "X" } }), {
      params,
    });
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/interviews/[id] ─────────────────────────────────────────────

describe("DELETE /api/interviews/[interviewId]", () => {
  const params = Promise.resolve({ interviewId: "iv-1" });

  it("401 sin sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await oneDelete(fakeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("404 NOT_FOUND (incluye ownership fail)", async () => {
    mockDeleteInterview.mockRejectedValueOnce(
      ivError("NOT_FOUND", "Interview not found"),
    );
    const res = await oneDelete(fakeRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("500 + Sentry en error inesperado", async () => {
    mockDeleteInterview.mockRejectedValueOnce(new Error("oops"));
    const res = await oneDelete(fakeRequest(), { params });
    expect(res.status).toBe(500);
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 ok happy path", async () => {
    mockDeleteInterview.mockResolvedValueOnce(undefined);
    const res = await oneDelete(fakeRequest(), { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ─── POST /api/interviews/[id]/send-to-chat ──────────────────────────────────

describe("POST /api/interviews/[interviewId]/send-to-chat", () => {
  const params = Promise.resolve({ interviewId: "iv-1" });

  it("401 sin sesión, no toca rate limit", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await sendToChatPost(fakeRequest(), { params });
    expect(res.status).toBe(401);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("429 cuando se excede rate limit, no toca service", async () => {
    mockRateLimit.mockResolvedValueOnce(blockedRateLimit);
    const res = await sendToChatPost(fakeRequest(), { params });
    expect(res.status).toBe(429);
    expect(mockSendInterviewToChat).not.toHaveBeenCalled();
  });

  it("rate limit usa key con auth.user.id (no IP)", async () => {
    mockSendInterviewToChat.mockResolvedValueOnce({
      message: {},
      interview: {},
    });
    await sendToChatPost(fakeRequest(), { params });
    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("user-1"),
      10,
      60_000,
    );
  });

  it("404 NOT_FOUND (incluye ownership fail)", async () => {
    mockSendInterviewToChat.mockRejectedValueOnce(
      ivError("NOT_FOUND", "Interview not found"),
    );
    const res = await sendToChatPost(fakeRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("500 + Sentry sin leak en error inesperado", async () => {
    mockSendInterviewToChat.mockRejectedValueOnce(
      new Error("transaction failed"),
    );
    const res = await sendToChatPost(fakeRequest(), { params });
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).not.toContain("transaction");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("201 happy path", async () => {
    mockSendInterviewToChat.mockResolvedValueOnce({
      message: { id: "msg-1" },
      interview: { id: "iv-1", sentToChat: true },
    });
    const res = await sendToChatPost(fakeRequest(), { params });
    expect(res.status).toBe(201);
  });
});

// ─── GET /api/interviews/available-candidates/[jobId] ────────────────────────

describe("GET /api/interviews/available-candidates/[jobId]", () => {
  const params = Promise.resolve({ jobId: "job-1" });

  it("401 sin sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);
    const res = await availableCandidatesGet(fakeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("404 NOT_FOUND (incluye ownership fail)", async () => {
    mockGetAvailableCandidates.mockRejectedValueOnce(
      ivError("NOT_FOUND", "Internship not found"),
    );
    const res = await availableCandidatesGet(fakeRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("500 + Sentry en error inesperado", async () => {
    mockGetAvailableCandidates.mockRejectedValueOnce(new Error("oops"));
    const res = await availableCandidatesGet(fakeRequest(), { params });
    expect(res.status).toBe(500);
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 con candidates en happy path", async () => {
    mockGetAvailableCandidates.mockResolvedValueOnce([
      { applicationId: "app-1" },
    ]);
    const res = await availableCandidatesGet(fakeRequest(), { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
  });
});

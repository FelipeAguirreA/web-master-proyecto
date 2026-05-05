import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const {
  mockRequireAuth,
  mockSentryCaptureException,
  mockGetOrCreateConversation,
  mockGetConversationsByUser,
  mockGetConversationById,
  mockGetMessages,
  mockSendMessage,
  mockMarkConversationRead,
  mockRateLimit,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockSentryCaptureException: vi.fn(),
  mockGetOrCreateConversation: vi.fn(),
  mockGetConversationsByUser: vi.fn(),
  mockGetConversationById: vi.fn(),
  mockGetMessages: vi.fn(),
  mockSendMessage: vi.fn(),
  mockMarkConversationRead: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock("@/server/lib/auth-guard", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

vi.mock("@/server/services/chat.service", () => ({
  getOrCreateConversation: mockGetOrCreateConversation,
  getConversationsByUser: mockGetConversationsByUser,
  getConversationById: mockGetConversationById,
  getMessages: mockGetMessages,
  sendMessage: mockSendMessage,
  markConversationRead: mockMarkConversationRead,
}));

vi.mock("@/server/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: "rate limited", resetAt }), {
      status: 429,
    }),
}));

import {
  GET as conversationsGet,
  POST as conversationsPost,
} from "@/app/api/chat/conversations/route";
import { GET as conversationGet } from "@/app/api/chat/conversations/[conversationId]/route";
import {
  GET as messagesGet,
  POST as messagesPost,
} from "@/app/api/chat/conversations/[conversationId]/messages/route";
import { PATCH as readPatch } from "@/app/api/chat/conversations/[conversationId]/read/route";

interface FakeReqInit {
  body?: unknown;
  url?: string;
  jsonThrows?: boolean;
}

function fakeRequest({
  body = {},
  url = "http://localhost/api/chat/conversations/conv-1/messages",
  jsonThrows = false,
}: FakeReqInit = {}): NextRequest {
  return {
    url,
    json: async () => {
      if (jsonThrows) throw new Error("invalid json");
      return body;
    },
  } as unknown as NextRequest;
}

function chatError(code: string, message = "boom") {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

const companyAuth = {
  session: { user: { email: "owner@acme.com" } },
  user: { id: "user-1", role: "COMPANY", email: "owner@acme.com" },
};

const studentAuth = {
  session: { user: { email: "stu@acme.com" } },
  user: { id: "user-2", role: "STUDENT", email: "stu@acme.com" },
};

const unauthorized = { error: "no session", status: 401 };

const okRateLimit = {
  success: true,
  remaining: 29,
  resetAt: Date.now() + 60_000,
};

const blockedRateLimit = {
  success: false,
  remaining: 0,
  resetAt: Date.now() + 60_000,
};

beforeEach(() => {
  mockRequireAuth.mockReset();
  mockSentryCaptureException.mockReset();
  mockGetOrCreateConversation.mockReset();
  mockGetConversationsByUser.mockReset();
  mockGetConversationById.mockReset();
  mockGetMessages.mockReset();
  mockSendMessage.mockReset();
  mockMarkConversationRead.mockReset();
  mockRateLimit.mockReset();

  mockRequireAuth.mockResolvedValue(companyAuth);
  mockRateLimit.mockResolvedValue(okRateLimit);
});

// ─── POST /api/chat/conversations ────────────────────────────────────────────

describe("POST /api/chat/conversations", () => {
  it("401 cuando no hay sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);

    const res = await conversationsPost(
      fakeRequest({ body: { applicationId: "app-1" } }),
    );

    expect(res.status).toBe(401);
  });

  it("400 cuando falta applicationId", async () => {
    const res = await conversationsPost(fakeRequest({ body: {} }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(mockGetOrCreateConversation).not.toHaveBeenCalled();
  });

  it("404 cuando el service lanza NOT_FOUND", async () => {
    mockGetOrCreateConversation.mockRejectedValueOnce(
      chatError("NOT_FOUND", "Application not found"),
    );

    const res = await conversationsPost(
      fakeRequest({ body: { applicationId: "app-1" } }),
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it("403 PIPELINE_STATUS_REQUIRED cuando la app no está en INTERVIEW", async () => {
    mockGetOrCreateConversation.mockRejectedValueOnce(
      chatError("INTERVIEW_REQUIRED", "Chat only available..."),
    );

    const res = await conversationsPost(
      fakeRequest({ body: { applicationId: "app-1" } }),
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.code).toBe("PIPELINE_STATUS_REQUIRED");
  });

  it("500 + Sentry en error inesperado, sin leak del mensaje crudo", async () => {
    mockGetOrCreateConversation.mockRejectedValueOnce(new Error("DB exploded"));

    const res = await conversationsPost(
      fakeRequest({ body: { applicationId: "app-1" } }),
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(json.error).not.toContain("DB exploded");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("201 con la conversation creada en el happy path", async () => {
    mockGetOrCreateConversation.mockResolvedValueOnce({ id: "conv-1" });

    const res = await conversationsPost(
      fakeRequest({ body: { applicationId: "app-1" } }),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("conv-1");
  });
});

// ─── GET /api/chat/conversations ─────────────────────────────────────────────

describe("GET /api/chat/conversations", () => {
  it("401 cuando no hay sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);

    const res = await conversationsGet();

    expect(res.status).toBe(401);
  });

  it("filtra por role STUDENT cuando la sesión es estudiante", async () => {
    mockRequireAuth.mockResolvedValueOnce(studentAuth);
    mockGetConversationsByUser.mockResolvedValueOnce([]);

    const res = await conversationsGet();

    expect(res.status).toBe(200);
    expect(mockGetConversationsByUser).toHaveBeenCalledWith(
      "user-2",
      "STUDENT",
    );
  });

  it("500 + Sentry sin leak del mensaje cuando el service falla", async () => {
    mockGetConversationsByUser.mockRejectedValueOnce(new Error("redis down"));

    const res = await conversationsGet();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe("INTERNAL_ERROR");
    expect(json.error).not.toContain("redis");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });
});

// ─── GET /api/chat/conversations/[id] ────────────────────────────────────────

describe("GET /api/chat/conversations/[conversationId]", () => {
  const params = Promise.resolve({ conversationId: "conv-1" });

  it("401 cuando no hay sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);

    const res = await conversationGet(fakeRequest(), { params });

    expect(res.status).toBe(401);
  });

  it("404 cuando service lanza NOT_FOUND", async () => {
    mockGetConversationById.mockRejectedValueOnce(
      chatError("NOT_FOUND", "Conversation not found"),
    );

    const res = await conversationGet(fakeRequest(), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("404 (no 403) cuando el caller no es parte de la conversación — 404 unification", async () => {
    mockGetConversationById.mockRejectedValueOnce(
      chatError("FORBIDDEN", "Not authorized"),
    );

    const res = await conversationGet(fakeRequest(), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("500 + Sentry en error inesperado", async () => {
    mockGetConversationById.mockRejectedValueOnce(new Error("oops"));

    const res = await conversationGet(fakeRequest(), { params });

    expect(res.status).toBe(500);
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 con la conversación en happy path", async () => {
    mockGetConversationById.mockResolvedValueOnce({ id: "conv-1" });

    const res = await conversationGet(fakeRequest(), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("conv-1");
  });
});

// ─── GET /api/chat/conversations/[id]/messages ───────────────────────────────

describe("GET /api/chat/conversations/[conversationId]/messages", () => {
  const params = Promise.resolve({ conversationId: "conv-1" });

  it("401 cuando no hay sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);

    const res = await messagesGet(fakeRequest(), { params });

    expect(res.status).toBe(401);
  });

  it("404 cuando service lanza NOT_FOUND", async () => {
    mockGetMessages.mockRejectedValueOnce(
      chatError("NOT_FOUND", "Conversation not found"),
    );

    const res = await messagesGet(fakeRequest(), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("404 cuando service lanza FORBIDDEN — 404 unification", async () => {
    mockGetMessages.mockRejectedValueOnce(
      chatError("FORBIDDEN", "Not authorized"),
    );

    const res = await messagesGet(fakeRequest(), { params });

    expect(res.status).toBe(404);
  });

  it("500 + Sentry en error inesperado, sin leak del mensaje", async () => {
    mockGetMessages.mockRejectedValueOnce(new Error("query timeout"));

    const res = await messagesGet(fakeRequest(), { params });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).not.toContain("query timeout");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 con messages + nextCursor en happy path", async () => {
    mockGetMessages.mockResolvedValueOnce({
      messages: [{ id: "m-1" }],
      nextCursor: null,
    });

    const res = await messagesGet(
      fakeRequest({
        url: "http://localhost/api/chat/conversations/conv-1/messages?limit=10",
      }),
      { params },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.messages).toHaveLength(1);
  });
});

// ─── POST /api/chat/conversations/[id]/messages ──────────────────────────────

describe("POST /api/chat/conversations/[conversationId]/messages", () => {
  const params = Promise.resolve({ conversationId: "conv-1" });

  it("401 cuando no hay sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);

    const res = await messagesPost(fakeRequest({ body: { content: "hola" } }), {
      params,
    });

    expect(res.status).toBe(401);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("429 cuando se excede el rate limit", async () => {
    mockRateLimit.mockResolvedValueOnce(blockedRateLimit);

    const res = await messagesPost(fakeRequest({ body: { content: "hola" } }), {
      params,
    });

    expect(res.status).toBe(429);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("rate limit usa key con auth.user.id (no anonimo / IP)", async () => {
    mockSendMessage.mockResolvedValueOnce({ id: "msg-1" });

    await messagesPost(fakeRequest({ body: { content: "hola" } }), { params });

    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("user-1"),
      30,
      60_000,
    );
  });

  it("400 cuando el body es inválido (content vacío)", async () => {
    const res = await messagesPost(fakeRequest({ body: { content: "" } }), {
      params,
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("400 cuando el body es inválido (content > 4000 chars)", async () => {
    const res = await messagesPost(
      fakeRequest({ body: { content: "x".repeat(4001) } }),
      { params },
    );

    expect(res.status).toBe(400);
  });

  it("404 cuando service lanza NOT_FOUND", async () => {
    mockSendMessage.mockRejectedValueOnce(
      chatError("NOT_FOUND", "Conversation not found"),
    );

    const res = await messagesPost(fakeRequest({ body: { content: "hola" } }), {
      params,
    });

    expect(res.status).toBe(404);
  });

  it("404 cuando service lanza FORBIDDEN — 404 unification", async () => {
    mockSendMessage.mockRejectedValueOnce(
      chatError("FORBIDDEN", "Not authorized"),
    );

    const res = await messagesPost(fakeRequest({ body: { content: "hola" } }), {
      params,
    });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("403 STUDENT_CANNOT_INITIATE cuando estudiante intenta iniciar", async () => {
    mockSendMessage.mockRejectedValueOnce(
      chatError("STUDENT_CANNOT_INITIATE", "La empresa debe iniciar..."),
    );

    const res = await messagesPost(fakeRequest({ body: { content: "hola" } }), {
      params,
    });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.code).toBe("STUDENT_CANNOT_INITIATE");
  });

  it("500 + Sentry en error inesperado", async () => {
    mockSendMessage.mockRejectedValueOnce(new Error("network blip"));

    const res = await messagesPost(fakeRequest({ body: { content: "hola" } }), {
      params,
    });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).not.toContain("network blip");
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("201 con el mensaje creado en happy path", async () => {
    mockSendMessage.mockResolvedValueOnce({ id: "msg-1", content: "hola" });

    const res = await messagesPost(fakeRequest({ body: { content: "hola" } }), {
      params,
    });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("msg-1");
  });
});

// ─── PATCH /api/chat/conversations/[id]/read ─────────────────────────────────

describe("PATCH /api/chat/conversations/[conversationId]/read", () => {
  const params = Promise.resolve({ conversationId: "conv-1" });

  it("401 cuando no hay sesión", async () => {
    mockRequireAuth.mockResolvedValueOnce(unauthorized);

    const res = await readPatch(fakeRequest(), { params });

    expect(res.status).toBe(401);
  });

  it("404 cuando service lanza NOT_FOUND", async () => {
    mockMarkConversationRead.mockRejectedValueOnce(
      chatError("NOT_FOUND", "Conversation not found"),
    );

    const res = await readPatch(fakeRequest(), { params });

    expect(res.status).toBe(404);
  });

  it("404 cuando service lanza FORBIDDEN — 404 unification", async () => {
    mockMarkConversationRead.mockRejectedValueOnce(
      chatError("FORBIDDEN", "Not authorized"),
    );

    const res = await readPatch(fakeRequest(), { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("500 + Sentry en error inesperado", async () => {
    mockMarkConversationRead.mockRejectedValueOnce(new Error("oops"));

    const res = await readPatch(fakeRequest(), { params });

    expect(res.status).toBe(500);
    expect(mockSentryCaptureException).toHaveBeenCalledOnce();
  });

  it("200 con ok:true en happy path", async () => {
    mockMarkConversationRead.mockResolvedValueOnce(undefined);

    const res = await readPatch(fakeRequest(), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

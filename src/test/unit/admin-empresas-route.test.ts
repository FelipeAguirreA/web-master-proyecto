import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

const {
  mockRequireAdmin,
  mockSendCompanyStatusEmail,
  mockSentryCaptureException,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockSendCompanyStatusEmail: vi.fn(),
  mockSentryCaptureException: vi.fn(),
}));

vi.mock("@/server/lib/auth-guard", () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock("@/server/lib/mail", () => ({
  sendCompanyStatusEmail: mockSendCompanyStatusEmail,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

import { PATCH } from "@/app/api/admin/empresas/[id]/route";

interface FakeReqInit {
  body?: unknown;
  jsonThrows?: boolean;
}

function fakeRequest({
  body = { action: "approve" },
  jsonThrows = false,
}: FakeReqInit = {}): NextRequest {
  return {
    json: async () => {
      if (jsonThrows) throw new Error("invalid json");
      return body;
    },
  } as unknown as NextRequest;
}

function paramsOf(id: string) {
  return { params: Promise.resolve({ id }) };
}

const adminAuth = {
  session: { user: { email: "admin@x.com" } },
  user: { id: "admin-1", role: "STUDENT", email: "admin@x.com" },
};

const sampleCompany = {
  id: "co-1",
  companyName: "ACME SA",
  companyStatus: "APPROVED",
  user: { email: "owner@acme.com", name: "Owner Name" },
};

beforeEach(() => {
  resetPrismaMock();
  mockRequireAdmin.mockReset();
  mockSendCompanyStatusEmail.mockReset();
  mockSentryCaptureException.mockReset();

  // Defaults
  mockRequireAdmin.mockResolvedValue(adminAuth);
  mockSendCompanyStatusEmail.mockResolvedValue(undefined);
});

describe("PATCH /api/admin/empresas/[id] — auth", () => {
  it("sin sesión → propaga 401 de requireAdmin sin tocar DB", async () => {
    mockRequireAdmin.mockResolvedValue({ error: "Unauthorized", status: 401 });

    const res = await PATCH(fakeRequest(), paramsOf("co-1"));

    expect(res.status).toBe(401);
    expect(prismaMock.companyProfile.update).not.toHaveBeenCalled();
  });

  it("sesión no-admin → propaga 403 de requireAdmin", async () => {
    mockRequireAdmin.mockResolvedValue({ error: "Forbidden", status: 403 });

    const res = await PATCH(fakeRequest(), paramsOf("co-1"));

    expect(res.status).toBe(403);
    expect(prismaMock.companyProfile.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/empresas/[id] — body validation (#B1)", () => {
  it("body que falla json parse → 400 sin tocar DB", async () => {
    const res = await PATCH(
      fakeRequest({ jsonThrows: true }),
      paramsOf("co-1"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Datos inválidos");
    expect(prismaMock.companyProfile.update).not.toHaveBeenCalled();
  });

  it("body sin action → 400", async () => {
    const res = await PATCH(fakeRequest({ body: {} }), paramsOf("co-1"));

    expect(res.status).toBe(400);
    expect(prismaMock.companyProfile.update).not.toHaveBeenCalled();
  });

  it("action inválida → 400 con details de Zod", async () => {
    const res = await PATCH(
      fakeRequest({ body: { action: "delete-everything" } }),
      paramsOf("co-1"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Datos inválidos");
    expect(Array.isArray(body.details)).toBe(true);
    expect(prismaMock.companyProfile.update).not.toHaveBeenCalled();
  });

  it("body string en vez de objeto → 400", async () => {
    const res = await PATCH(fakeRequest({ body: "approve" }), paramsOf("co-1"));

    expect(res.status).toBe(400);
    expect(prismaMock.companyProfile.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/empresas/[id] — happy paths", () => {
  it("approve → update con APPROVED + limpia reason/suspendedAt + email APPROVED + 200", async () => {
    prismaMock.companyProfile.update.mockResolvedValue(sampleCompany);

    const res = await PATCH(
      fakeRequest({ body: { action: "approve" } }),
      paramsOf("co-1"),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.companyProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "co-1" },
        data: {
          companyStatus: "APPROVED",
          suspensionReason: null,
          suspendedAt: null,
        },
      }),
    );
    expect(mockSendCompanyStatusEmail).toHaveBeenCalledWith(
      "owner@acme.com",
      "ACME SA",
      "APPROVED",
      null,
    );
  });

  it("reject → update con REJECTED + email REJECTED + 200", async () => {
    prismaMock.companyProfile.update.mockResolvedValue({
      ...sampleCompany,
      companyStatus: "REJECTED",
    });

    const res = await PATCH(
      fakeRequest({ body: { action: "reject" } }),
      paramsOf("co-1"),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.companyProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { companyStatus: "REJECTED" },
      }),
    );
    expect(mockSendCompanyStatusEmail).toHaveBeenCalledWith(
      "owner@acme.com",
      "ACME SA",
      "REJECTED",
      null,
    );
  });

  it("suspend con reason → SUSPENDED + reason + suspendedAt + email SUSPENDED con reason", async () => {
    prismaMock.companyProfile.update.mockResolvedValue({
      ...sampleCompany,
      companyStatus: "SUSPENDED",
    });

    const res = await PATCH(
      fakeRequest({
        body: { action: "suspend", reason: "Publicaciones inapropiadas" },
      }),
      paramsOf("co-1"),
    );

    expect(res.status).toBe(200);
    const call = prismaMock.companyProfile.update.mock.calls[0]![0]!;
    const data = (call as { data: Record<string, unknown> }).data;
    expect(data.companyStatus).toBe("SUSPENDED");
    expect(data.suspensionReason).toBe("Publicaciones inapropiadas");
    expect(data.suspendedAt).toBeInstanceOf(Date);

    expect(mockSendCompanyStatusEmail).toHaveBeenCalledWith(
      "owner@acme.com",
      "ACME SA",
      "SUSPENDED",
      "Publicaciones inapropiadas",
    );
  });

  it("suspend sin reason → SUSPENDED con reason null + email con reason null", async () => {
    prismaMock.companyProfile.update.mockResolvedValue({
      ...sampleCompany,
      companyStatus: "SUSPENDED",
    });

    const res = await PATCH(
      fakeRequest({ body: { action: "suspend" } }),
      paramsOf("co-1"),
    );

    expect(res.status).toBe(200);
    const data = prismaMock.companyProfile.update.mock.calls[0]![0]!.data as {
      companyStatus: string;
      suspensionReason: string | null;
      suspendedAt: Date;
    };
    expect(data.companyStatus).toBe("SUSPENDED");
    expect(data.suspensionReason).toBeNull();
    expect(data.suspendedAt).toBeInstanceOf(Date);

    expect(mockSendCompanyStatusEmail).toHaveBeenCalledWith(
      "owner@acme.com",
      "ACME SA",
      "SUSPENDED",
      null,
    );
  });

  it("unsuspend → APPROVED + limpia reason+suspendedAt + email APPROVED", async () => {
    prismaMock.companyProfile.update.mockResolvedValue(sampleCompany);

    const res = await PATCH(
      fakeRequest({ body: { action: "unsuspend" } }),
      paramsOf("co-1"),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.companyProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          companyStatus: "APPROVED",
          suspensionReason: null,
          suspendedAt: null,
        },
      }),
    );
    expect(mockSendCompanyStatusEmail).toHaveBeenCalledWith(
      "owner@acme.com",
      "ACME SA",
      "APPROVED",
      null,
    );
  });

  it("reopen → PENDING + limpia reason/suspendedAt + SIN email", async () => {
    prismaMock.companyProfile.update.mockResolvedValue({
      ...sampleCompany,
      companyStatus: "PENDING",
    });

    const res = await PATCH(
      fakeRequest({ body: { action: "reopen" } }),
      paramsOf("co-1"),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.companyProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          companyStatus: "PENDING",
          suspensionReason: null,
          suspendedAt: null,
        },
      }),
    );
    // reopen no manda email: status PENDING no tiene plantilla.
    expect(mockSendCompanyStatusEmail).not.toHaveBeenCalled();
  });

  it("suspend con reason demasiado largo (>500) → 400", async () => {
    const res = await PATCH(
      fakeRequest({
        body: { action: "suspend", reason: "x".repeat(501) },
      }),
      paramsOf("co-1"),
    );

    expect(res.status).toBe(400);
    expect(prismaMock.companyProfile.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/empresas/[id] — error handling (#B2)", () => {
  it("P2025 (RecordNotFound) → 404 'Empresa no encontrada' + NO email", async () => {
    const notFound = new Prisma.PrismaClientKnownRequestError(
      "Record not found",
      { code: "P2025", clientVersion: "test" },
    );
    prismaMock.companyProfile.update.mockRejectedValue(notFound);

    const res = await PATCH(fakeRequest(), paramsOf("nope"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/no encontrada/i);
    expect(mockSendCompanyStatusEmail).not.toHaveBeenCalled();
  });

  it("otro error de DB → 500 + NO email + Sentry tagged como route, no mail", async () => {
    const dbErr = new Error("connection lost");
    prismaMock.companyProfile.update.mockRejectedValue(dbErr);

    const res = await PATCH(fakeRequest(), paramsOf("co-1"));

    expect(res.status).toBe(500);
    expect(mockSendCompanyStatusEmail).not.toHaveBeenCalled();
    // El catch outer reporta el error a Sentry con tag route (no mail) para
    // que los 500 del endpoint queden observables, sin confundirse con fallas
    // de email.
    expect(mockSentryCaptureException).toHaveBeenCalledWith(dbErr, {
      tags: { route: "admin.empresas.PATCH" },
    });
    expect(mockSentryCaptureException).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tags: { mail: "company_status" } }),
    );
  });
});

describe("PATCH /api/admin/empresas/[id] — mail failure → Sentry (#B3)", () => {
  it("email falla → Sentry.captureException con tag mail=company_status y extra empresaId/newStatus", async () => {
    prismaMock.companyProfile.update.mockResolvedValue(sampleCompany);
    const mailErr = new Error("brevo timeout");
    mockSendCompanyStatusEmail.mockRejectedValue(mailErr);

    const res = await PATCH(
      fakeRequest({ body: { action: "approve" } }),
      paramsOf("co-42"),
    );

    expect(res.status).toBe(200);

    // El catch del mail es async — esperar al microtask queue
    await new Promise((r) => setImmediate(r));

    expect(mockSentryCaptureException).toHaveBeenCalledTimes(1);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(mailErr, {
      tags: { mail: "company_status" },
      extra: { empresaId: "co-42", newStatus: "APPROVED" },
    });
  });

  it("email OK → NO se llama Sentry.captureException", async () => {
    prismaMock.companyProfile.update.mockResolvedValue(sampleCompany);
    mockSendCompanyStatusEmail.mockResolvedValue(undefined);

    await PATCH(fakeRequest(), paramsOf("co-1"));
    await new Promise((r) => setImmediate(r));

    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

const { mockRequireAuth, mockSentryCaptureException, mockGenerateEmbedding } =
  vi.hoisted(() => ({
    mockRequireAuth: vi.fn(),
    mockSentryCaptureException: vi.fn(),
    mockGenerateEmbedding: vi.fn(),
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

import { GET, PUT, PATCH, DELETE } from "@/app/api/internships/[id]/route";

interface FakeReqInit {
  body?: unknown;
  jsonThrows?: boolean;
}

function fakeRequest({
  body = {},
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

const companyAuth = {
  session: { user: { email: "owner@acme.com" } },
  user: { id: "user-1", role: "COMPANY", email: "owner@acme.com" },
};

beforeEach(() => {
  resetPrismaMock();
  mockRequireAuth.mockReset();
  mockSentryCaptureException.mockReset();
  mockGenerateEmbedding.mockReset();

  mockRequireAuth.mockResolvedValue(companyAuth);
  mockGenerateEmbedding.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// GET /api/internships/[id] — el filtro vive en el service (ver service test)
// ---------------------------------------------------------------------------
describe("GET /api/internships/[id]", () => {
  it("404 cuando el service devuelve null (filtrado por isActive/APPROVED)", async () => {
    prismaMock.internship.findFirst.mockResolvedValue(null);

    const res = await GET(fakeRequest(), paramsOf("int-soft-deleted"));

    expect(res.status).toBe(404);
  });

  it("200 con la práctica cuando existe y pasa filtros", async () => {
    prismaMock.internship.findFirst.mockResolvedValue({ id: "int-1" });

    const res = await GET(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/internships/[id] — Zod (#E2) + error mapping (#E3)
// ---------------------------------------------------------------------------
describe("PATCH /api/internships/[id] — body validation (#E2)", () => {
  it("body que falla json parse → 400 sin tocar DB", async () => {
    const res = await PATCH(
      fakeRequest({ jsonThrows: true }),
      paramsOf("int-1"),
    );

    expect(res.status).toBe(400);
    expect(prismaMock.internship.update).not.toHaveBeenCalled();
  });

  it("body sin isActive → 400", async () => {
    const res = await PATCH(fakeRequest({ body: {} }), paramsOf("int-1"));

    expect(res.status).toBe(400);
    expect(prismaMock.internship.update).not.toHaveBeenCalled();
  });

  it("isActive como string → 400", async () => {
    const res = await PATCH(
      fakeRequest({ body: { isActive: "true" } }),
      paramsOf("int-1"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Datos inválidos");
    expect(Array.isArray(body.details)).toBe(true);
    expect(prismaMock.internship.update).not.toHaveBeenCalled();
  });

  it("isActive como null → 400", async () => {
    const res = await PATCH(
      fakeRequest({ body: { isActive: null } }),
      paramsOf("int-1"),
    );

    expect(res.status).toBe(400);
    expect(prismaMock.internship.update).not.toHaveBeenCalled();
  });

  it("isActive boolean válido → 200", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue({ id: "int-1" });
    prismaMock.internship.update.mockResolvedValue({
      id: "int-1",
      isActive: false,
    });

    const res = await PATCH(
      fakeRequest({ body: { isActive: false } }),
      paramsOf("int-1"),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.internship.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });
});

describe("PATCH /api/internships/[id] — error mapping (#E3)", () => {
  it("'Not found or not authorized' → 404, NO leak detalles, NO Sentry", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue(null);

    const res = await PATCH(
      fakeRequest({ body: { isActive: true } }),
      paramsOf("int-other"),
    );

    expect(res.status).toBe(404);
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it("error inesperado de DB → 500 genérico, NO leak mensaje, SÍ Sentry", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue({ id: "int-1" });
    const dbErr = new Error(
      'PrismaClientKnownRequestError: column "foo" does not exist on table "internship"',
    );
    prismaMock.internship.update.mockRejectedValue(dbErr);

    const res = await PATCH(
      fakeRequest({ body: { isActive: true } }),
      paramsOf("int-1"),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Error interno del servidor");
    expect(body.error).not.toMatch(/PrismaClient/i);
    expect(body.error).not.toMatch(/column/i);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(dbErr);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/internships/[id] — error mapping (#E3)
// ---------------------------------------------------------------------------
describe("PUT /api/internships/[id] — error mapping (#E3)", () => {
  it("'Not found or not authorized' → 404 + NO Sentry", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue(null);

    const res = await PUT(
      fakeRequest({ body: { title: "Nuevo título largo" } }),
      paramsOf("int-other"),
    );

    expect(res.status).toBe(404);
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it("Zod error en body → 400", async () => {
    const res = await PUT(
      fakeRequest({ body: { title: "x" } }), // min 3
      paramsOf("int-1"),
    );

    expect(res.status).toBe(400);
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it("error inesperado → 500 genérico + Sentry", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue({ id: "int-1" });
    const dbErr = new Error("internal pg pool exhausted");
    prismaMock.internship.update.mockRejectedValue(dbErr);

    const res = await PUT(
      fakeRequest({ body: { title: "Practicante backend" } }),
      paramsOf("int-1"),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Error interno del servidor");
    expect(body.error).not.toMatch(/pg pool/i);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(dbErr);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/internships/[id] — error mapping (#E3)
// ---------------------------------------------------------------------------
describe("DELETE /api/internships/[id] — error mapping (#E3)", () => {
  it("'Not found or not authorized' → 404 + NO Sentry", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue(null);

    const res = await DELETE(fakeRequest(), paramsOf("int-other"));

    expect(res.status).toBe(404);
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it("error inesperado → 500 genérico + Sentry", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue({ id: "int-1" });
    const dbErr = new Error("DEADLOCK_DETECTED on internship table");
    prismaMock.internship.update.mockRejectedValue(dbErr);

    const res = await DELETE(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Error interno del servidor");
    expect(body.error).not.toMatch(/deadlock/i);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(dbErr);
  });
});

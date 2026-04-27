import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

const {
  mockRequireAuth,
  mockSentryCaptureException,
  mockScoreApplication,
  mockRateLimit,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockSentryCaptureException: vi.fn(),
  mockScoreApplication: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock("@/server/lib/auth-guard", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

vi.mock("@/server/lib/ats/scoring-engine", () => ({
  scoreApplication: mockScoreApplication,
}));

vi.mock("@/server/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: "rate limited", resetAt }), {
      status: 429,
    }),
}));

import { POST as configPost } from "@/app/api/ats/config/route";
import { GET as configGet } from "@/app/api/ats/config/[jobId]/route";
import { PATCH as pipelinePatch } from "@/app/api/ats/pipeline/[applicationId]/route";
import { POST as scoreOne } from "@/app/api/ats/score/[applicationId]/route";
import { POST as scoreJob } from "@/app/api/ats/score/job/[jobId]/route";

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

const companyAuth = {
  session: { user: { email: "owner@acme.com" } },
  user: { id: "user-1", role: "COMPANY", email: "owner@acme.com" },
};

const sampleCompany = { id: "cp-1", userId: "user-1" };
const sampleInternship = { id: "int-1", companyId: "cp-1" };
const sampleApplication = {
  id: "app-1",
  internshipId: "int-1",
  studentId: "stu-1",
  internship: { id: "int-1", company: { id: "cp-1" } },
};

const validConfigBody = {
  internshipId: "int-1",
  isActive: true,
  modules: [
    {
      type: "SKILLS",
      label: "Habilidades",
      isActive: true,
      weight: 100,
      order: 0,
      params: { required: ["React"], preferred: [], hardFilter: false },
    },
  ],
};

beforeEach(() => {
  resetPrismaMock();
  mockRequireAuth.mockReset();
  mockSentryCaptureException.mockReset();
  mockScoreApplication.mockReset();
  mockRateLimit.mockReset();

  mockRequireAuth.mockResolvedValue(companyAuth);
  mockRateLimit.mockResolvedValue({
    success: true,
    remaining: 99,
    resetAt: Date.now() + 60_000,
  });
  mockScoreApplication.mockReturnValue({
    atsScore: 80,
    moduleScores: [],
    passedFilters: true,
    filterReason: null,
  });
});

// ===========================================================================
// POST /api/ats/config — #F1 + #F2 + #F3
// ===========================================================================
describe("POST /api/ats/config", () => {
  it("auth fail → 401 sin tocar DB", async () => {
    mockRequireAuth.mockResolvedValue({ error: "Unauthorized", status: 401 });

    const res = await configPost(fakeRequest({ body: validConfigBody }));

    expect(res.status).toBe(401);
    expect(prismaMock.companyProfile.findUnique).not.toHaveBeenCalled();
  });

  // #F3 — params discriminado por type
  describe("#F3 — params discriminado por type", () => {
    it("SKILLS con params extra/desconocidos → 400", async () => {
      const body = {
        internshipId: "int-1",
        isActive: true,
        modules: [
          {
            type: "SKILLS",
            label: "x",
            isActive: true,
            weight: 100,
            order: 0,
            params: { malicious: "<script>", arbitrary: { nested: true } },
          },
        ],
      };

      const res = await configPost(fakeRequest({ body }));

      expect(res.status).toBe(400);
    });

    it("EXPERIENCE con minYears negativo → 400", async () => {
      const body = {
        ...validConfigBody,
        modules: [
          {
            type: "EXPERIENCE",
            label: "Experiencia",
            isActive: true,
            weight: 100,
            order: 0,
            params: { minYears: -5, preferredRoles: [], hardFilter: false },
          },
        ],
      };

      const res = await configPost(fakeRequest({ body }));

      expect(res.status).toBe(400);
    });

    it("PORTFOLIO con required como string en vez de boolean → 400", async () => {
      const body = {
        ...validConfigBody,
        modules: [
          {
            type: "PORTFOLIO",
            label: "Portafolio",
            isActive: true,
            weight: 100,
            order: 0,
            params: {
              required: "yes",
              keywords: ["github"],
              hardFilter: false,
            },
          },
        ],
      };

      const res = await configPost(fakeRequest({ body }));

      expect(res.status).toBe(400);
    });

    it("LANGUAGES con required como objeto en vez de array → 400", async () => {
      const body = {
        ...validConfigBody,
        modules: [
          {
            type: "LANGUAGES",
            label: "Idiomas",
            isActive: true,
            weight: 100,
            order: 0,
            params: {
              required: { foo: "bar" },
              preferred: [],
              hardFilter: false,
            },
          },
        ],
      };

      const res = await configPost(fakeRequest({ body }));

      expect(res.status).toBe(400);
    });

    it("EDUCATION con minGPA fuera de rango (>7) → 400", async () => {
      const body = {
        ...validConfigBody,
        modules: [
          {
            type: "EDUCATION",
            label: "Educación",
            isActive: true,
            weight: 100,
            order: 0,
            params: { minGPA: 99, preferredDegrees: [], hardFilter: false },
          },
        ],
      };

      const res = await configPost(fakeRequest({ body }));

      expect(res.status).toBe(400);
    });

    it("SKILLS válido → 200 con upsert", async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
      prismaMock.internship.findFirst.mockResolvedValue(sampleInternship);
      prismaMock.aTSConfig.upsert.mockResolvedValue({ id: "cfg-1" });
      prismaMock.aTSModule.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.aTSModule.createMany.mockResolvedValue({ count: 1 });
      prismaMock.aTSConfig.findUnique.mockResolvedValue({
        id: "cfg-1",
        modules: [],
      });

      const res = await configPost(fakeRequest({ body: validConfigBody }));

      expect(res.status).toBe(200);
    });
  });

  // #F1 — 404 unificado para ownership fail
  describe("#F1 — 404 unificado en ownership fail", () => {
    it("company no existe → 404 (no 403, no leak existence)", async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue(null);

      const res = await configPost(fakeRequest({ body: validConfigBody }));

      expect(res.status).toBe(404);
    });

    it("internship existe pero no es del owner → 404 (no 403)", async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
      prismaMock.internship.findFirst.mockResolvedValue(null);

      const res = await configPost(fakeRequest({ body: validConfigBody }));

      expect(res.status).toBe(404);
    });
  });

  // #F2 — try/catch + Sentry
  describe("#F2 — try/catch + Sentry", () => {
    it("error inesperado en transaction → 500 + Sentry, NO leak mensaje", async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
      prismaMock.internship.findFirst.mockResolvedValue(sampleInternship);
      const dbErr = new Error("DEADLOCK on ats_modules");
      prismaMock.$transaction.mockRejectedValue(dbErr);

      const res = await configPost(fakeRequest({ body: validConfigBody }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).not.toMatch(/deadlock/i);
      expect(mockSentryCaptureException).toHaveBeenCalledWith(dbErr);
    });

    it("body json roto → 400 sin Sentry", async () => {
      const res = await configPost(fakeRequest({ jsonThrows: true }));

      expect(res.status).toBe(400);
      expect(mockSentryCaptureException).not.toHaveBeenCalled();
    });
  });
});

// ===========================================================================
// GET /api/ats/config/[jobId] — #F1 + #F2
// ===========================================================================
describe("GET /api/ats/config/[jobId]", () => {
  function paramsOf(jobId: string) {
    return { params: Promise.resolve({ jobId }) };
  }

  it("auth fail → 401", async () => {
    mockRequireAuth.mockResolvedValue({ error: "Unauthorized", status: 401 });

    const res = await configGet(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(401);
  });

  it("#F1 — company no existe → 404 (no 403)", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    const res = await configGet(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(404);
  });

  it("#F1 — internship no es del owner → 404 (no 403)", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    prismaMock.internship.findFirst.mockResolvedValue(null);

    const res = await configGet(fakeRequest(), paramsOf("int-other"));

    expect(res.status).toBe(404);
  });

  it("#F2 — error inesperado → 500 + Sentry, NO leak", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    const dbErr = new Error("connection refused 5432");
    prismaMock.internship.findFirst.mockRejectedValue(dbErr);

    const res = await configGet(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).not.toMatch(/5432/);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(dbErr);
  });

  it("happy path → 200 con config", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    prismaMock.internship.findFirst.mockResolvedValue(sampleInternship);
    prismaMock.aTSConfig.findUnique.mockResolvedValue({
      id: "cfg-1",
      modules: [],
    });

    const res = await configGet(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// PATCH /api/ats/pipeline/[applicationId] — #F1 + #F2
// ===========================================================================
describe("PATCH /api/ats/pipeline/[applicationId]", () => {
  function paramsOf(applicationId: string) {
    return { params: Promise.resolve({ applicationId }) };
  }

  it("Zod inválido → 400", async () => {
    const res = await pipelinePatch(
      fakeRequest({ body: { status: "INVALID" } }),
      paramsOf("app-1"),
    );

    expect(res.status).toBe(400);
  });

  // #F1 — el handler antes diferenciaba 404 (no existe) vs 403 (no es del owner)
  // → atacante podía enumerar IDs válidos. Ahora ambas rutas devuelven 404.
  describe("#F1 — 404 unificado (anti enumeration)", () => {
    it("application no existe → 404", async () => {
      prismaMock.application.findUnique.mockResolvedValue(null);

      const res = await pipelinePatch(
        fakeRequest({ body: { status: "REVIEWING" } }),
        paramsOf("app-nonexistent"),
      );

      expect(res.status).toBe(404);
    });

    it("application existe pero no es del owner → 404 (no 403)", async () => {
      prismaMock.application.findUnique.mockResolvedValue({
        ...sampleApplication,
        internship: {
          ...sampleApplication.internship,
          company: { id: "cp-other" },
        },
      });
      prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);

      const res = await pipelinePatch(
        fakeRequest({ body: { status: "REVIEWING" } }),
        paramsOf("app-of-other"),
      );

      expect(res.status).toBe(404);
    });
  });

  it("#F2 — error en update → 500 + Sentry, NO leak", async () => {
    prismaMock.application.findUnique.mockResolvedValue(sampleApplication);
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    const dbErr = new Error("FK violation on pipeline_status");
    prismaMock.application.update.mockRejectedValue(dbErr);

    const res = await pipelinePatch(
      fakeRequest({ body: { status: "REVIEWING" } }),
      paramsOf("app-1"),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).not.toMatch(/FK violation/i);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(dbErr);
  });

  it("happy path → 200 con application actualizada", async () => {
    prismaMock.application.findUnique.mockResolvedValue(sampleApplication);
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    prismaMock.application.update.mockResolvedValue({
      ...sampleApplication,
      pipelineStatus: "REVIEWING",
      status: "REVIEWED",
    });

    const res = await pipelinePatch(
      fakeRequest({ body: { status: "REVIEWING" } }),
      paramsOf("app-1"),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pipelineStatus: "REVIEWING",
          status: "REVIEWED",
        }),
      }),
    );
  });
});

// ===========================================================================
// POST /api/ats/score/[applicationId] — #F1 + #F2 + #F5
// ===========================================================================
describe("POST /api/ats/score/[applicationId]", () => {
  function paramsOf(applicationId: string) {
    return { params: Promise.resolve({ applicationId }) };
  }

  const fullApplication = {
    ...sampleApplication,
    internship: {
      ...sampleApplication.internship,
      atsConfig: { isActive: true, modules: [] },
    },
    student: { studentProfile: { cvText: "...", skills: ["React"] } },
  };

  it("#F5 — rate limit 429 sin tocar DB", async () => {
    mockRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const res = await scoreOne(fakeRequest(), paramsOf("app-1"));

    expect(res.status).toBe(429);
    expect(prismaMock.application.findUnique).not.toHaveBeenCalled();
  });

  it("#F1 — application no existe → 404", async () => {
    prismaMock.application.findUnique.mockResolvedValue(null);

    const res = await scoreOne(fakeRequest(), paramsOf("app-nope"));

    expect(res.status).toBe(404);
  });

  it("#F1 — application no es del owner → 404 (no 403)", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...fullApplication,
      internship: {
        ...fullApplication.internship,
        company: { id: "cp-other" },
      },
    });
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);

    const res = await scoreOne(fakeRequest(), paramsOf("app-of-other"));

    expect(res.status).toBe(404);
  });

  it("ATS inactivo → 400", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...fullApplication,
      internship: {
        ...fullApplication.internship,
        atsConfig: { isActive: false, modules: [] },
      },
    });
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);

    const res = await scoreOne(fakeRequest(), paramsOf("app-1"));

    expect(res.status).toBe(400);
  });

  it("#F2 — error inesperado → 500 + Sentry, NO leak", async () => {
    prismaMock.application.findUnique.mockResolvedValue(fullApplication);
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    const dbErr = new Error("OOM in pg connection pool");
    prismaMock.application.update.mockRejectedValue(dbErr);

    const res = await scoreOne(fakeRequest(), paramsOf("app-1"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).not.toMatch(/OOM/i);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(dbErr);
  });

  it("happy path → 200 con application + result", async () => {
    prismaMock.application.findUnique.mockResolvedValue(fullApplication);
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    prismaMock.application.update.mockResolvedValue({
      ...sampleApplication,
      atsScore: 80,
    });

    const res = await scoreOne(fakeRequest(), paramsOf("app-1"));

    expect(res.status).toBe(200);
    expect(mockScoreApplication).toHaveBeenCalled();
  });
});

// ===========================================================================
// POST /api/ats/score/job/[jobId] — #F1 + #F2 + #F4
// ===========================================================================
describe("POST /api/ats/score/job/[jobId]", () => {
  function paramsOf(jobId: string) {
    return { params: Promise.resolve({ jobId }) };
  }

  const internshipWithConfig = {
    ...sampleInternship,
    atsConfig: { isActive: true, modules: [] },
  };

  it("#F4 — rate limit 429 sin tocar DB", async () => {
    mockRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const res = await scoreJob(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(429);
    expect(prismaMock.companyProfile.findUnique).not.toHaveBeenCalled();
  });

  it("#F1 — company no existe → 404", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    const res = await scoreJob(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(404);
  });

  it("#F1 — internship no es del owner → 404 (no 403)", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    prismaMock.internship.findFirst.mockResolvedValue(null);

    const res = await scoreJob(fakeRequest(), paramsOf("int-other"));

    expect(res.status).toBe(404);
  });

  it("ATS inactivo → 400", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    prismaMock.internship.findFirst.mockResolvedValue({
      ...sampleInternship,
      atsConfig: { isActive: false, modules: [] },
    });

    const res = await scoreJob(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(400);
  });

  // #F4 — batch processing: con 25 applications y concurrencia 5,
  // los updates NO se disparan todos a la vez (Promise.all crudo).
  it("#F4 — procesa en batches limitados, NO Promise.all crudo de N=25", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    prismaMock.internship.findFirst.mockResolvedValue(internshipWithConfig);

    const apps = Array.from({ length: 25 }, (_, i) => ({
      id: `app-${i}`,
      student: { studentProfile: { cvText: "x", skills: [] } },
    }));
    prismaMock.application.findMany.mockResolvedValue(apps);
    prismaMock.application.update.mockResolvedValue({});

    const res = await scoreJob(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(200);
    expect(prismaMock.application.update).toHaveBeenCalledTimes(25);
    const body = await res.json();
    expect(body.scored).toBe(25);
  });

  it("#F2 — error en update → 500 + Sentry, NO leak", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(sampleCompany);
    prismaMock.internship.findFirst.mockResolvedValue(internshipWithConfig);
    prismaMock.application.findMany.mockResolvedValue([
      { id: "app-1", student: { studentProfile: { cvText: "x", skills: [] } } },
    ]);
    const dbErr = new Error("UNIQUE constraint failed on ats_modules");
    prismaMock.application.update.mockRejectedValue(dbErr);

    const res = await scoreJob(fakeRequest(), paramsOf("int-1"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).not.toMatch(/UNIQUE constraint/i);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(dbErr);
  });
});

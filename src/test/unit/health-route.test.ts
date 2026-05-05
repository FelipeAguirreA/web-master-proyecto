import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

const { mockSentryCaptureMessage } = vi.hoisted(() => ({
  mockSentryCaptureMessage: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mockSentryCaptureMessage,
}));

import { GET as healthGet } from "@/app/api/health/route";

beforeEach(() => {
  resetPrismaMock();
  mockSentryCaptureMessage.mockReset();
});

describe("GET /api/health", () => {
  it("200 ok cuando la DB responde al ping", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await healthGet();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.services.database).toBe("ok");
    expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
  });

  it("503 degraded cuando la DB falla — Sentry recibe captureMessage con level=error (#L1)", async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(
      new Error("Connection refused: pgbouncer down"),
    );

    const res = await healthGet();
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.status).toBe("degraded");
    expect(json.services.database).toBe("error");
    expect(mockSentryCaptureMessage).toHaveBeenCalledOnce();
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Health check: DB ping failed",
      expect.objectContaining({
        level: "error",
        tags: { health: "db_down" },
      }),
    );
  });

  it("incluye timestamp ISO y version en la response", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await healthGet();
    const json = await res.json();

    expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof json.services.version).toBe("string");
    // Sanity: la versión sigue el formato semver del bump del audit (1.10.x)
    expect(json.services.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("Sentry recibe el mensaje original del error en el extra (no leak al cliente)", async () => {
    const dbErr = new Error(
      "FATAL: terminating connection due to admin command",
    );
    prismaMock.$queryRaw.mockRejectedValueOnce(dbErr);

    const res = await healthGet();
    const json = await res.json();

    // Cliente: sin leak del error crudo
    expect(JSON.stringify(json)).not.toContain("FATAL:");
    expect(JSON.stringify(json)).not.toContain("admin command");

    // Sentry: SÍ recibe el detalle para debugging
    const callArgs = mockSentryCaptureMessage.mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      extra: expect.objectContaining({
        error: expect.stringContaining("FATAL"),
      }),
    });
  });

  it("captura el error como string también si el throw no es Error instance", async () => {
    // Algunos drivers tiran strings o objetos custom — el handler debe ser robusto
    prismaMock.$queryRaw.mockRejectedValueOnce("string error from driver");

    const res = await healthGet();

    expect(res.status).toBe(503);
    expect(mockSentryCaptureMessage).toHaveBeenCalledOnce();
    const callArgs = mockSentryCaptureMessage.mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      extra: { error: "string error from driver" },
    });
  });
});

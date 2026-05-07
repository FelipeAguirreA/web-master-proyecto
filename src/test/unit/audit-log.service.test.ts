import { describe, it, expect, beforeEach, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/mocks/prisma";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { logEvent, AuditAction } from "@/server/services/audit-log.service";
import * as Sentry from "@sentry/nextjs";

const sentryCaptureMock = vi.mocked(Sentry.captureException);

beforeEach(() => {
  resetPrismaMock();
  sentryCaptureMock.mockReset();
});

describe("logEvent — happy paths", () => {
  it("persiste un evento ACCOUNT_DELETED con userId", async () => {
    prismaMock.auditLog.create.mockResolvedValue({ id: "log-1" });

    await logEvent({
      userId: "user-1",
      action: AuditAction.ACCOUNT_DELETED,
      requestId: "req-abc",
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "ACCOUNT_DELETED",
        requestId: "req-abc",
        targetType: null,
        targetId: null,
      }),
    });
  });

  it("persiste DATA_EXPORTED con metadata", async () => {
    prismaMock.auditLog.create.mockResolvedValue({ id: "log-2" });

    await logEvent({
      userId: "user-1",
      action: AuditAction.DATA_EXPORTED,
      metadata: { byteLength: 12345, ip_hash: "abcd" },
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DATA_EXPORTED",
        metadata: { byteLength: 12345, ip_hash: "abcd" },
      }),
    });
  });

  it("permite userId=null para eventos del sistema", async () => {
    prismaMock.auditLog.create.mockResolvedValue({ id: "log-3" });

    await logEvent({
      userId: null,
      action: AuditAction.COMPANY_APPROVED,
      targetType: "Company",
      targetId: "company-1",
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        targetType: "Company",
        targetId: "company-1",
      }),
    });
  });
});

describe("logEvent — resilience", () => {
  it("NO bloquea el flujo si prisma.auditLog.create falla", async () => {
    prismaMock.auditLog.create.mockRejectedValue(new Error("DB offline"));

    // No debería throw
    await expect(
      logEvent({ userId: "user-1", action: AuditAction.ACCOUNT_DELETED }),
    ).resolves.toBeUndefined();
  });

  it("captura el error a Sentry con tags y extra", async () => {
    prismaMock.auditLog.create.mockRejectedValue(new Error("DB offline"));

    await logEvent({
      userId: "user-99",
      action: AuditAction.DATA_EXPORTED,
      requestId: "req-xyz",
    });

    expect(sentryCaptureMock).toHaveBeenCalledTimes(1);
    const call = sentryCaptureMock.mock.calls[0];
    expect((call[0] as Error).message).toBe("DB offline");
    expect(call[1]).toEqual(
      expect.objectContaining({
        tags: { audit: "log_failed", action: "DATA_EXPORTED" },
        extra: { userId: "user-99", requestId: "req-xyz" },
      }),
    );
  });
});

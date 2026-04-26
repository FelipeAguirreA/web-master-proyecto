import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";
import {
  issueRefreshToken,
  validateAndRotate,
  revokeRefreshToken,
  revokeAllForUser,
  REFRESH_TOKEN_TTL_MS,
  __testing,
} from "@/server/services/refresh-tokens.service";

beforeEach(() => {
  resetPrismaMock();
});

describe("issueRefreshToken", () => {
  it("genera raw de 64 hex chars y persiste el hash SHA-256", async () => {
    prismaMock.refreshToken.create.mockResolvedValue({ id: "rt-1" });
    const before = Date.now();

    const result = await issueRefreshToken("u-1");

    expect(result.id).toBe("rt-1");
    expect(result.rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + REFRESH_TOKEN_TTL_MS - 50,
    );
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: "u-1",
        tokenHash: __testing.hashToken(result.rawToken),
        expiresAt: expect.any(Date),
      },
      select: { id: true },
    });
  });

  it("nunca persiste el raw token, solo el hash", async () => {
    prismaMock.refreshToken.create.mockResolvedValue({ id: "rt-2" });

    const result = await issueRefreshToken("u-2");
    const callArg = prismaMock.refreshToken.create.mock.calls[0][0];

    expect(JSON.stringify(callArg)).not.toContain(result.rawToken);
  });

  it("dos llamadas seguidas generan raw tokens distintos", async () => {
    prismaMock.refreshToken.create
      .mockResolvedValueOnce({ id: "a" })
      .mockResolvedValueOnce({ id: "b" });

    const a = await issueRefreshToken("u");
    const b = await issueRefreshToken("u");

    expect(a.rawToken).not.toBe(b.rawToken);
  });
});

describe("validateAndRotate — invalid", () => {
  it("retorna invalid si rawToken es vacío", async () => {
    const result = await validateAndRotate("");
    expect(result).toEqual({ kind: "invalid" });
    expect(prismaMock.refreshToken.findUnique).not.toHaveBeenCalled();
  });

  it("retorna invalid si el hash no existe en DB", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue(null);

    const result = await validateAndRotate("a".repeat(64));
    expect(result).toEqual({ kind: "invalid" });
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it("retorna invalid si el token expiró", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-old",
      userId: "u-1",
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    });

    const result = await validateAndRotate("a".repeat(64));
    expect(result).toEqual({ kind: "invalid" });
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });
});

describe("validateAndRotate — reuse detection", () => {
  it("revoca todos los refresh del user cuando se usa un revocado", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-old",
      userId: "u-victim",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(Date.now() - 1000),
    });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 3 });

    const result = await validateAndRotate("a".repeat(64));

    expect(result).toEqual({ kind: "reuse-detected", userId: "u-victim" });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u-victim", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });
});

describe("validateAndRotate — happy path (rotación)", () => {
  it("emite nuevo refresh y marca el viejo como revocado con replacedBy", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-old",
      userId: "u-1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: "rt-new" });
    prismaMock.refreshToken.update.mockResolvedValue({ id: "rt-old" });

    const result = await validateAndRotate("a".repeat(64));

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.token.userId).toBe("u-1");
    expect(result.token.rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: "u-1",
        tokenHash: __testing.hashToken(result.token.rawToken),
        expiresAt: expect.any(Date),
      },
      select: { id: true },
    });
    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
      where: { id: "rt-old" },
      data: { revokedAt: expect.any(Date), replacedBy: "rt-new" },
    });
  });

  it("el nuevo expira a TTL desde ahora", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-old",
      userId: "u-1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: "rt-new" });
    prismaMock.refreshToken.update.mockResolvedValue({ id: "rt-old" });
    const before = Date.now();

    const result = await validateAndRotate("a".repeat(64));

    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.token.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + REFRESH_TOKEN_TTL_MS - 50,
    );
  });

  it("dos rotaciones seguidas generan raw tokens distintos", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-old",
      userId: "u-1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    prismaMock.refreshToken.create
      .mockResolvedValueOnce({ id: "rt-a" })
      .mockResolvedValueOnce({ id: "rt-b" });
    prismaMock.refreshToken.update.mockResolvedValue({ id: "rt-old" });

    const a = await validateAndRotate("a".repeat(64));
    const b = await validateAndRotate("a".repeat(64));

    if (a.kind !== "ok" || b.kind !== "ok") throw new Error("expected ok");
    expect(a.token.rawToken).not.toBe(b.token.rawToken);
  });
});

describe("revokeRefreshToken (logout)", () => {
  it("marca como revocado el token activo correspondiente al hash", async () => {
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await revokeRefreshToken("a".repeat(64));

    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: __testing.hashToken("a".repeat(64)),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("noop si rawToken vacío", async () => {
    await revokeRefreshToken("");
    expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("idempotente: si ya estaba revocado, updateMany no encuentra match", async () => {
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(revokeRefreshToken("a".repeat(64))).resolves.toBeUndefined();
  });
});

describe("revokeAllForUser", () => {
  it("revoca solo los activos del user", async () => {
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 5 });

    await revokeAllForUser("u-1");

    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe("__testing.hashToken", () => {
  it("es determinístico (mismo input → mismo hash)", () => {
    expect(__testing.hashToken("abc")).toBe(__testing.hashToken("abc"));
  });

  it("inputs distintos producen hashes distintos", () => {
    expect(__testing.hashToken("a")).not.toBe(__testing.hashToken("b"));
  });

  it("retorna 64 hex chars (SHA-256)", () => {
    expect(__testing.hashToken("anything")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("__testing.generateRawToken", () => {
  it("retorna 64 hex chars (32 bytes random)", () => {
    expect(__testing.generateRawToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("dos llamadas dan tokens distintos", () => {
    expect(__testing.generateRawToken()).not.toBe(__testing.generateRawToken());
  });
});

// Sanity: usar vi para evitar el "vi imported but not used" en algún ambiente.
vi.fn();

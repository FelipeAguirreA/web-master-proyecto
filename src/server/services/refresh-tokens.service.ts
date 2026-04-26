import { createHash, randomBytes } from "crypto";
import { prisma } from "@/server/lib/db";

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface IssuedRefreshToken {
  id: string;
  rawToken: string;
  expiresAt: Date;
}

export interface RotatedRefreshToken {
  userId: string;
  rawToken: string;
  expiresAt: Date;
}

export type RotationResult =
  | { kind: "ok"; token: RotatedRefreshToken }
  | { kind: "invalid" }
  | { kind: "reuse-detected"; userId: string };

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export async function issueRefreshToken(
  userId: string,
): Promise<IssuedRefreshToken> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const created = await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
    select: { id: true },
  });

  return { id: created.id, rawToken, expiresAt };
}

export async function validateAndRotate(
  rawToken: string,
): Promise<RotationResult> {
  if (!rawToken) return { kind: "invalid" };

  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!existing) return { kind: "invalid" };

  // Reuse detection: usar un refresh ya revocado indica compromiso.
  // Revocamos todos los refresh activos del user (kick global).
  if (existing.revokedAt !== null) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { kind: "reuse-detected", userId: existing.userId };
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    return { kind: "invalid" };
  }

  // Rotación: emitir nuevo y marcar el viejo como revocado con replacedBy.
  const newRaw = generateRawToken();
  const newHash = hashToken(newRaw);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const newToken = await prisma.refreshToken.create({
    data: {
      userId: existing.userId,
      tokenHash: newHash,
      expiresAt: newExpiresAt,
    },
    select: { id: true },
  });

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), replacedBy: newToken.id },
  });

  return {
    kind: "ok",
    token: {
      userId: existing.userId,
      rawToken: newRaw,
      expiresAt: newExpiresAt,
    },
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export const __testing = { hashToken, generateRawToken };

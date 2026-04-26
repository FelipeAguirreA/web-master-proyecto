import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

const { mockEncode } = vi.hoisted(() => ({
  mockEncode: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({
  encode: mockEncode,
}));

import { buildJwtPayload, encodeAccessJwt } from "@/server/lib/auth-jwt";
import { ACCESS_TOKEN_MAX_AGE_S } from "@/server/lib/auth-cookies";

beforeEach(() => {
  resetPrismaMock();
  mockEncode.mockReset();
});

describe("buildJwtPayload — STUDENT", () => {
  it("incluye registrationCompleted=true cuando STUDENT tiene rut", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      email: "stu@example.com",
      name: "Estudiante",
      image: "https://x/x.png",
      role: "STUDENT",
      rut: "12345678-9",
    });

    const payload = await buildJwtPayload("u-1");

    expect(payload).toEqual({
      sub: "u-1",
      id: "u-1",
      email: "stu@example.com",
      name: "Estudiante",
      picture: "https://x/x.png",
      role: "STUDENT",
      registrationCompleted: true,
    });
  });

  it("registrationCompleted=false cuando STUDENT no tiene rut", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-2",
      email: "stu@x.com",
      name: "S",
      image: null,
      role: "STUDENT",
      rut: null,
    });

    const payload = await buildJwtPayload("u-2");
    expect(payload?.registrationCompleted).toBe(false);
    expect(payload?.picture).toBeNull();
  });
});

describe("buildJwtPayload — COMPANY", () => {
  it("popula companyStatus y reemplaza name con companyName si hay perfil", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-3",
      email: "emp@x.com",
      name: "Original",
      image: null,
      role: "COMPANY",
      rut: null,
    });
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      companyStatus: "APPROVED",
      companyName: "TechCorp",
    });

    const payload = await buildJwtPayload("u-3");

    expect(payload?.role).toBe("COMPANY");
    expect(payload?.companyStatus).toBe("APPROVED");
    expect(payload?.name).toBe("TechCorp");
    expect(payload?.registrationCompleted).toBe(true);
  });

  it("usa PENDING como default cuando no hay companyProfile", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-4",
      email: "emp@x.com",
      name: "Original",
      image: null,
      role: "COMPANY",
      rut: null,
    });
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    const payload = await buildJwtPayload("u-4");

    expect(payload?.companyStatus).toBe("PENDING");
    expect(payload?.name).toBe("Original");
  });

  it("mantiene name original si companyProfile no tiene companyName", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-5",
      email: "emp@x.com",
      name: "Original",
      image: null,
      role: "COMPANY",
      rut: null,
    });
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      companyStatus: "PENDING",
      companyName: null,
    });

    const payload = await buildJwtPayload("u-5");
    expect(payload?.name).toBe("Original");
  });
});

describe("buildJwtPayload — user no existe", () => {
  it("retorna null", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const payload = await buildJwtPayload("ghost");
    expect(payload).toBeNull();
  });
});

describe("encodeAccessJwt", () => {
  it("delega a next-auth/jwt encode con secret y maxAge=15min", async () => {
    mockEncode.mockResolvedValue("signed-jwt-x");

    const payload = {
      sub: "u-1",
      id: "u-1",
      email: "x@x.com",
      name: "X",
      picture: null,
      role: "STUDENT",
      registrationCompleted: true,
    };

    const jwt = await encodeAccessJwt(payload);

    expect(jwt).toBe("signed-jwt-x");
    expect(mockEncode).toHaveBeenCalledWith({
      token: payload,
      secret: expect.any(String),
      maxAge: ACCESS_TOKEN_MAX_AGE_S,
    });
  });
});

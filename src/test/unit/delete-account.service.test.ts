import { describe, it, expect, beforeEach, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/mocks/prisma";

vi.mock("@/server/lib/storage", () => ({
  removeFile: vi.fn(),
  pathFromPublicUrl: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

import { deleteAccount } from "@/server/services/delete-account.service";
import { removeFile, pathFromPublicUrl } from "@/server/lib/storage";
import * as Sentry from "@sentry/nextjs";

const removeFileMock = vi.mocked(removeFile);
const pathFromPublicUrlMock = vi.mocked(pathFromPublicUrl);
const sentryCaptureMock = vi.mocked(Sentry.captureException);

beforeEach(() => {
  resetPrismaMock();
  removeFileMock.mockReset();
  pathFromPublicUrlMock.mockReset();
  sentryCaptureMock.mockReset();
});

describe("deleteAccount — happy paths", () => {
  it("borra el user con cascade Prisma cuando NO hay CV", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      studentProfile: { cvUrl: null },
    });
    prismaMock.user.delete.mockResolvedValue({ id: "user-1" });

    await deleteAccount("user-1");

    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
    expect(removeFileMock).not.toHaveBeenCalled();
  });

  it("borra el user + el CV del Storage cuando hay cvUrl válido", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      studentProfile: {
        cvUrl:
          "https://supabase.co/storage/v1/object/public/documents/cvs/u1/cv.pdf",
      },
    });
    prismaMock.user.delete.mockResolvedValue({ id: "user-1" });
    pathFromPublicUrlMock.mockReturnValue("cvs/u1/cv.pdf");
    removeFileMock.mockResolvedValue();

    await deleteAccount("user-1");

    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
    expect(pathFromPublicUrlMock).toHaveBeenCalledWith(
      "https://supabase.co/storage/v1/object/public/documents/cvs/u1/cv.pdf",
      "documents",
    );
    expect(removeFileMock).toHaveBeenCalledWith("documents", "cvs/u1/cv.pdf");
  });

  it("borra el user para una empresa (sin studentProfile)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "company-1",
      studentProfile: null,
    });
    prismaMock.user.delete.mockResolvedValue({ id: "company-1" });

    await deleteAccount("company-1");

    expect(prismaMock.user.delete).toHaveBeenCalled();
    expect(removeFileMock).not.toHaveBeenCalled();
  });
});

describe("deleteAccount — error cases", () => {
  it("throws cuando el user no existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(deleteAccount("nonexistent")).rejects.toThrow(
      "User not found",
    );
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("NO llama removeFile cuando pathFromPublicUrl retorna null (URL no matchea bucket)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      studentProfile: { cvUrl: "https://otro.com/cv.pdf" },
    });
    prismaMock.user.delete.mockResolvedValue({ id: "user-1" });
    pathFromPublicUrlMock.mockReturnValue(null);

    await deleteAccount("user-1");

    expect(removeFileMock).not.toHaveBeenCalled();
  });

  it("captura a Sentry pero NO falla cuando removeFile rechaza", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      studentProfile: {
        cvUrl: "https://supabase.co/.../documents/cvs/u1/cv.pdf",
      },
    });
    prismaMock.user.delete.mockResolvedValue({ id: "user-1" });
    pathFromPublicUrlMock.mockReturnValue("cvs/u1/cv.pdf");
    removeFileMock.mockRejectedValue(new Error("Storage offline"));

    await expect(deleteAccount("user-1")).resolves.toBeUndefined();

    expect(prismaMock.user.delete).toHaveBeenCalled();
    expect(sentryCaptureMock).toHaveBeenCalledTimes(1);
    const call = sentryCaptureMock.mock.calls[0];
    expect((call[0] as Error).message).toBe("Storage offline");
    expect(call[1]).toEqual(
      expect.objectContaining({
        tags: { route: "users.me.delete", phase: "storage_cleanup" },
        extra: { userId: "user-1", path: "cvs/u1/cv.pdf" },
      }),
    );
  });
});

describe("deleteAccount — orden de operaciones", () => {
  it("borra DB ANTES de llamar a Storage (si Storage falla, user ya está fuera)", async () => {
    const callOrder: string[] = [];

    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      studentProfile: {
        cvUrl: "https://supabase.co/.../documents/cvs/u1/cv.pdf",
      },
    });
    prismaMock.user.delete.mockImplementation(async () => {
      callOrder.push("prisma.delete");
      return { id: "user-1" };
    });
    pathFromPublicUrlMock.mockReturnValue("cvs/u1/cv.pdf");
    removeFileMock.mockImplementation(async () => {
      callOrder.push("removeFile");
    });

    await deleteAccount("user-1");

    expect(callOrder).toEqual(["prisma.delete", "removeFile"]);
  });
});

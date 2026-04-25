import { describe, it, expect, beforeEach, vi } from "vitest";

const { uploadMock, getPublicUrlMock, fromMock } = vi.hoisted(() => {
  const uploadMock = vi.fn();
  const getPublicUrlMock = vi.fn();
  const fromMock = vi.fn(() => ({
    upload: uploadMock,
    getPublicUrl: getPublicUrlMock,
  }));
  return { uploadMock, getPublicUrlMock, fromMock };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: { from: fromMock },
  })),
}));

import { uploadFile } from "@/server/lib/storage";

beforeEach(() => {
  uploadMock.mockReset();
  getPublicUrlMock.mockReset();
  fromMock.mockClear();
});

describe("uploadFile", () => {
  it("sube el archivo al bucket y path indicados con upsert true", async () => {
    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: "https://x.supabase.co/file.pdf" },
    });

    const buffer = Buffer.from("contenido");
    await uploadFile("documents", "user-1/cv.pdf", buffer, "application/pdf");

    expect(fromMock).toHaveBeenCalledWith("documents");
    expect(uploadMock).toHaveBeenCalledWith("user-1/cv.pdf", buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  });

  it("retorna la public URL del archivo subido", async () => {
    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: "https://x.supabase.co/public/cv.pdf" },
    });

    const url = await uploadFile(
      "documents",
      "cv.pdf",
      Buffer.from(""),
      "application/pdf",
    );

    expect(url).toBe("https://x.supabase.co/public/cv.pdf");
    expect(getPublicUrlMock).toHaveBeenCalledWith("cv.pdf");
  });

  it("lanza Error con prefijo cuando supabase devuelve error", async () => {
    uploadMock.mockResolvedValue({
      error: { message: "bucket not found" },
    });

    await expect(
      uploadFile("ghost", "x.pdf", Buffer.from(""), "application/pdf"),
    ).rejects.toThrow("Error al subir archivo: bucket not found");
  });

  it("propaga el contentType al payload de upload", async () => {
    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: "https://x" } });

    await uploadFile(
      "documents",
      "doc.docx",
      Buffer.from(""),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    const callArgs = uploadMock.mock.calls[0];
    expect(callArgs[2]).toMatchObject({
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });
});

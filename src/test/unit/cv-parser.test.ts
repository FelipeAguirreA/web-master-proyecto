import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import Module from "node:module";
import { extractTextFromCV } from "@/server/lib/cv-parser";

// cv-parser.ts usa `require()` dinámico para cargar pdf-parse y mammoth
// (ver comentario al tope del archivo: evita problemas ESM/CJS con Next.js).
// vi.mock no intercepta require() dinámico resuelto en runtime, así que
// patcheamos Module.prototype.require para redirigir a mocks.
const mockPdfParse = vi.fn();
const mockExtractRawText = vi.fn();

const originalRequire = Module.prototype.require;

beforeAll(() => {
  Module.prototype.require = function (this: unknown, id: string) {
    if (id === "pdf-parse") return mockPdfParse;
    if (id === "mammoth") return { extractRawText: mockExtractRawText };
    // eslint-disable-next-line prefer-rest-params
    return originalRequire.apply(this, arguments as unknown as [string]);
  } as typeof originalRequire;
});

afterAll(() => {
  Module.prototype.require = originalRequire;
});

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const FAKE_BUFFER = Buffer.from("binary-content");

beforeEach(() => {
  mockPdfParse.mockReset();
  mockExtractRawText.mockReset();
});

describe("extractTextFromCV — PDF", () => {
  it("llama a pdf-parse con el buffer y devuelve el texto extraído", async () => {
    mockPdfParse.mockResolvedValue({ text: "Contenido del CV" });

    const result = await extractTextFromCV(FAKE_BUFFER, PDF_MIME);

    expect(mockPdfParse).toHaveBeenCalledOnce();
    expect(mockPdfParse).toHaveBeenCalledWith(FAKE_BUFFER);
    expect(result).toBe("Contenido del CV");
  });

  it("no invoca mammoth cuando el mimetype es PDF", async () => {
    mockPdfParse.mockResolvedValue({ text: "x" });

    await extractTextFromCV(FAKE_BUFFER, PDF_MIME);

    expect(mockExtractRawText).not.toHaveBeenCalled();
  });

  it("propaga el error si pdf-parse falla", async () => {
    mockPdfParse.mockRejectedValue(new Error("PDF corrupto"));

    await expect(extractTextFromCV(FAKE_BUFFER, PDF_MIME)).rejects.toThrow(
      "PDF corrupto",
    );
  });

  it("retorna string vacío si el PDF no tiene texto", async () => {
    mockPdfParse.mockResolvedValue({ text: "" });

    const result = await extractTextFromCV(FAKE_BUFFER, PDF_MIME);

    expect(result).toBe("");
  });
});

describe("extractTextFromCV — DOCX", () => {
  it("llama a mammoth.extractRawText con el buffer y devuelve result.value", async () => {
    mockExtractRawText.mockResolvedValue({ value: "Texto del docx" });

    const result = await extractTextFromCV(FAKE_BUFFER, DOCX_MIME);

    expect(mockExtractRawText).toHaveBeenCalledOnce();
    expect(mockExtractRawText).toHaveBeenCalledWith({ buffer: FAKE_BUFFER });
    expect(result).toBe("Texto del docx");
  });

  it("matchea cualquier mimetype que incluya 'wordprocessingml'", async () => {
    mockExtractRawText.mockResolvedValue({ value: "ok" });

    const customMime = "application/vnd.openxmlformats-wordprocessingml.custom";
    const result = await extractTextFromCV(FAKE_BUFFER, customMime);

    expect(result).toBe("ok");
    expect(mockExtractRawText).toHaveBeenCalled();
  });

  it("no invoca pdf-parse cuando el mimetype es DOCX", async () => {
    mockExtractRawText.mockResolvedValue({ value: "x" });

    await extractTextFromCV(FAKE_BUFFER, DOCX_MIME);

    expect(mockPdfParse).not.toHaveBeenCalled();
  });

  it("propaga el error si mammoth falla", async () => {
    mockExtractRawText.mockRejectedValue(new Error("DOCX corrupto"));

    await expect(extractTextFromCV(FAKE_BUFFER, DOCX_MIME)).rejects.toThrow(
      "DOCX corrupto",
    );
  });
});

describe("extractTextFromCV — mimetype no soportado", () => {
  it("lanza error con mensaje descriptivo para text/plain", async () => {
    await expect(extractTextFromCV(FAKE_BUFFER, "text/plain")).rejects.toThrow(
      "Tipo de archivo no soportado: text/plain. Solo se aceptan PDF y DOCX.",
    );
  });

  it("rechaza application/msword (.doc binario antiguo)", async () => {
    await expect(
      extractTextFromCV(FAKE_BUFFER, "application/msword"),
    ).rejects.toThrow("application/msword");
  });

  it("rechaza mimetype vacío", async () => {
    await expect(extractTextFromCV(FAKE_BUFFER, "")).rejects.toThrow(
      "Tipo de archivo no soportado",
    );
  });

  it("no invoca ninguna librería cuando el mimetype es inválido", async () => {
    await expect(extractTextFromCV(FAKE_BUFFER, "image/png")).rejects.toThrow();

    expect(mockPdfParse).not.toHaveBeenCalled();
    expect(mockExtractRawText).not.toHaveBeenCalled();
  });
});

describe("extractTextFromCV — sanitización", () => {
  it("elimina null bytes (\\x00) que rompen PostgreSQL UTF-8", async () => {
    mockPdfParse.mockResolvedValue({ text: "hola\x00mundo" });

    const result = await extractTextFromCV(FAKE_BUFFER, PDF_MIME);

    expect(result).toBe("holamundo");
    expect(result).not.toContain("\x00");
  });

  it("elimina caracteres de control en \\x00-\\x08", async () => {
    mockPdfParse.mockResolvedValue({ text: "a\x01b\x02c\x08d" });

    const result = await extractTextFromCV(FAKE_BUFFER, PDF_MIME);

    expect(result).toBe("abcd");
  });

  it("elimina \\x0B (vertical tab) y \\x0C (form feed)", async () => {
    mockPdfParse.mockResolvedValue({ text: "línea1\x0Blínea2\x0Cfin" });

    const result = await extractTextFromCV(FAKE_BUFFER, PDF_MIME);

    expect(result).toBe("línea1línea2fin");
  });

  it("elimina caracteres de control en \\x0E-\\x1F", async () => {
    mockPdfParse.mockResolvedValue({ text: "x\x0Ey\x1Fz" });

    const result = await extractTextFromCV(FAKE_BUFFER, PDF_MIME);

    expect(result).toBe("xyz");
  });

  it("preserva \\t (tab), \\n (newline) y \\r (carriage return)", async () => {
    mockPdfParse.mockResolvedValue({
      text: "col1\tcol2\nlínea2\rfin",
    });

    const result = await extractTextFromCV(FAKE_BUFFER, PDF_MIME);

    expect(result).toBe("col1\tcol2\nlínea2\rfin");
  });

  it("hace trim de espacios y saltos de línea al principio y final", async () => {
    mockPdfParse.mockResolvedValue({
      text: "  \n  contenido real  \n  ",
    });

    const result = await extractTextFromCV(FAKE_BUFFER, PDF_MIME);

    expect(result).toBe("contenido real");
  });

  it("aplica sanitización también al flujo DOCX", async () => {
    mockExtractRawText.mockResolvedValue({
      value: "\x00  docx con\x00null bytes  \x00",
    });

    const result = await extractTextFromCV(FAKE_BUFFER, DOCX_MIME);

    expect(result).toBe("docx connull bytes");
  });

  it("retorna string vacío si el texto queda solo con whitespace tras sanitizar", async () => {
    mockPdfParse.mockResolvedValue({ text: "\x00  \x01\x02  \x00" });

    const result = await extractTextFromCV(FAKE_BUFFER, PDF_MIME);

    expect(result).toBe("");
  });
});

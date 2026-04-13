/**
 * Extrae texto plano de un CV en formato PDF o DOCX.
 * Soporta: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * Nota: .doc (binario antiguo de Word) NO es soportado por mammoth — solo .docx.
 *
 * Usa require() dinámico para evitar problemas de ESM/CJS con pdf-parse y mammoth en Next.js.
 */
function sanitizeText(text: string): string {
  // PostgreSQL UTF-8 rejects null bytes and other non-printable control chars.
  // Strip them before persisting. Keeps \t, \n, \r (common in CVs).
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
}

export async function extractTextFromCV(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  if (mimetype === "application/pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return sanitizeText(data.text);
  }

  if (mimetype.includes("wordprocessingml")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return sanitizeText(result.value);
  }

  throw new Error(
    `Tipo de archivo no soportado: ${mimetype}. Solo se aceptan PDF y DOCX.`,
  );
}

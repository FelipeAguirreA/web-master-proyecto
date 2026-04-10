/**
 * Extrae texto plano de un CV en formato PDF o Word.
 * Soporta: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword
 *
 * Usa require() dinámico para evitar problemas de ESM/CJS con pdf-parse y mammoth en Next.js.
 */
export async function extractTextFromCV(
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  if (mimetype === "application/pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimetype.includes("wordprocessingml") ||
    mimetype.includes("msword")
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(
    `Tipo de archivo no soportado: ${mimetype}. Solo se aceptan PDF y Word.`
  );
}

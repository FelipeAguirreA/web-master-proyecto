import { prisma } from "@/server/lib/db";
import { uploadFile } from "@/server/lib/storage";
import { extractTextFromCV } from "@/server/lib/cv-parser";
import {
  generateEmbedding,
  calculateHybridMatchScore,
} from "@/server/lib/embeddings";

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

/**
 * Sanitiza el nombre original del archivo antes de usarlo en el path de Storage.
 * Defensa contra path traversal (CWE-22): si llega `../../etc/passwd` el path
 * resultante escaparía del folder del user. Mantiene solo el basename, recorta
 * a 60 chars, deja solo `[a-zA-Z0-9_-]` y matchea la extensión a una whitelist.
 * Si no hay extensión válida, default a `pdf` (el handler ya whitelist-ea PDF/DOCX).
 */
function sanitizeFilename(originalName: string): string {
  const basename = originalName.split(/[\\/]/).pop() ?? originalName;
  const dotIdx = basename.lastIndexOf(".");
  const rawExt = dotIdx >= 0 ? basename.slice(dotIdx + 1).toLowerCase() : "";
  const extension = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : "pdf";
  const stem = (dotIdx >= 0 ? basename.slice(0, dotIdx) : basename)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);
  // Si el stem quedó vacío o sin caracteres alfanuméricos (e.g. "...", "~/~"),
  // fallback a "cv" para que el path final sea legible y predecible.
  const hasAlnum = /[a-zA-Z0-9]/.test(stem);
  const safeStem = hasAlnum ? stem : "cv";
  return `${safeStem}.${extension}`;
}

/**
 * Procesa un CV subido por el estudiante:
 * 1. Sube el archivo a Supabase Storage
 * 2. Extrae el texto con cv-parser
 * 3. Genera el embedding con HuggingFace
 * 4. Actualiza el StudentProfile con cvUrl, cvText y embedding
 */
export async function processCV(
  userId: string,
  fileBuffer: Buffer,
  mimetype: string,
  originalName: string,
): Promise<{ cvUrl: string; embeddingSize: number }> {
  const timestamp = Date.now();
  const safeName = sanitizeFilename(originalName);
  const path = `cvs/${userId}/${timestamp}-${safeName}`;

  const cvUrl = await uploadFile("documents", path, fileBuffer, mimetype);

  const cvText = await extractTextFromCV(fileBuffer, mimetype);

  const embedding = await generateEmbedding(cvText);

  await prisma.studentProfile.upsert({
    where: { userId },
    update: { cvUrl, cvText, embedding },
    create: { userId, cvUrl, cvText, embedding },
  });

  return { cvUrl, embeddingSize: embedding.length };
}

/**
 * Elimina el CV del estudiante: limpia cvUrl, cvText y embedding del perfil.
 * El archivo en Supabase Storage no se elimina (puede quedar como backup).
 */
export async function deleteCV(userId: string): Promise<void> {
  await prisma.studentProfile.upsert({
    where: { userId },
    update: { cvUrl: null, cvText: null, embedding: [] },
    create: { userId },
  });
}

/**
 * Retorna las prácticas recomendadas para el estudiante ordenadas por similitud de coseno.
 * Requiere que el estudiante haya subido su CV (embedding no vacío).
 * Retorna máximo 20 resultados con matchScore > 0, sin el campo embedding.
 */
export async function getRecommendations(userId: string) {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  // Antes requería embedding del CV obligatoriamente. Con el score híbrido,
  // un estudiante sin CV pero con skills declaradas puede ver recomendaciones.
  if (!student) return [];
  if (!student.embedding.length && !student.skills.length) return [];

  // Excluir prácticas ya postuladas — no tiene sentido recomendar lo que ya
  // postuló. Trae solo internshipId (mínimo necesario).
  const myApplications = await prisma.application.findMany({
    where: { studentId: userId },
    select: { internshipId: true },
  });
  const excludedIds = myApplications.map((a) => a.internshipId);

  const internships = await prisma.internship.findMany({
    where: {
      isActive: true,
      company: { companyStatus: "APPROVED" },
      ...(excludedIds.length > 0 && { id: { notIn: excludedIds } }),
    },
    include: {
      company: { select: { companyName: true, logo: true } },
    },
  });

  const scored = internships.map(({ embedding, ...internship }) => ({
    ...internship,
    matchScore: calculateHybridMatchScore(
      student.embedding,
      embedding,
      student.skills,
      internship.skills,
    ),
  }));

  return scored
    .filter((i) => i.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20);
}

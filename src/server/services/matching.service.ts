import { prisma } from "@/server/lib/db";
import { uploadFile } from "@/server/lib/storage";
import { extractTextFromCV } from "@/server/lib/cv-parser";
import { generateEmbedding, calculateMatchScore } from "@/server/lib/embeddings";

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
  originalName: string
): Promise<{ cvUrl: string; embeddingSize: number }> {
  const timestamp = Date.now();
  const path = `cvs/${userId}/${timestamp}-${originalName}`;

  const cvUrl = await uploadFile("documents", path, fileBuffer, mimetype);

  const cvText = await extractTextFromCV(fileBuffer, mimetype);

  const embedding = await generateEmbedding(cvText);

  await prisma.studentProfile.update({
    where: { userId },
    data: { cvUrl, cvText, embedding },
  });

  return { cvUrl, embeddingSize: embedding.length };
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

  if (!student || !student.embedding.length) {
    throw new Error("Upload your CV first");
  }

  const internships = await prisma.internship.findMany({
    where: { isActive: true },
    include: {
      company: { select: { companyName: true, logo: true } },
    },
  });

  const scored = internships.map(({ embedding, ...internship }) => ({
    ...internship,
    matchScore:
      embedding.length > 0
        ? calculateMatchScore(student.embedding, embedding)
        : 0,
  }));

  return scored
    .filter((i) => i.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20);
}

import { prisma } from "@/server/lib/db";
import { calculateHybridMatchScore } from "@/server/lib/embeddings";

/**
 * Toggle wishlist: si el estudiante ya tiene guardada la práctica, la
 * desguarda. Si no, la guarda. Retorna el estado final (`saved: true|false`).
 *
 * Idempotente desde el cliente: si el optimistic update se desincroniza con
 * el server, el siguiente toggle vuelve al estado consistente.
 */
export async function toggleSavedInternship(
  studentUserId: string,
  internshipId: string,
): Promise<{ saved: boolean }> {
  const existing = await prisma.savedInternship.findUnique({
    where: {
      studentId_internshipId: {
        studentId: studentUserId,
        internshipId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.savedInternship.delete({ where: { id: existing.id } });
    return { saved: false };
  }

  await prisma.savedInternship.create({
    data: { studentId: studentUserId, internshipId },
  });
  return { saved: true };
}

/**
 * Lista prácticas guardadas por el estudiante, ordenadas por más reciente.
 * Filtra prácticas inactivas o de empresas no aprobadas (si la empresa fue
 * suspendida después de que el estudiante la guardó, no la mostramos).
 *
 * Calcula el matchScore híbrido (CV + skills declaradas) para cada práctica
 * — sin esto, el dashboard mostraría 0% match en la sección "Mis guardadas".
 * Excluye `embedding` del payload (mismo patrón que getRecommendations).
 */
export async function getSavedInternships(studentUserId: string) {
  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId },
    select: { embedding: true, skills: true },
  });
  const studentEmbedding = student?.embedding ?? [];
  const studentSkills = student?.skills ?? [];

  const saved = await prisma.savedInternship.findMany({
    where: {
      studentId: studentUserId,
      internship: {
        isActive: true,
        company: { companyStatus: "APPROVED" },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      internship: {
        include: {
          company: { select: { companyName: true, logo: true } },
        },
      },
    },
  });

  return saved.map((s) => {
    const { embedding, ...rest } = s.internship;
    return {
      ...rest,
      savedAt: s.createdAt,
      matchScore: calculateHybridMatchScore(
        studentEmbedding,
        embedding,
        studentSkills,
        s.internship.skills,
      ),
    };
  });
}

/**
 * Retorna el Set de internshipIds guardados por el estudiante.
 * Optimizado para el caso "marcar como guardadas en una lista de N prácticas".
 */
export async function getSavedInternshipIds(
  studentUserId: string,
): Promise<Set<string>> {
  const rows = await prisma.savedInternship.findMany({
    where: { studentId: studentUserId },
    select: { internshipId: true },
  });
  return new Set(rows.map((r) => r.internshipId));
}

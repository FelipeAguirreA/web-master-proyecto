import { NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";
import {
  calculateHybridMatchScore,
  computeSkillOverlap,
} from "@/server/lib/embeddings";
import { getRecommendations } from "@/server/services/matching.service";

export async function GET() {
  const auth = await requireAuth("STUDENT");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const student = await prisma.studentProfile.findUnique({
    where: { userId: auth.user.id },
    select: {
      cvUrl: true,
      cvText: true,
      embedding: true,
      skills: true,
    },
  });

  const totalInternships = await prisma.internship.count();
  const activeInternships = await prisma.internship.count({
    where: { isActive: true },
  });
  const activeApproved = await prisma.internship.count({
    where: { isActive: true, company: { companyStatus: "APPROVED" } },
  });
  const indexedActive = await prisma.internship.findMany({
    where: { isActive: true, company: { companyStatus: "APPROVED" } },
    select: {
      id: true,
      title: true,
      embedding: true,
      skills: true,
      company: { select: { companyName: true } },
    },
  });
  const withEmbedding = indexedActive.filter((i) => i.embedding.length > 0);

  // Scores reales calculados (incluye breakdown semántico + skill overlap
  // para debug del nuevo score híbrido).
  const studentEmbedding = student?.embedding ?? [];
  const studentSkills = student?.skills ?? [];
  const hasAnyStudentSignal =
    studentEmbedding.length > 0 || studentSkills.length > 0;

  const rawScores = hasAnyStudentSignal
    ? indexedActive.map((i) => ({
        id: i.id,
        title: i.title,
        company: i.company.companyName,
        hasEmbedding: i.embedding.length > 0,
        rawCosine:
          i.embedding.length > 0 && studentEmbedding.length > 0
            ? (() => {
                let dot = 0,
                  nA = 0,
                  nB = 0;
                for (let k = 0; k < studentEmbedding.length; k++) {
                  dot += studentEmbedding[k] * i.embedding[k];
                  nA += studentEmbedding[k] ** 2;
                  nB += i.embedding[k] ** 2;
                }
                const denom = Math.sqrt(nA) * Math.sqrt(nB);
                return denom === 0 ? 0 : dot / denom;
              })()
            : null,
        skillOverlap: computeSkillOverlap(studentSkills, i.skills),
        matchScore: calculateHybridMatchScore(
          studentEmbedding,
          i.embedding,
          studentSkills,
          i.skills,
        ),
      }))
    : [];

  // Llamada real al servicio que usa el endpoint /api/matching/recommendations
  const realRecommendations = await getRecommendations(auth.user.id);

  return NextResponse.json({
    student: {
      hasCv: !!student?.cvUrl,
      hasCvText: !!student?.cvText && student.cvText.length > 0,
      cvTextLength: student?.cvText?.length ?? 0,
      embeddingLength: student?.embedding.length ?? 0,
      embeddingFirst5: student?.embedding.slice(0, 5) ?? [],
      declaredSkills: studentSkills,
    },
    internships: {
      total: totalInternships,
      active: activeInternships,
      activeAndApproved: activeApproved,
      activeApprovedWithEmbedding: withEmbedding.length,
      activeApprovedWithoutEmbedding:
        indexedActive.length - withEmbedding.length,
    },
    scores: rawScores.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)),
    realRecommendationsCount: realRecommendations.length,
    realRecommendationsTitles: realRecommendations.map((r) => ({
      id: r.id,
      title: r.title,
      matchScore: r.matchScore,
    })),
  });
}

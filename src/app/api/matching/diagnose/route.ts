import { NextResponse } from "next/server";
import { requireAuth } from "@/server/lib/auth-guard";
import { prisma } from "@/server/lib/db";
import { calculateMatchScore } from "@/server/lib/embeddings";
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
      company: { select: { companyName: true } },
    },
  });
  const withEmbedding = indexedActive.filter((i) => i.embedding.length > 0);

  // Scores reales calculados para las prácticas con embedding
  const rawScores = student?.embedding.length
    ? indexedActive.map((i) => ({
        id: i.id,
        title: i.title,
        company: i.company.companyName,
        hasEmbedding: i.embedding.length > 0,
        rawCosine:
          i.embedding.length > 0 && student.embedding.length > 0
            ? (() => {
                let dot = 0,
                  nA = 0,
                  nB = 0;
                for (let k = 0; k < student.embedding.length; k++) {
                  dot += student.embedding[k] * i.embedding[k];
                  nA += student.embedding[k] ** 2;
                  nB += i.embedding[k] ** 2;
                }
                const denom = Math.sqrt(nA) * Math.sqrt(nB);
                return denom === 0 ? 0 : dot / denom;
              })()
            : null,
        matchScore:
          i.embedding.length > 0 && student.embedding.length > 0
            ? calculateMatchScore(student.embedding, i.embedding)
            : 0,
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

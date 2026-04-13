/**
 * Script de migración: regenera embeddings de prácticas y CVs de estudiantes
 * usando el modelo actual (paraphrase-multilingual-MiniLM-L12-v2).
 *
 * Necesario cuando se cambia el modelo de embeddings, ya que los vectores
 * de distintos modelos son incompatibles aunque tengan las mismas dimensiones.
 *
 * Uso:
 *   pnpm tsx prisma/regen-embeddings.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const rawUrl = new URL(process.env.DATABASE_URL!);
rawUrl.searchParams.delete("sslmode");

const pool = new Pool({
  connectionString: rawUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const HUGGINGFACE_URL =
  "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5";

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY no configurada");

  const res = await fetch(HUGGINGFACE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text.slice(0, 2000) }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`HuggingFace API error: ${error}`);
  }

  const result = await res.json();
  return Array.isArray(result[0])
    ? (result[0] as number[])
    : (result as number[]);
}

async function regenInternships() {
  const internships = await prisma.internship.findMany({
    select: { id: true, title: true, description: true, skills: true },
  });

  console.log(`\nRegenerando embeddings de ${internships.length} prácticas...`);

  for (const internship of internships) {
    const text = `${internship.title} ${internship.description} ${internship.skills.join(" ")}`;
    try {
      const embedding = await generateEmbedding(text);
      await prisma.internship.update({
        where: { id: internship.id },
        data: { embedding },
      });
      console.log(`  ✓ "${internship.title}" — ${embedding.length} dims`);
    } catch (error) {
      console.error(`  ✗ "${internship.title}":`, error);
    }
  }
}

async function regenStudentCVs() {
  const profiles = await prisma.studentProfile.findMany({
    where: { cvText: { not: null } },
    select: { id: true, userId: true, cvText: true },
  });

  console.log(
    `\nRegenerando embeddings de ${profiles.length} CVs de estudiantes...`,
  );

  for (const profile of profiles) {
    try {
      const embedding = await generateEmbedding(profile.cvText!);
      await prisma.studentProfile.update({
        where: { id: profile.id },
        data: { embedding },
      });
      console.log(`  ✓ userId=${profile.userId} — ${embedding.length} dims`);
    } catch (error) {
      console.error(`  ✗ userId=${profile.userId}:`, error);
    }
  }
}

async function main() {
  console.log("=== Regeneración de embeddings ===");
  console.log(`Modelo: paraphrase-multilingual-MiniLM-L12-v2`);

  await regenInternships();
  await regenStudentCVs();

  console.log("\n✓ Regeneración completa.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

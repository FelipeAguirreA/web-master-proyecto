/**
 * Script de re-indexación de embeddings con HuggingFace.
 *
 * Por defecto solo procesa registros con `embedding = []` (prácticas o CVs sin
 * indexar). Con `--all` regenera TODOS los embeddings — útil cuando se cambia
 * el modelo y los vectores existentes son incompatibles.
 *
 * Modelo actual: BAAI/bge-small-en-v1.5 — 384 dims, multilingüe efectivo,
 * disponible vía feature-extraction nativa en el free tier de HuggingFace.
 *
 * Uso:
 *   pnpm db:reindex            # solo los que faltan (embedding vacío)
 *   pnpm db:reindex -- --all   # todos
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

// Delay entre llamadas para no triggerar rate limit del free tier de HF.
const HF_DELAY_MS = 250;

const ALL_MODE = process.argv.includes("--all");

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

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
    throw new Error(`HF ${res.status}: ${error.slice(0, 200)}`);
  }

  const result = await res.json();
  return Array.isArray(result[0])
    ? (result[0] as number[])
    : (result as number[]);
}

async function reindexInternships() {
  const internships = await prisma.internship.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      skills: true,
      embedding: true,
    },
  });

  const targets = ALL_MODE
    ? internships
    : internships.filter((i) => i.embedding.length === 0);

  const skipped = internships.length - targets.length;

  console.log(
    `\nPrácticas: ${internships.length} total, ${targets.length} a procesar${
      skipped > 0 ? `, ${skipped} omitidas (ya indexadas)` : ""
    }`,
  );

  let ok = 0;
  let fail = 0;
  for (const internship of targets) {
    const text = `${internship.title} ${internship.description} ${internship.skills.join(" ")}`;
    try {
      const embedding = await generateEmbedding(text);
      await prisma.internship.update({
        where: { id: internship.id },
        data: { embedding },
      });
      ok++;
      console.log(
        `  ✓ "${internship.title.slice(0, 50)}" — ${embedding.length} dims`,
      );
    } catch (error) {
      fail++;
      console.error(
        `  ✗ "${internship.title.slice(0, 50)}":`,
        error instanceof Error ? error.message : error,
      );
    }
    await sleep(HF_DELAY_MS);
  }
  return { ok, fail };
}

async function reindexStudentCVs() {
  const profiles = await prisma.studentProfile.findMany({
    where: { cvText: { not: null } },
    select: { id: true, userId: true, cvText: true, embedding: true },
  });

  const targets = ALL_MODE
    ? profiles
    : profiles.filter((p) => p.embedding.length === 0);

  const skipped = profiles.length - targets.length;

  console.log(
    `\nCVs de estudiantes: ${profiles.length} total, ${targets.length} a procesar${
      skipped > 0 ? `, ${skipped} omitidos (ya indexados)` : ""
    }`,
  );

  let ok = 0;
  let fail = 0;
  for (const profile of targets) {
    try {
      const embedding = await generateEmbedding(profile.cvText!);
      await prisma.studentProfile.update({
        where: { id: profile.id },
        data: { embedding },
      });
      ok++;
      console.log(`  ✓ userId=${profile.userId} — ${embedding.length} dims`);
    } catch (error) {
      fail++;
      console.error(
        `  ✗ userId=${profile.userId}:`,
        error instanceof Error ? error.message : error,
      );
    }
    await sleep(HF_DELAY_MS);
  }
  return { ok, fail };
}

async function main() {
  console.log("=== Re-indexación de embeddings ===");
  console.log(`Modo: ${ALL_MODE ? "TODOS los registros" : "solo faltantes"}`);
  console.log("Modelo: BAAI/bge-small-en-v1.5 (384 dims)");

  const startedAt = Date.now();
  const intRes = await reindexInternships();
  const cvRes = await reindexStudentCVs();
  const tookS = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(`\n=== Resumen (${tookS}s) ===`);
  console.log(
    `Prácticas: ${intRes.ok} OK${intRes.fail > 0 ? `, ${intRes.fail} fallidas` : ""}`,
  );
  console.log(
    `CVs:        ${cvRes.ok} OK${cvRes.fail > 0 ? `, ${cvRes.fail} fallidos` : ""}`,
  );

  if (intRes.fail > 0 || cvRes.fail > 0) {
    console.log(
      "\nAlgunas fallaron. Probá de nuevo en 1 minuto (rate limit HF) o revisá el error.",
    );
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Error fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

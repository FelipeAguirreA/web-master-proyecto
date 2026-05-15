import { env } from "@/lib/env";
import { createLogger } from "./logger";

const log = createLogger({ module: "embeddings" });

// ───────────────────────────────────────────────────────────────────────────
// PUNTO DE SWAP DE PROVIDER:
// Hoy usa HuggingFace Inference API (free tier) con BAAI/bge-small-en-v1.5
// (384 dims). Para migrar a OpenAI / modelo self-hosted / otro provider:
// cambiar `generateEmbedding()` y `calculateMatchScore()` solo en este
// archivo — el resto del codebase consume estos 2 exports.
// OJO: cambio de dimensions → migration Prisma sobre `StudentProfile.embedding`
// e `Internship.embedding` (Float[]) + re-generación de embeddings existentes.
// Decisión y migración desde all-MiniLM-L6-v2 documentadas en ADR 006.
// ───────────────────────────────────────────────────────────────────────────

// BAAI/bge-small-en-v1.5 — 384 dims, feature-extraction nativa en el router de HuggingFace.
// Los modelos sentence-transformers/* e intfloat/* son ruteados al SentenceSimilarityPipeline
// en el free tier, lo que impide obtener embeddings individuales.
const HUGGINGFACE_URL =
  "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5";

/**
 * Genera un embedding de 384 dimensiones para el texto dado.
 * Usa el modelo BAAI/bge-small-en-v1.5 vía HuggingFace Inference API.
 *
 * Si no hay API key o la API falla, retorna [] sin romper la app.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!env.HUGGINGFACE_API_KEY) {
    log.warn("HUGGINGFACE_API_KEY no configurada — retornando embedding vacío");
    return [];
  }

  try {
    const res = await fetch(HUGGINGFACE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text.slice(0, 2000) }),
    });

    if (!res.ok) {
      const error = await res.text();
      log.error({ status: res.status, error }, "HuggingFace API error");
      return [];
    }

    // Retorna number[][] — tomar el primer embedding
    const result = await res.json();
    if (Array.isArray(result[0])) return result[0] as number[];
    return result as number[];
  } catch (error) {
    log.error({ err: error }, "error al generar embedding");
    return [];
  }
}

/**
 * Calcula la similitud de coseno entre dos embeddings y la normaliza a 0-100.
 *
 * Fórmula:
 *   dotProduct = Σ(A[i] × B[i])
 *   cosine     = dotProduct / (√Σ(A[i]²) × √Σ(B[i]²))
 *   score      = Math.max(0, Math.round(cosine × 100))
 *
 * Retorna 0 en casos borde: embeddings vacíos, longitudes distintas, denominador cero.
 */
export function calculateMatchScore(
  embeddingA: number[],
  embeddingB: number[],
): number {
  if (!embeddingA.length || !embeddingB.length) return 0;
  if (embeddingA.length !== embeddingB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embeddingA.length; i++) {
    dotProduct += embeddingA[i] * embeddingB[i];
    normA += embeddingA[i] ** 2;
    normB += embeddingB[i] ** 2;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  const cosine = dotProduct / denominator;
  return Math.max(0, Math.round(cosine * 100));
}

/**
 * Calcula el % de skills requeridas por la práctica que el estudiante
 * declara en su perfil. Comparación case-insensitive con trim, para que
 * "react" matchee con "React" o "React ".
 *
 * Retorna 0 si cualquiera de las listas está vacía.
 */
export function computeSkillOverlap(
  studentSkills: string[],
  internshipSkills: string[],
): number {
  if (!studentSkills.length || !internshipSkills.length) return 0;

  const norm = (s: string) => s.trim().toLowerCase();
  const studentSet = new Set(
    studentSkills.map(norm).filter((s) => s.length > 0),
  );
  if (studentSet.size === 0) return 0;

  let matches = 0;
  for (const skill of internshipSkills) {
    if (studentSet.has(norm(skill))) matches++;
  }

  return Math.round((matches / internshipSkills.length) * 100);
}

// Tope de aporte de skills declaradas al score híbrido. Con 20:
//   - sin skills declaradas que matcheen → mismo score que el semántico
//   - 1 de 5 skills (20%) → +4 puntos
//   - todas las skills (100%) → +20 puntos (capeado a 100)
// Las skills NUNCA bajan el score: solo suman. Cambiar este número ajusta
// cuánto pesan las skills declaradas vs el CV semántico.
const MAX_SKILL_BOOST = 20;

/**
 * Score híbrido CV + skills declaradas (0-100).
 *
 * Fórmula: `semántico + (skillOverlap/100) × MAX_SKILL_BOOST`, capeado a 100.
 * Las skills declaradas son BOOST aditivo, nunca penalización — agregar una
 * skill que matchea siempre sube el match, nunca lo baja. Casos borde:
 *
 *   - sin CV pero con skills declaradas    → 100% skillOverlap (puro)
 *   - sin CV y sin skills declaradas       → 0
 */
export function calculateHybridMatchScore(
  studentEmbedding: number[],
  internshipEmbedding: number[],
  studentSkills: string[],
  internshipSkills: string[],
): number {
  const semantic = calculateMatchScore(studentEmbedding, internshipEmbedding);
  const overlapPct = computeSkillOverlap(studentSkills, internshipSkills);

  if (semantic === 0 && overlapPct === 0) return 0;

  // Estudiante sin CV: el overlap es la única señal — score directo (0-100).
  if (semantic === 0) return overlapPct;

  // Con CV: boost aditivo. min(100, ...) clampea el techo.
  const boost = (overlapPct / 100) * MAX_SKILL_BOOST;
  return Math.min(100, Math.round(semantic + boost));
}

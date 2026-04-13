import { env } from "@/lib/env";

// paraphrase-multilingual-MiniLM-L12-v2 — multilingüe (50+ idiomas), 384 dims, free tier
const HUGGINGFACE_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";

/**
 * Genera un embedding de 384 dimensiones para el texto dado.
 * Usa el modelo paraphrase-multilingual-MiniLM-L12-v2 vía HuggingFace Inference API.
 * Soporta más de 50 idiomas incluyendo español.
 *
 * Si no hay API key o la API falla, retorna [] sin romper la app.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!env.HUGGINGFACE_API_KEY) {
    console.warn(
      "[embeddings] HUGGINGFACE_API_KEY no configurada — retornando embedding vacío",
    );
    return [];
  }

  try {
    const res = await fetch(HUGGINGFACE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text.slice(0, 512) }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[embeddings] HuggingFace API error:", error);
      return [];
    }

    // Retorna number[][] — tomar el primer embedding
    const result = await res.json();
    if (Array.isArray(result[0])) return result[0] as number[];
    return result as number[];
  } catch (error) {
    console.error("[embeddings] Error al generar embedding:", error);
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

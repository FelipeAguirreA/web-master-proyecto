# Spec: Sistema de Matching IA — PractiX

## Modelo

**sentence-transformers/all-MiniLM-L6-v2** vía HuggingFace Inference API (free tier).

- Genera vectores de **384 dimensiones**
- Diseñado para comparación semántica de textos cortos
- Latencia ~1-2s por llamada en free tier

---

## 1. `generateEmbedding(text: string): Promise<number[]>`

### Comportamiento normal

- Trunca el texto a 512 caracteres antes de enviarlo
- Llama a `https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2`
- Headers: `Authorization: Bearer {HUGGINGFACE_API_KEY}`
- Body: `{ inputs: text, options: { wait_for_model: true } }`
- La API retorna `number[][]` (array de arrays); se toma `result[0]`
- Retorna `number[]` con 384 valores flotantes

### Sin API key

- `console.warn` y retorna `[]`
- La app no rompe; el matching simplemente no funciona

### Si la API falla

- `console.error` con el detalle del error
- Retorna `[]`
- La app no rompe; el embedding queda vacío en la DB

---

## 2. `calculateMatchScore(embeddingA: number[], embeddingB: number[]): number`

### Fórmula — Similitud de coseno

```
dotProduct = Σ(A[i] × B[i])
normA      = √(Σ(A[i]²))
normB      = √(Σ(B[i]²))
cosine     = dotProduct / (normA × normB)
score      = Math.round(((cosine + 1) / 2) × 100)
```

La similitud de coseno devuelve valores en `[-1, 1]`.
Se normaliza a `[0, 100]` con la fórmula `(cosine + 1) / 2 × 100`.

### Casos borde

| Caso | Retorna |
|------|---------|
| Algún embedding vacío (`length === 0`) | `0` |
| Longitudes distintas | `0` |
| Denominador cero (vector de ceros) | `0` |
| Vectores idénticos | `100` |
| Vectores opuestos | `0` |

### Precisión

Entero redondeado (`Math.round`). Rango garantizado: `0–100`.

---

## 3. `getRecommendations(userId: string)`

### Precondición

El `StudentProfile` del usuario debe tener `embedding` con al menos 1 elemento.
Si no → lanzar `Error('Upload your CV first')`.

### Lógica

1. Buscar `StudentProfile` por `userId`
2. Buscar todos los `Internship` con `isActive: true`, incluir `company { companyName, logo }`
3. Para cada práctica:
   - Si tiene `embedding.length > 0` → calcular `calculateMatchScore(student.embedding, internship.embedding)`
   - Si no tiene embedding → score `0`
4. Eliminar el campo `embedding` de cada resultado (no enviarlo al frontend)
5. Filtrar prácticas con `matchScore > 0`
6. Ordenar por `matchScore` descendente
7. Retornar máximo **20** resultados

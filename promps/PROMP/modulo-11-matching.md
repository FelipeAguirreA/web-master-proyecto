# Módulo 11: Matching con IA

## Resultado Final
CV parsing + embeddings con HuggingFace + similitud de coseno + recomendaciones.

---

## Paso 0A: Obtener API Key de HuggingFace

```
1. Ir a https://huggingface.co → Sign Up (gratis)
2. Settings → Access Tokens → New Token (tipo Read)
3. Copiar el token
4. Agregar a .env.local: HUGGINGFACE_API_KEY=hf_xxxxxxxxxx
```

---

## Paso 0B: Crear bucket en Supabase Storage

Antes de implementar la subida de CVs, el bucket debe existir en Supabase:

```
1. Supabase → Storage → New bucket
2. Nombre: documents
3. Marcarlo como Public
4. Agregar dos policies en Storage → documents → Policies:

   Policy INSERT:
   - Name: Allow authenticated uploads
   - Command: INSERT
   - Target roles: authenticated
   - Definition: bucket_id = 'documents'

   Policy SELECT:
   - Name: Allow public read
   - Command: SELECT
   - Target roles: anon
   - Definition: bucket_id = 'documents'

IMPORTANTE: En SUPABASE_SERVICE_KEY debe estar la service_role key
(no la anon key). Se encuentra en Project Settings → API → service_role.
```

---

## Paso 0C: Especificación SDD — Matching

**Prompt para la IA:**
```
Crea la especificación SDD para el sistema de matching de PractiX.

Ubicación: docs/specs/matching.spec.md

Especificar:

1. generateEmbedding(text: string): Promise<number[]>
   - Qué modelo usa y por qué (BAAI/bge-small-en-v1.5, 384 dims)
   - Comportamiento cuando la API key no existe
   - Comportamiento cuando la API falla
   - Formato exacto del retorno

2. calculateMatchScore(embeddingA: number[], embeddingB: number[]): number
   - Fórmula de similitud de coseno (documentar la matemática)
   - Casos borde: embeddings vacíos, longitudes distintas, denominador cero
   - Rango del resultado (0-100)
   - Precisión decimal

3. getRecommendations(userId: string)
   - Precondición: el estudiante debe tener embedding
   - Qué hace si no hay prácticas activas
   - Criterio de ordenamiento y límite de resultados
   - Qué campos se excluyen de la respuesta (embedding)

No escribas código, solo la especificación en markdown.
```

---

## Paso 0D: Tests TDD — calculateMatchScore

> `calculateMatchScore` es lógica matemática PURA — es el candidato ideal para TDD. Escribí los tests antes de tocar el código.

**Prompt para la IA:**
```
Crea los unit tests para el sistema de matching de PractiX siguiendo TDD.
Basate en docs/specs/matching.spec.md.

Archivo: src/test/unit/matching.service.test.ts

Mockear estos módulos para evitar llamadas reales:
- "@/server/lib/storage" → uploadFile retorna URL fake
- "@/server/lib/cv-parser" → extractTextFromCV retorna texto fake
- "@/server/lib/embeddings" → generateEmbedding y calculateMatchScore como vi.fn()
- "@/server/lib/db" → prismaMock

Parte 1 — calculateMatchScore (usar vi.importActual para testear la implementación real):
- "retorna 0 si ambos embeddings están vacíos"
- "retorna 0 si los embeddings tienen longitudes distintas"
- "retorna 100 para vectores idénticos"
- "retorna 0 para vectores opuestos ([1,0] vs [-1,0])"
- "retorna un valor entre 0 y 100 para vectores similares pero no idénticos"
  (usar vectores como [1,0,0] vs [0.5,0.5,0] para evitar redondeo a 100)
- "retorna 0 si el denominador es cero (vector de ceros)"

Parte 2 — getRecommendations:
- "lanza error si el estudiante no tiene embedding"
- "retorna lista vacía si no hay prácticas activas con embedding"
- "ordena las prácticas por matchScore de mayor a menor"
- "no incluye el campo embedding en los resultados"
- "limita los resultados a 20"
```

```bash
pnpm test  # deben fallar — está bien
```

---

## Paso 1: Servicio de Embeddings

**Prompt para la IA:**
```
Crea el servicio de embeddings para el matching IA de PractiX.

Ubicación: src/server/lib/embeddings.ts

IMPORTANTE — Modelo a usar:
Usar BAAI/bge-small-en-v1.5, NO sentence-transformers/all-MiniLM-L6-v2.
El motivo: all-MiniLM-L6-v2 está registrado en HuggingFace como sentence-similarity
(requiere pares de frases), no como feature-extraction. BAAI/bge-small-en-v1.5
es feature-extraction, 384 dims, free tier, compatible con el router nuevo.

IMPORTANTE — URL del endpoint:
El endpoint anterior (api-inference.huggingface.co) fue deprecado.
Usar: https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5

Funciones:

1. generateEmbedding(text: string): Promise<number[]>
   - Headers: Authorization Bearer HUGGINGFACE_API_KEY
   - Body JSON: { inputs: text (truncar a 512 chars) }
   - Si no hay API key → console.warn y retornar []
   - Si la API falla → console.error y retornar []
   - La API retorna number[][] → tomar result[0]
   - Retornar el vector de floats

2. calculateMatchScore(embeddingA: number[], embeddingB: number[]): number
   - Implementar similitud de coseno:
     dotProduct = Σ(A[i] * B[i])
     normA = √(Σ(A[i]²))
     normB = √(Σ(B[i]²))
     cosine = dotProduct / (normA * normB)
   - Si algún embedding vacío o longitudes diferentes → retornar 0
   - Si denominador es 0 → retornar 0
   - Normalizar a 0-100: Math.round(((cosine + 1) / 2) * 100)

Exportar ambas funciones.
```

---

```bash
pnpm test  # calculateMatchScore debe estar en verde ahora
```

---

## Paso 2: Parser de CV

**Prompt para la IA:**
```
Crea el parser de CV para extraer texto de PDF y Word.

Ubicación: src/server/lib/cv-parser.ts

IMPORTANTE — compatibilidad con Next.js App Router:
No usar import estático de pdf-parse ni mammoth.
Usar require() dinámico dentro de cada función para evitar conflictos ESM/CJS.

Función extractTextFromCV(buffer: Buffer, mimetype: string): Promise<string>

Lógica:
- Si mimetype es 'application/pdf':
  const pdfParse = require('pdf-parse')  (sin import al tope)
  const data = await pdfParse(buffer)
  Retornar data.text

- Si mimetype incluye 'wordprocessingml' o 'msword':
  const mammoth = require('mammoth')  (sin import al tope)
  const result = await mammoth.extractRawText({ buffer })
  Retornar result.value

- Cualquier otro tipo → lanzar Error con mensaje descriptivo

NOTA: pdf-parse debe estar en v1.1.1 (no v2.x — rompe con ESM en Next.js).
Verificar en package.json antes de implementar.
Si está en v2.x → pnpm remove pdf-parse && pnpm add pdf-parse@1.1.1

También agregar en next.config.ts:
serverExternalPackages: ["pdf-parse", "mammoth"]
```

---

## Paso 3: Matching Service

**Prompt para la IA:**
```
Crea el servicio de matching que coordina la lógica de IA.

Ubicación: src/server/services/matching.service.ts

Lógica de negocio PURA. Usa prisma, embeddings y cv-parser.

Funciones:

1. processCV(userId: string, fileBuffer: Buffer, mimetype: string, originalName: string):
   - Subir archivo a Supabase Storage:
     path: cvs/{userId}/{timestamp}-{originalName}
     Usar uploadFile del server/lib/storage
   - Extraer texto con extractTextFromCV(buffer, mimetype)
   - Generar embedding con generateEmbedding(cvText)
   - Actualizar StudentProfile: cvUrl, cvText, embedding
   - Retornar { cvUrl, embeddingSize: embedding.length }

2. getRecommendations(userId: string):
   - Buscar StudentProfile del usuario
   - Si no tiene embedding → lanzar Error('Upload your CV first')
   - Buscar todos los internships activos (include company: companyName, logo)
   - Para cada internship:
     - Si tiene embedding → calculateMatchScore(student.embedding, internship.embedding)
     - Si no tiene → score 0
   - Mapear resultados eliminando el campo embedding
   - Filtrar score > 0
   - Ordenar por matchScore desc
   - Retornar top 20
```

---

## Paso 4: API Route - POST /api/matching/upload-cv

**Prompt para la IA:**
```
Crea el route handler para subir y procesar un CV.

Ubicación: src/app/api/matching/upload-cv/route.ts

POST /api/matching/upload-cv:
- requireAuth('STUDENT')
- const formData = await request.formData()
- const file = formData.get('cv') as File
- const buffer = Buffer.from(await file.arrayBuffer())
- Validar que existe el archivo, tamaño < 5MB,
  y tipo es PDF o DOCX

Errores:
- Sin archivo → 400 "CV file required"
- Tipo inválido → 400 "Only PDF and Word files are supported"
- Tamaño > 5MB → 400 "File too large (max 5MB)"
```

---

## Paso 5: API Route - GET /api/matching/recommendations

**Prompt para la IA:**
```
Crea el route handler para obtener recomendaciones de prácticas.

Ubicación: src/app/api/matching/recommendations/route.ts

GET /api/matching/recommendations:
- requireAuth('STUDENT')
- Llamar getRecommendations(user.id)
- Retornar array de internships con matchScore
- Catch: si "Upload your CV first" → 400 con mensaje
```

---

## Paso 6: Conectar Embeddings en Creación de Prácticas

**Prompt para la IA:**
```
Actualiza internships.service.ts para generar embedding al crear una práctica.

En la función createInternship:
- Concatenar: title + " " + description + " " + skills.join(' ')
- Llamar generateEmbedding(textForEmbedding)
- Guardar el embedding en el create de Prisma

Importar generateEmbedding desde '../lib/embeddings'.
Reemplazar el comentario TODO que dejamos antes.
```

---

## Paso 7: Conectar MatchScore en Postulaciones

**Prompt para la IA:**
```
Actualiza applications.service.ts para calcular matchScore al postularse.

En la función applyToInternship:
- Buscar StudentProfile del usuario (con embedding)
- Buscar el Internship (con embedding)
- Si ambos tienen embeddings con datos → calculateMatchScore
- Guardar matchScore en la application

Importar calculateMatchScore desde '../lib/embeddings'.
Reemplazar el comentario TODO que dejamos antes.
```

---

## Paso 8: Regenerar Seed con Embeddings

**Prompt para la IA:**
```
Actualiza prisma/seed.ts para generar embeddings en las prácticas del seed.

IMPORTANTE: el seed no puede importar desde src/ con alias @/ porque tsx
no resuelve esos paths. Implementar generateEmbedding inline en el seed
usando fetch directamente.

URL: https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5
Body: { inputs: text.slice(0, 512) }
Response: number[][] → tomar result[0]

Cambios en el upsert de cada práctica:
- update: { embedding }  (no dejar vacío — si ya existe, actualizar el embedding)
- create: { ...internship, embedding }

Agregar console.log para ver progreso y dimensiones del embedding generado.
NOTA: Esto hace 6 llamadas a HuggingFace, tarda ~30 segundos.
```

```bash
pnpm db:seed
# Debe mostrar: → embedding generado: 384 dims (para cada práctica)
```

---

## Paso 9: Verificación

```bash
pnpm dev

# 1. Login como estudiante → /dashboard/estudiante
# ✅ Banner "Sube tu CV" visible
# 2. Subir un PDF con CV real
# ✅ Muestra "CV procesado correctamente — El matching IA está activo"
# 3. Tab "Recomendadas" → prácticas con porcentajes de afinidad
# 4. Ir a /practicas → postularse a una práctica
# ✅ La postulación tiene matchScore en el dashboard
# 5. Login como empresa → ver postulantes → scores visibles

# Verificar en Prisma Studio:
pnpm db:studio
# student_profiles → embedding debe tener 384 valores
# internships → embedding debe tener 384 valores
# applications → matchScore debe tener un valor
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ Spec SDD del sistema de matching documentada
- ✅ Unit tests de calculateMatchScore y getRecommendations en verde (11 tests)
- ✅ Embeddings con HuggingFace (BAAI/bge-small-en-v1.5, 384 dims)
- ✅ Parser de CV con require() dinámico (pdf-parse v1.1.1 + mammoth)
- ✅ next.config.ts con serverExternalPackages para pdf-parse y mammoth
- ✅ Upload de CV a Supabase Storage (bucket "documents" con RLS policies)
- ✅ Recomendaciones con ranking por similitud de coseno
- ✅ Prácticas generan embedding al crearse
- ✅ Postulaciones calculan matchScore
- ✅ Seed regenerado con embeddings reales
- ✅ **MATCHING IA FUNCIONANDO** 🤖

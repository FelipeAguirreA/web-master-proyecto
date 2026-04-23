# ADR 006 — Matching con embeddings HuggingFace + cosine similarity

- **Status**: Aceptado (implementado)
- **Fecha**: 2026-04-23
- **Decisores**: equipo core

## Contexto

PractiX necesita un sistema de matching que relacione el CV de un estudiante con las prácticas disponibles, para dos casos de uso:

1. **Recomendaciones personalizadas** al estudiante ("te podrían interesar estas prácticas")
2. **Ranking ATS** para la empresa ("candidatos ordenados por match con la práctica")

Restricciones:

- Sin presupuesto para APIs pagas de embeddings (OpenAI, Cohere)
- Dataset chico, no alcanza para entrenar modelo propio
- Deploy en Vercel con edge + serverless — no corre modelos pesados localmente

Alternativas de aproximación:

- Keyword matching (TF-IDF, BM25) → simple pero no captura sinónimos ("desarrollador" vs "programador")
- Semantic search con embeddings → captura contexto, requiere modelo + storage

## Decisión

**Embeddings semánticos con `sentence-transformers/all-MiniLM-L6-v2` vía HuggingFace Inference API + cosine similarity para el matching.**

### Stack

- **Modelo**: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensiones)
- **Inference**: HuggingFace Inference API (free tier, rate-limited)
- **Storage**: Prisma `Float[]` en `StudentProfile.cvEmbedding` e `Internship.embedding`
- **Similitud**: cosine similarity normalizada a escala 0-100

### Pipeline

1. **Internship**: al crear una práctica en `internships.service.ts → createInternship`, se genera embedding del título + descripción + requisitos
2. **Student CV**: al subir CV (`/api/matching/upload-cv`), `cv-parser.ts` extrae texto de PDF/DOCX, `matching.service.ts` genera embedding y lo guarda en `StudentProfile.cvEmbedding`
3. **Recomendaciones**: cosine similarity entre embedding de CV y todos los embeddings de prácticas activas → top N
4. **Ranking ATS**: combina cosine similarity con scorers individuales (`server/lib/ats/scorers/*`) — skills, experience, education, portfolio, languages — ponderados según configuración de la práctica

### Score ATS

El score final no es solo cosine similarity — es una combinación ponderada (Strategy pattern):

```
finalScore = w_semantic × cosine + w_skills × skillsScorer + w_exp × expScorer + ...
```

Esto permite que la empresa ajuste pesos según lo que le importa para cada práctica.

## Consecuencias

### Positivas

- Matching semántico: captura sinónimos y relaciones contextuales
- Sin dependencia de LLM pago
- 384 dims = ~1.5 KB por embedding → storage manejable en Postgres
- Scorers individuales permiten ajustar peso por práctica (Strategy)
- Embeddings cacheados en DB → matching rápido en lectura

### Negativas / riesgos

- **HuggingFace Inference API** puede ser lenta (cold start) o caer → requiere degradación elegante (fallback a keyword matching + log a Sentry)
- Comparar cosine contra TODOS los embeddings no escala más allá de ~10k prácticas — cuando crezca hay que migrar a pgvector con índices HNSW
- Sin versionado de embeddings: si cambia el modelo en HuggingFace, embeddings viejos dejan de ser comparables
- Calidad del matching depende de la calidad del CV parseado (PDFs mal estructurados dan embeddings ruidosos)

## Alternativas consideradas

- **OpenAI `text-embedding-3-small`**: mejor calidad pero pago. Reevaluar si calidad actual es insuficiente.
- **pgvector** con índice HNSW: necesario cuando pasemos ~10k internships o si latencia crece. Por ahora cosine en memoria alcanza.
- **Full-text search PostgreSQL (ts_vector)**: más rápido pero sin semántica; podría servir de fallback.
- **Custom model fine-tuning**: overkill para el scale actual, requeriría dataset labeled.
- **ElasticSearch**: infra extra sin beneficio significativo a este scale.

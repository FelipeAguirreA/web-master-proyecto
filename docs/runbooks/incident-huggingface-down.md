# Runbook — HuggingFace caído (matching degradado)

> **Severidad**: Media (degradación parcial — el resto del producto funciona)
> **Tiempo de respuesta esperado**: <30 min
> **Last reviewed**: 2026-05-05

## Síntomas

- Users estudiantes reportan: "subí mi CV pero las recomendaciones aparecen vacías"
- Logs server con `module=embeddings level=error` consecutivos: "HuggingFace API error" o "error al generar embedding"
- `POST /api/matching/upload-cv` succeed (200 OK) PERO el `embeddingSize: 0` en la response
- `GET /api/matching/recommendations` retorna `[]` para users que tienen CV subido
- Spike en Sentry con tags relacionados (no hay tag específico aún — agregar a la lista de Sentry alerts si se vuelve recurrente)

**Importante**: el código tiene **graceful degradation** — si HF falla, los embeddings retornan `[]` y el resto de la app sigue funcionando. Login, postulaciones, chat, ATS scoring — todo OK. Lo único afectado es **matching automático**.

## Diagnóstico

1. **HuggingFace status**:
   - https://status.huggingface.co/ — si reportan incident, esperar.
   - `curl -X POST https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5 -H "Authorization: Bearer $HF_KEY" -H "Content-Type: application/json" -d '{"inputs":"test"}'` desde tu terminal.
     - **200 OK** con array de 384 nums → API funciona, problema es del lado nuestro
     - **503 "currently loading"** → modelo en warm-up. Esperar 30-60s y reintentar.
     - **401 Unauthorized** → key revocada o expirada.
     - **429 Too Many Requests** → cuota excedida del free tier (1000 requests/día).

2. **Verificar `HUGGINGFACE_API_KEY` en Vercel env vars**:
   - Estar seteada (no vacía, no `undefined`).
   - Empezar con `hf_`.
   - Si fue rotada recientemente: re-deploy para que las lambdas la lean.

3. **Logs server** estructurados:
   - `module=embeddings level=warn "HUGGINGFACE_API_KEY no configurada"` → key vacía.
   - `module=embeddings level=error "HuggingFace API error" status=503` → modelo en warm-up.
   - `module=embeddings level=error "HuggingFace API error" status=429` → cuota excedida.
   - `module=embeddings level=error "error al generar embedding" err=...` → error de red, timeout, fetch failure.

## Acción inmediata

### Caso A — Modelo en warm-up (status 503 "currently loading")

- **Esperar 30-60s** y reintentar. HF apaga modelos del free tier por inactividad.
- **No hacer nada** — el `processCV` ya retorna `[]` graceful. El user ve recomendaciones vacías hasta que el siguiente upload-cv (rate limit 5/hora) funcione.
- Si querés acelerar: hacer un curl manual al endpoint de HF para "warmear" el modelo, después el próximo upload-cv del user funcionará.

### Caso B — Cuota excedida (status 429)

- Verificar uso en HF dashboard.
- **Free tier**: 1000 requests/día. Si lo excedimos, hay 2 opciones:
  1. **Esperar reset diario** (medianoche UTC).
  2. **Upgrade a Pro Inference** ($9/mes, 20k requests/día).
- **Mitigación**: comunicar a users que el matching está temporalmente desactualizado, **NO bloquear** la app.

### Caso C — Key revocada (status 401)

- Generar nueva key en HF settings.
- Actualizar `HUGGINGFACE_API_KEY` en Vercel env vars.
- Re-deploy (Vercel → Deployments → Redeploy o `vercel --prod`).

### Caso D — HF service caído (status no responde / status > 500 sostenido)

- Confirmar en https://status.huggingface.co.
- **Aceptar la degradación** — el matching automático es nice-to-have. La app sigue funcionando sin él.
- Si dura >2h, considerar:
  - **Banner en `/dashboard/estudiante`** explicando que las recomendaciones están temporalmente desactivadas.
  - **Plan B futuro** (no implementado): cachear embeddings antiguos en Redis para servirlos cuando HF está caído.

## Mitigación

Por prioridad:

1. **Esperar** — la mayoría de los outages de HF duran <30 min y el graceful fallback ya cubre.
2. **Verificar key** — si fue rotación, redeploy.
3. **Upgrade plan** si fue cuota.
4. **Comunicar a users** si el outage dura >2h con un banner de "Recomendaciones temporalmente no disponibles".

## ¿Cuándo NO es un incidente?

- Un user nuevo sube CV y dice "no tengo recomendaciones": **es normal** si el internship no tiene embedding o la similitud es baja. NO escalar.
- `embedding: []` para un user específico: puede ser que su CV sea ilegible (PDF escaneado sin OCR) o muy corto. Ver `cvText` en `prisma.studentProfile` — si `cvText` está vacío, el problema está en `cv-parser`, no en HF.

## Referencias del código

- `src/server/lib/embeddings.ts` — `generateEmbedding()` con graceful fallback
- `src/server/services/matching.service.ts` — `processCV()` y `getRecommendations()`
- `src/app/api/matching/upload-cv/route.ts` — endpoint con rate limit 5/hora/user
- ADR 006: `docs/adr/006-matching-embeddings-huggingface.md` (decisión del modelo `BAAI/bge-small-en-v1.5`)

## Plan B (no implementado, candidato para futuro)

Si HF se vuelve recurrentemente inestable, considerar:

1. **Migrar a OpenAI embeddings** (`text-embedding-3-small`, 1536 dims, $0.02/1M tokens). Más confiable pero requiere cambiar el schema (dim diferente) y re-generar todos los embeddings existentes.
2. **Self-hosted** con `transformers.js` en Vercel Edge Functions. Más latencia pero sin dependencia externa.
3. **Cache de embeddings en Redis** — si HF responde, cachear; si HF cae, servir el último embedding cacheado.

Ninguna es trivial. La graceful degradation actual es suficiente para outages de hasta 2-4h.

## Métricas de éxito del runbook

Si seguir este runbook lleva más de 30 min y la degradación afecta UX significativa, actualizarlo o considerar Plan B.

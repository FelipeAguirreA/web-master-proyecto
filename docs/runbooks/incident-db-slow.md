# Runbook — DB lenta o saturada

> **Severidad**: Alta (degradación) — Crítica (caída total)
> **Tiempo de respuesta esperado**: <10 min
> **Last reviewed**: 2026-05-05

## Síntomas

- Health check `/api/health` retorna **503 con `services.database: error`** (Sentry alert `health: db_down`)
- P95 de endpoints API >2s sostenido (NFR target es <200ms)
- Spike de `INTERNAL_ERROR` 500 en endpoints que tocan DB pesada: `POST /api/ats/score/job/[jobId]`, `GET /api/matching/recommendations`, `POST /api/applications`
- Logs server con `module=rate-limit` `level=error` "Upstash error, fail-open" sostenido (Upstash y DB suelen caer juntos cuando el problema es regional)
- Errores Prisma: `P1001` (can't reach DB), `P1008` (timeout), `P2024` (timed out fetching connection from pool)
- Connection pool de Supabase pgBouncer al 90%+ en su dashboard

## Diagnóstico — orden de chequeo

1. **`/api/health`**:

   ```
   curl https://<deploy>.vercel.app/api/health
   ```

   Si `database: error` → confirma DB inaccesible. Si `database: ok` pero P95 alto → DB responde pero está saturada.

2. **Supabase dashboard** → Database → métricas:
   - **CPU** del DB pooler (debería estar <70%)
   - **Connections active** (límite del plan — Free: 60, Pro: 200, etc.)
   - **Query duration P95** — si subió 5x del baseline, hay un query slow culpable

3. **Sentry Performance** (si `tracesSampleRate` está activo):
   - Filtrar por transaction name → ordenar por P95 desc → identificar el endpoint culpable
   - Inspeccionar spans Prisma — el query exacto que está lento

4. **Logs server**:

   ```
   module=embeddings level=error  → si HF también falló es el origen, ver hf-down.md
   transaction failed             → updateMany/deleteMany lentos en notifications/read-all
   query timeout                  → match con P2024 de Prisma
   ```

5. **Endpoints que típicamente saturan**:
   - `POST /api/ats/score/job/[jobId]` — rescoreaba TODAS las apps; ya tiene batch de 5 (#F4) + rate limit 5/min/user. Si igual satura → bajar batch a 3.
   - `GET /api/matching/recommendations` — `findMany` SIN paginación carga todas las internships APPROVED. NFR pendiente.
   - `PATCH /api/notifications/read-all` — `updateMany` sobre todas las unread del user.

## Acción inmediata

### Caso A — DB completamente caída (`/api/health` retorna 503 sostenido)

1. **Supabase status** → si reportan incident, esperar y comunicar a users.
2. Si Supabase está OK pero nuestra DB no responde:
   - Verificar `DATABASE_URL` en Vercel env vars — ¿algún cambio reciente?
   - SSH a Supabase via dashboard → reiniciar pooler (`Database → Pooler → Restart`).
   - **No reiniciar la instancia entera** salvo que el pooler restart no funcione (el restart de instancia puede tomar 5-10 min y bota TODO).

### Caso B — DB lenta pero respondiendo

1. **Identificar query culpable** — Supabase Logs → SQL → ordenar por duration desc.
2. **Si es un endpoint específico**:
   - **Pause endpoint pesado** temporalmente: en Vercel, agregar feature flag o devolver 503 desde el handler. Si es `score/job` → bajar batch a 3 desde `src/app/api/ats/score/job/[jobId]/route.ts:13`.
   - **Kill queries activos** desde Supabase SQL editor:
     ```sql
     SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE state = 'active' AND query LIKE '%<patrón_culpable>%';
     ```

3. **Si el pool está saturado** (connections al 90%+):
   - **Scale up** el plan de Supabase si es plan Free → Pro instantáneo.
   - **O bajar concurrencia**: en `score/job` cambiar `BATCH_SIZE = 5` → `3`.

### Caso C — Migration en curso (raro pero pasa)

- Verificar si alguien está corriendo `prisma db push` o `prisma migrate deploy` contra prod.
- Si sí: dejar terminar (kill puede dejar la DB en estado inconsistente).
- Si fue accidental: ejecutar rollback inverso o restore de snapshot.

## Mitigación

Por prioridad:

1. **Restart pooler de Supabase** (~30s). Resuelve la mayoría de issues de pool/connections.
2. **Kill query culpable** (segundos).
3. **Pause endpoint pesado** vía feature flag o deploy de cambio mínimo (~3 min).
4. **Scale up** plan Supabase si el pool size es el límite (Free → Pro).
5. **Restaurar de snapshot** si hay corrupción (último recurso, RTO ~10 min).

## Prevención (post-mortem)

- **Si fue un endpoint pesado** que ya conocíamos (recommendations sin paginación, score/job N=200): priorizar el fix en backlog.
- **Si fue un query slow nuevo**: agregar el index correspondiente (Supabase → Database → Indexes).
- **Si fue saturación de pool**: verificar el `connection_limit` en `DATABASE_URL` (default 5 en Prisma vs lo que pgBouncer puede dar). Aumentar si hay headroom.
- **Activar Sentry Performance** con `tracesSampleRate: 0.05` (5%) para tener data histórica de slow queries.

## Métricas que deberíamos estar viendo

- **P95 API < 200ms** (NFR del refactor-plan, Fase 6)
- **DB connection pool < 70%** sostenido
- **DB CPU < 60%** sostenido
- **Slow query count = 0** (queries >1s)

## Referencias del código

- `src/app/api/health/route.ts` — health check (#L1)
- `src/server/lib/db.ts` — Prisma singleton (`globalThis` en dev)
- `src/app/api/ats/score/job/[jobId]/route.ts` — batch ATS (#F4)
- `src/server/services/matching.service.ts:getRecommendations` — query sin paginación (anotado para sweep funcional)

## Métricas de éxito del runbook

Si seguir este runbook lleva más de 10 min, actualizarlo con la información que faltó.

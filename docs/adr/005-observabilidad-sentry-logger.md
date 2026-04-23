# ADR 005 — Observabilidad con Sentry + logger estructurado

- **Status**: Aceptado (parcial; logger estructurado y alertas en Fase 6)
- **Fecha**: 2026-04-23
- **Decisores**: equipo core

## Contexto

Sentry ya está instalado (`@sentry/nextjs`), con `instrumentation.ts` e `instrumentation-client.ts`, `global-error.tsx` y upload de source maps en build. El `src/proxy.ts` ya genera un `x-request-id` por request.

Gaps actuales:

- El logging en services y routes usa `console.error` / `console.log` directo → logs no estructurados, difíciles de filtrar en Vercel logs.
- `x-request-id` no se propaga al logger ni a Sentry → no hay correlación entre un error del frontend y el stack del backend.
- No hay alertas configuradas en el dashboard de Sentry → un error rate del 10% pasa desapercibido hasta que un usuario reporta.

NFR de disponibilidad: 99.9% (≤ 8h 45min downtime / año). Sin detección proactiva esto es imposible de garantizar.

## Decisión

**Usar Sentry para error tracking + performance + releases, y `pino` como logger estructurado. Propagar `requestId` en ambos.**

### Logger

- Librería: `pino` (JSON logs nativos, fast, minimal allocations)
- Wrapper en `src/server/lib/logger.ts`:

  ```ts
  logger.info({ requestId, userId, route }, "upload cv start");
  logger.error({ requestId, error }, "huggingface inference failed");
  ```

- `console.*` directo prohibido en `src/**` salvo `prisma/seed.ts` y scripts de una sola ejecución.
- ESLint rule `no-console` activa con exception para scripts.

### Correlation

- `src/proxy.ts` ya genera `x-request-id` → propagarlo:
  - Al logger: middleware setea un `AsyncLocalStorage` con `requestId` que el logger lee automáticamente
  - A Sentry: `Sentry.setContext("request", { id: requestId })` en el handler del route

### Sentry alertas (configurar en dashboard)

- **Error rate > 1%** en ventana de 5 min → notify (email/Slack)
- **P95 latency > 200ms** sostenido 10 min → notify
- **Failed logins > 10/min desde la misma IP** → notify + considerar rate limit dinámico
- **New issue (primera vez que aparece un error)** → notify siempre

### Sentry releases

- Cada commit a `master` genera un release en Sentry usando el SHA del commit
- Source maps uploadeados con el nombre del release (ya configurado en `next.config.ts` con `withSentryConfig`)
- Stack traces en prod son navegables a nivel de código fuente

## Consecuencias

### Positivas

- Logs filtrables por `requestId`, `userId`, `route` en Vercel o Datadog
- Correlación end-to-end entre error de frontend, stack de backend y trace en Sentry
- Detección proactiva de degradación antes del reporte de usuarios
- Stack traces en prod utilizables (no minified)

### Negativas / riesgos

- Un paso extra al loguear (import + structured call)
- Alertas mal calibradas pueden generar ruido (mitigable con refine iterativo)
- Free tier de Sentry tiene límite de eventos — si se excede, sampling agresivo o upgrade

## Alternativas consideradas

- **Solo Sentry sin logger estructurado**: pierde visibilidad de INFO/DEBUG (Sentry captura errores, no todo el flow).
- **Datadog / New Relic**: overkill y costoso para el scale actual; reevaluar si crecemos.
- **Winston**: más configurable pero menor performance y más dependencias que pino.
- **Axiom**: considerado, free tier generoso, reevaluar si pino + Vercel logs se quedan cortos.

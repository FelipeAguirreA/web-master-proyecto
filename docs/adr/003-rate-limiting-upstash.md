# ADR 003 — Rate limiting con Upstash Redis

- **Status**: Propuesto (implementación en Fase 3 del refactor)
- **Fecha**: 2026-04-23
- **Decisores**: equipo core

## Contexto

Hoy el rate limiting está implementado in-memory en `src/server/lib/rate-limit.ts`:

```ts
const store = new Map<string, RateLimitEntry>();
```

Vercel deploya la aplicación en múltiples instancias (edge runtime + serverless functions que se instancian on-demand). Cada instancia tiene su propio `Map`, por lo que el límite efectivo por usuario es `limit × N_instancias`. **El rate limit actual no protege**.

OWASP A04 (Insecure Design) y A07 (Authentication Failures) requieren rate limit efectivo en endpoints sensibles: login, forgot-password, reset-password, upload-cv, endpoints de creación de recursos.

## Decisión

**Migrar el rate limiting a Upstash Redis usando `@upstash/ratelimit`.**

- Backend: Upstash Redis (free tier: 10k requests/día, suficiente para el volumen actual)
- Librería: `@upstash/ratelimit` (oficial, algoritmo sliding window)
- Mantener la interfaz pública `rateLimit(identifier, limit, windowMs)` para no tocar callers
- Configuración por endpoint en `src/server/lib/rate-limit.ts`:

  | Endpoint                       | Límite | Ventana | Identifier |
  | ------------------------------ | ------ | ------- | ---------- |
  | `POST /api/auth/login`         | 5      | 1 min   | IP         |
  | `POST /api/auth/forgot`        | 3      | 5 min   | IP + email |
  | `POST /api/auth/refresh`       | 10     | 1 min   | userId     |
  | `POST /api/matching/upload-cv` | 3      | 1 min   | userId     |
  | `POST /api/internships`        | 10     | 1 min   | userId     |

- **Fail-open en caso de caída de Upstash**: si la llamada a Upstash falla, se permite el request pero se loggea el error a Sentry. Un fallo de nuestra infra no debe bloquear a usuarios legítimos.

## Consecuencias

### Positivas

- Rate limit efectivo a través de todas las instancias de Vercel
- Métricas y observabilidad en dashboard de Upstash
- Free tier alcanza para volumen actual sin costo
- Algoritmo sliding window (más preciso que token bucket para abuso progresivo)

### Negativas / riesgos

- Dependencia externa (mitigada con fail-open)
- Latencia adicional por request (~10-30ms hacia Upstash)
- Costo si crece el volumen (pay-as-you-go después del free tier)
- Fail-open implica que un ataque durante caída de Upstash pasa sin límite — mitigable en futuro con segundo layer (Cloudflare edge) si hace falta

## Alternativas consideradas

- **Vercel KV**: mismo backend Redis con API compatible. Alternativa equivalente, elegir por costo o conveniencia — ADR vigente para ambas.
- **Cloudflare Rate Limiting**: requiere mover DNS a Cloudflare, layer extra; considerar si en el futuro se necesita edge-layer.
- **Mantener in-memory**: descartado por el gap técnico explicado en contexto.
- **PostgreSQL con lock**: podría servir pero agrega carga al DB principal, latencia mayor que Redis.

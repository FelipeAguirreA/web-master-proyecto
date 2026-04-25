# ADR 003 — Rate limiting con Upstash Redis

- **Status**: Aceptado, implementado (Fase 3 pasos 3.1 y 3.1.5)
- **Fecha**: 2026-04-23 (decisión) / 2026-04-25 (implementación completa)
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

## Notas de implementación (2026-04-25)

### Paso 3.1 — Migración a Upstash (commit `f256259`, bump 1.5.1 → 1.6.0)

Migración completada de in-memory `Map` a `@upstash/ratelimit` con sliding window. Fallback in-memory automático cuando faltan env vars (dev local). Fail-open en error de Upstash. 4 callers iniciales actualizados con `await`: `internships POST`, `empresa register`, `matching recommendations`, `matching upload-cv`.

### Paso 3.1.5 — Cobertura de endpoints de auth (bump 1.6.0 → 1.7.0)

La tabla original del ADR proponía rate limit para login, forgot, reset. En el commit 3.1 sólo quedaron cubiertos los callers ya existentes; los 3 endpoints de auth quedaron como gap declarado. Este paso lo cierra:

- **`POST /api/auth/forgot-password`**: 3 req / 5 min por IP. Mensaje 429 no referencia el email para no filtrar info al atacante.
- **`POST /api/auth/reset-password`**: 10 req / 5 min por IP. El token (256 bits) es prácticamente inmune por entropía; el rate limit corta el costo de intentos en caso de filtración parcial.
- **`authorize` del CredentialsProvider** (`src/lib/auth.ts`): 5 req / 5 min por **IP + email** (lowercased). Elegimos combo para que un atacante en una IP no pueda DoS-ear logins legítimos de otros usuarios desde la misma IP (caso NAT). Al exceder retorna `null` — NextAuth lo traduce a "credenciales inválidas", indistinguible del caso password incorrecto desde el frontend.

Helper `extractClientIp(req)` agregada al mismo archivo. NextAuth pasa `req.headers` como `Headers` (App Router) o plain object según versión/adapter, así que el helper distingue con `typeof headers.get === "function"`.

**Cambio de la tabla original**: la ventana del login pasó de 1 min → 5 min (más agresivo contra brute-force lento) y se mantienen los límites de forgot/reset. La tabla en `docs/specs/rate-limit.spec.md` es la fuente actualizada.

**Smoke test contra Upstash real** (script `scripts/test-upstash-ratelimit.ts`) corrido en dev: 7 calls con limit=5 → 5 success + 2 blocked, latencia 169-882ms (network round-trip a Upstash) — confirma que la migración funciona end-to-end y no es fallback in-memory.

**No cubierto en este paso** (deferido):

- Logging estructurado del 429 a Sentry (Fase 6 — Observabilidad). Hoy `authorize` loguea con `console.warn`; el resto no loguea.
- E2E con dos POST consecutivos para verificar 429 en CI. Cubrir en Fase 6 si hace falta.

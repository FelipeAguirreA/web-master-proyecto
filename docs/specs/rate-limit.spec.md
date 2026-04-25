# Spec: Rate Limit

Capa de protección contra abuso para endpoints sensibles. Implementación **distribuida** sobre Upstash Redis (sliding window) con **fallback in-memory** automático cuando no hay credenciales (dev local). Decisión arquitectónica documentada en ADR-003.

Vive en `src/server/lib/rate-limit.ts`. Expone dos funciones:

- `rateLimit(identifier, limit, windowMs)` — **async**. Evaluación del límite contra Upstash o fallback.
- `rateLimitResponse(resetAt)` — sync. Helper HTTP para armar la `Response` 429.

## Reglas transversales

- **Sliding window** cuando hay Upstash configurado (algoritmo de `@upstash/ratelimit`). Más preciso que fixed window contra abuso progresivo.
- **Fixed window in-memory** como fallback cuando faltan credenciales (dev local sin Upstash, tests). Mantiene el comportamiento histórico documentado en este spec previo a la migración.
- **Distribución**: con Upstash el conteo es global a través de todas las instancias de Vercel. El fallback in-memory NO comparte estado entre procesos — usar SOLO en dev/test.
- **Fail-open**: si la llamada a Upstash falla (red, timeout, error de servicio), la función retorna `success: true` y loggea a `console.error`. Un fallo de nuestra infra no debe bloquear usuarios legítimos. Riesgo asumido: durante caída de Upstash un atacante puede abusar; mitigación futura es agregar layer en Cloudflare/edge.
- **Async**: la función es asíncrona porque Upstash es network call. Los callers deben usar `await`.
- **No lanza**: siempre retorna un objeto resuelto; el caller decide si propagar 429 o seguir.

## Configuración

Lee al arrancar (vía `src/lib/env.ts`):

| Variable                   | Tipo             | Obligatoria | Efecto                                                                     |
| -------------------------- | ---------------- | ----------- | -------------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | string URL HTTPS | No          | Si está + token presente → usa Upstash. Si falta → fallback in-memory.     |
| `UPSTASH_REDIS_REST_TOKEN` | string no vacío  | No          | Idem (deben venir en par; tener una sin la otra cae al fallback con warn). |

En producción ambas DEBEN estar configuradas. La ausencia se loggea con `console.warn` al primer uso.

---

## rateLimit(identifier, limit, windowMs)

**Propósito**: Determinar si un identifier puede seguir haciendo requests dentro de la ventana.

**Parámetros**:

- `identifier: string` — clave de agrupación (IP, userId, o `IP:email` según endpoint; ver tabla en ADR-003).
- `limit: number` — máximo de requests permitidas por ventana.
- `windowMs: number` — duración de la ventana en milisegundos.

**Retorno**: `Promise<{ success: boolean; remaining: number; resetAt: number }>`

- `success`: `true` si la request está dentro del límite, `false` si lo excede.
- `remaining`: cuántas requests quedan disponibles en la ventana actual (nunca negativo; `0` cuando se alcanza el límite).
- `resetAt`: timestamp epoch ms en el que se resetea la ventana del identifier (con sliding window de Upstash, indica cuándo el contador habrá decaído lo suficiente para volver a permitir requests).

**Comportamiento — modo Upstash (config presente)**:

| Caso                                 | Efecto                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Request OK contra Upstash            | Retorna `{ success, remaining, resetAt }` derivados de la respuesta de `Ratelimit.limit()`.                    |
| Error de red / Upstash 5xx / timeout | Fail-open: retorna `{ success: true, remaining: limit - 1, resetAt: now + windowMs }`. Loggea `console.error`. |

**Comportamiento — modo fallback in-memory (config ausente)**:

| Caso                                            | Efecto                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| Primera request del identifier                  | Crea entry `{ count: 1, resetAt: now + windowMs }`. Retorna `success: true`.    |
| Identifier con entry vigente y `count < limit`  | Incrementa `count`. Retorna `success: true`, `remaining = limit - count`.       |
| Identifier con entry vigente y `count >= limit` | NO incrementa. Retorna `success: false`, `remaining: 0`, `resetAt` de la entry. |
| Identifier con entry vencida (`resetAt <= now`) | Trata como primera request: reemplaza entry con `{ count: 1, resetAt: nuevo }`. |
| Side effect en cada llamada                     | Borra todas las entries del store con `resetAt <= now` (cleanup global lazy).   |

**Reglas de negocio (ambos modos)**:

- Dos identifiers distintos no se afectan entre sí — cada uno lleva su ventana.
- El `resetAt` devuelto en `success: false` es útil para construir el header `Retry-After` (lo consume `rateLimitResponse`).
- No hay distinción por endpoint dentro de la función: el caller elige `limit` y `windowMs` según el endpoint (ver tabla en ADR-003).

---

## rateLimitResponse(resetAt)

**Propósito**: Construir la `Response` HTTP 429 estándar cuando `rateLimit` retorna `success: false`.

**Parámetros**:

- `resetAt: number` — timestamp epoch ms en el que expira la ventana (viene de `rateLimit`).

**Retorno**: `Response` (síncrono — no requiere await).

- `status: 429`
- Body JSON: `{ error: "Demasiadas solicitudes. Intentá de nuevo en N segundos." }` donde `N = Math.ceil((resetAt - Date.now()) / 1000)`.
- Headers:
  - `Content-Type: application/json`
  - `Retry-After: N` (segundos enteros, mismo valor que en el mensaje).

**Reglas de negocio**:

- Mensaje en español rioplatense ("Intentá", no "Intenta") — convención del repo.
- `Math.ceil` asegura que `Retry-After` nunca sea `0` mientras quede algún ms en la ventana — evita loops de reintento inmediato.
- No toca Sentry ni logging — el caller decide si loggear el 429 (deferido a Fase 6).

---

## Patrón de uso esperado

```ts
const ip = request.headers.get("x-forwarded-for") ?? "unknown";
const { success, resetAt } = await rateLimit(`login:${ip}`, 5, 60_000);

if (!success) {
  return rateLimitResponse(resetAt);
}
// continuar con lógica del endpoint
```

---

## Callers cubiertos

| Endpoint                             | Limit | Ventana | Identifier              | Comportamiento al 429                                                                                             |
| ------------------------------------ | ----- | ------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/empresa/register`    | 3     | 1 hora  | IP                      | `rateLimitResponse` (429 + Retry-After).                                                                          |
| `POST /api/auth/forgot-password`     | 3     | 5 min   | IP                      | `rateLimitResponse` (429 + Retry-After). Mensaje no referencia el email.                                          |
| `POST /api/auth/reset-password`      | 10    | 5 min   | IP                      | `rateLimitResponse` (429 + Retry-After). Defensa adicional al token de 256 bits.                                  |
| `authorize` del CredentialsProvider  | 5     | 5 min   | IP + email (lowercased) | `null` (NextAuth lo traduce a "credenciales inválidas"). Loguea `console.warn`. No filtra existencia del usuario. |
| `POST /api/internships`              | 10    | 1 min   | userId                  | `rateLimitResponse`.                                                                                              |
| `POST /api/matching/recommendations` | 10    | 1 min   | userId                  | `rateLimitResponse`.                                                                                              |
| `POST /api/matching/upload-cv`       | 5     | 10 min  | userId                  | `rateLimitResponse`.                                                                                              |

**Decisiones de identifier**:

- **Login `IP + email`**: combo limita ataques distribuidos por user sin que un atacante de una IP afecte logins legítimos de otros users desde la misma IP (ej. office NAT).
- **Forgot/reset por IP**: el atacante no se autentica todavía, así que userId no aplica. IP es lo más restrictivo razonable.
- **Mutaciones autenticadas por userId**: el atacante ya pasó auth; limitar por IP castigaría a usuarios legítimos detrás del mismo NAT.

## Casos NO cubiertos por este spec

- **Whitelisting**: no hay bypass por rol/IP. Si se agrega, va en el caller.
- **Rate limit distribuido por usuario + global**: hoy el caller compone identifiers, la función no tiene awareness de multi-nivel.
- **Logging estructurado del 429 a Sentry**: deferido a Fase 6 (Observabilidad). Hoy `authorize` loguea con `console.warn`; el resto no loguea el 429.

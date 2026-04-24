# Spec: Rate Limit

Capa de protección contra abuso para endpoints sensibles. Implementación actual **in-memory** — **no efectiva en producción multi-instancia** (ver ADR-003 para migración a Upstash Redis, estado Propuesto).

Vive en `src/server/lib/rate-limit.ts`. Expone dos funciones puras:

- `rateLimit(identifier, limit, windowMs)` — evaluación del límite.
- `rateLimitResponse(resetAt)` — helper HTTP para armar la `Response` 429.

## Reglas transversales

- **Ventana fija (fixed window)**, no sliding. Cada identifier acumula `count` durante `windowMs`; al vencer la ventana se resetea completo.
- **Store in-memory**: `Map<string, { count, resetAt }>` global al proceso. NO comparte estado entre instancias de Vercel (por eso la ADR-003).
- **GC lazy**: cada llamada barre el Map y borra entries vencidas (`resetAt <= now`) para evitar memory leak.
- **No lanza**: siempre retorna un objeto; el caller decide si propagar 429 o seguir.

---

## rateLimit(identifier, limit, windowMs)

**Propósito**: Determinar si un identifier puede seguir haciendo requests dentro de la ventana.

**Parámetros**:

- `identifier: string` — clave de agrupación (IP, userId, o `IP:email` según endpoint; ver ADR-003 tabla).
- `limit: number` — máximo de requests permitidas por ventana.
- `windowMs: number` — duración de la ventana en milisegundos.

**Retorno**: `{ success: boolean, remaining: number, resetAt: number }`

- `success`: `true` si la request está dentro del límite, `false` si lo excede.
- `remaining`: cuántas requests quedan disponibles en la ventana actual (nunca negativo; `0` cuando se alcanza el límite).
- `resetAt`: timestamp epoch ms en el que se resetea la ventana del identifier.

**Comportamiento**:

| Caso                                            | Efecto                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| Primera request del identifier                  | Crea entry `{ count: 1, resetAt: now + windowMs }`. Retorna `success: true`.    |
| Identifier con entry vigente y `count < limit`  | Incrementa `count`. Retorna `success: true`, `remaining = limit - count`.       |
| Identifier con entry vigente y `count >= limit` | NO incrementa. Retorna `success: false`, `remaining: 0`, `resetAt` de la entry. |
| Identifier con entry vencida (`resetAt <= now`) | Trata como primera request: reemplaza entry con `{ count: 1, resetAt: nuevo }`. |
| Side effect en cada llamada                     | Borra todas las entries del store con `resetAt <= now` (cleanup global).        |

**Reglas de negocio**:

- Dos identifiers distintos no se afectan entre sí — cada uno lleva su ventana.
- El `resetAt` devuelto en `success: false` es útil para construir el header `Retry-After` (lo consume `rateLimitResponse`).
- No hay distinción por endpoint dentro de la función: el caller elige `limit` y `windowMs` según el endpoint (ver tabla en ADR-003).

---

## rateLimitResponse(resetAt)

**Propósito**: Construir la `Response` HTTP 429 estándar cuando `rateLimit` retorna `success: false`.

**Parámetros**:

- `resetAt: number` — timestamp epoch ms en el que expira la ventana (viene de `rateLimit`).

**Retorno**: `Response` con:

- `status: 429`
- Body JSON: `{ error: "Demasiadas solicitudes. Intentá de nuevo en N segundos." }` donde `N = Math.ceil((resetAt - Date.now()) / 1000)`.
- Headers:
  - `Content-Type: application/json`
  - `Retry-After: N` (segundos enteros, mismo valor que en el mensaje).

**Reglas de negocio**:

- Mensaje en español rioplatense ("Intentá", no "Intenta") — decisión producto, el proyecto es chileno pero convención del repo.
- `Math.ceil` asegura que `Retry-After` nunca sea `0` mientras quede algún ms en la ventana — evita loops de reintento inmediato.
- No toca Sentry ni logging — el caller decide si loggear el 429.

---

## Patrón de uso esperado

```ts
const ip = request.headers.get("x-forwarded-for") ?? "unknown";
const { success, resetAt } = rateLimit(`login:${ip}`, 5, 60_000);

if (!success) {
  return rateLimitResponse(resetAt);
}
// continuar con lógica del endpoint
```

---

## Casos NO cubiertos por este spec

- **Persistencia cross-instancia**: descripto en ADR-003. La migración a Upstash debe mantener esta interfaz pública para no romper callers.
- **Whitelisting**: no hay bypass por rol/IP. Si se agrega, va en el caller.
- **Rate limit distribuido por usuario + global**: hoy el caller compone identifiers, la función no tiene awareness de multi-nivel.

# Spec: Refresh Tokens (JWT 15min + rotación)

Capa de gestión de tokens de acceso de corta duración (15 min) con refresh tokens rotativos persistidos en DB. Decisión arquitectónica documentada en ADR-002.

Vive en:

- `src/server/services/refresh-tokens.service.ts` — service puro (CRUD + rotación + reuse detection)
- `src/server/lib/auth-jwt.ts` — armado y firma del access JWT
- `src/server/lib/auth-cookies.ts` — nombres y opciones de las cookies
- `src/app/api/auth/refresh/route.ts` — endpoint de refresh
- `src/app/api/auth/logout/route.ts` — endpoint de logout (revoca refresh)
- `src/lib/client/fetch-with-refresh.ts` — wrapper cliente con interceptor 401 + single-flight
- `src/lib/auth.ts` — `events.signIn` que emite el refresh inicial al completar sign-in

## Reglas transversales

- **Access token**: JWT firmado con `NEXTAUTH_SECRET` (`HS256` por default de NextAuth). TTL: **15 minutos**. Cookie `next-auth.session-token` (HTTP) o `__Secure-next-auth.session-token` (HTTPS). `httpOnly`, `sameSite: lax`, `secure` solo bajo HTTPS.
- **Refresh token**: opaco (no JWT) — string hex de 64 chars (32 bytes random). Almacenado **hasheado SHA-256** en tabla `refresh_tokens`. TTL: **7 días**. Cookie `practix.refresh-token` (HTTP) o `__Host-practix.refresh-token` (HTTPS).
- **Rotación**: cada uso del refresh emite uno nuevo y revoca el anterior con `replacedBy` apuntando al sucesor.
- **Reuse detection**: usar un refresh ya revocado dispara revocación masiva de TODOS los tokens activos del user (asume compromiso). El usuario es kickeado al próximo refresh.
- **Anti-loop**: el wrapper cliente NO intercepta 401 de `/api/auth/refresh` ni `/api/auth/logout` para evitar bucles.
- **Single-flight**: si N requests en paralelo fallan con 401, sólo UNA dispara el refresh; el resto espera la misma promesa.
- **Fail-soft en signIn**: si la emisión inicial del refresh falla (DB caída en el momento), NO se bloquea el sign-in — el cliente arranca con cookie de access válida 15 min y al primer refresh fallará → redirect a /login. Mejor degradación parcial que login bloqueado.

## Modelo de datos — `refresh_tokens`

| Campo        | Tipo                | Notas                                       |
| ------------ | ------------------- | ------------------------------------------- |
| `id`         | `String @id cuid()` | PK                                          |
| `userId`     | `String` (FK User)  | `onDelete: Cascade`                         |
| `tokenHash`  | `String @unique`    | SHA-256 del raw token. Nunca el raw.        |
| `expiresAt`  | `DateTime`          | Ahora + 7 días al crear                     |
| `revokedAt`  | `DateTime?`         | `null` = activo. Set al rotar/logout.       |
| `replacedBy` | `String?`           | id del refresh que lo reemplazó (auditoría) |
| `createdAt`  | `DateTime`          | Default now                                 |

Índices: `userId`, `expiresAt`.

## Service `refresh-tokens.service.ts`

### `issueRefreshToken(userId): Promise<{ id, rawToken, expiresAt }>`

Genera 32 bytes random hex, hashea SHA-256, persiste el hash en DB con `expiresAt = now + 7d`. Retorna el raw para enviar al cliente vía cookie. Nunca retorna ni persiste el raw.

### `validateAndRotate(rawToken): Promise<RotationResult>`

Resultado discriminado:

- `{ kind: "ok", token: { userId, rawToken, expiresAt } }` — happy path: el viejo se marca revocado con `replacedBy`, se emite uno nuevo.
- `{ kind: "invalid" }` — raw vacío, hash no existe, o token expirado.
- `{ kind: "reuse-detected", userId }` — el hash existe pero ya estaba revocado. Revoca TODOS los activos del user. El caller debe loguear y limpiar cookies.

### `revokeRefreshToken(rawToken): Promise<void>`

Marca como revocado el activo (idempotente: si ya estaba revocado, noop). Para logout. Noop si raw vacío.

### `revokeAllForUser(userId): Promise<void>`

Revoca todos los activos del user. Útil para kicks administrativos o cambio de password.

## Endpoint `POST /api/auth/refresh`

| Caso                                 | Status | Acción                                                                           |
| ------------------------------------ | ------ | -------------------------------------------------------------------------------- |
| Sin cookie de refresh                | 401    | `{ error: "No hay sesión activa." }`                                             |
| Refresh `kind: "invalid"`            | 401    | Limpia ambas cookies. `{ error: "Sesión inválida o expirada." }`                 |
| Refresh `kind: "reuse-detected"`     | 401    | Limpia cookies + `console.warn` con userId+IP. Mensaje "revocada por seguridad". |
| User borrado entre rotación y lookup | 401    | Limpia cookies. `{ error: "Usuario no encontrado." }`                            |
| OK                                   | 200    | Setea cookies (access + refresh nuevos). Body `{ ok, user: {...} }`.             |
| Excepción                            | 500    | `console.error` + `{ error: "Error interno." }`                                  |

**Rate limit**: 10 req / 1 min por IP (`refresh:${ip}`).

## Endpoint `POST /api/auth/logout`

Lee la cookie del refresh, revoca el token activo, limpia ambas cookies. Retorna 200 incluso si:

- No había cookie (idempotente)
- La revocación falla en DB (mejor cliente con cookie inválida que con cookie válida sin revocar)

## Cliente — `fetchWithRefresh(input, init?)`

### Contrato

- Hace `fetch(input, init)`.
- Si el status NO es 401 → retorna directo.
- Si es 401 y la URL es `/api/auth/refresh` o `/api/auth/logout` → retorna directo (anti-loop).
- Caso contrario: dispara `POST /api/auth/refresh` (single-flight) y reintenta UNA vez.
- Si el refresh falla o el retry vuelve a 401 → `window.location.assign("/login?callbackUrl=...")` preservando pathname + search actual.
- Si ya estamos en `/login` no redirigimos (evita ciclo).

### Single-flight

Variable module-level `refreshPromise`. Si una request crea la promesa, requests subsiguientes esperan la misma. Se limpia al resolver (éxito o error) para permitir nuevos refresh en el futuro.

### NO altera shape del fetch

El wrapper NO añade `credentials: "same-origin"` por default — fetch a mismo origen ya envía cookies por default. Mantener el shape exacto que esperan tests pre-existentes que comparan argumentos con matchers de spy.

### Migrado en

14 archivos del cliente (54 → 50 llamadas, 4 quedaron en páginas `(auth)` que NO usan sesión activa: `login`, `registro`, `forgot-password`, `reset-password`).

## Casos NO cubiertos por este spec

- **Email al user en reuse detection**: deferido. Hoy solo `console.warn`. Sentry + email a Fase 6.
- **Logout global desde admin**: hay `revokeAllForUser` pero no hay endpoint que lo exponga.
- **Listar sesiones activas (UI)**: no hay endpoint hoy.
- **Race condition entre tabs**: cubierta por single-flight DEL MISMO tab. Entre tabs distintos cada uno tiene su propio módulo y puede haber dos refresh concurrentes — está OK, el segundo recibirá el refresh viejo ya revocado y disparará reuse detection. Caso conocido que requiere coordinación BroadcastChannel si se quiere evitar.

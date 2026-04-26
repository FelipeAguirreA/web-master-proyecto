# ADR 002 — Autenticación con NextAuth + JWT rotativo

- **Status**: Aceptado, implementado (Fase 3 paso 3.2)
- **Fecha**: 2026-04-23 (decisión) / 2026-04-25 (implementación)
- **Decisores**: equipo core

## Contexto

Hoy la auth está implementada con NextAuth, usando dos providers: Google OAuth (estudiantes) y Credentials (empresas con email + password + bcrypt). La sesión es JWT con `maxAge: 24 * 60 * 60` (24 horas).

OWASP A01 (Broken Access Control) y A07 (Identification and Authentication Failures) advierten que tokens de larga duración amplían la ventana de ataque cuando uno se compromete. Un access token válido 24 horas sin revocación deja al atacante operar hasta un día completo.

Requisito de seguridad acordado: tokens de acceso expiran en ~15 minutos con refresh token rotativo.

## Decisión

**Migrar a un esquema access token + refresh token, con rotación y reuse detection.**

Concretamente:

- **Access token (JWT)**: `maxAge: 15 * 60` (15 minutos). Firmado con `NEXTAUTH_SECRET`. Incluye `userId`, `role`, `companyStatus`, `registrationCompleted`.
- **Refresh token**: opaco (no JWT), almacenado **hasheado** en DB en una tabla nueva `RefreshToken`:

  ```
  RefreshToken {
    id          String   @id @default(cuid())
    userId      String
    tokenHash   String   @unique
    expiresAt   DateTime
    revokedAt   DateTime?
    replacedBy  String?  // id del refresh que lo reemplazó (reuse detection)
    createdAt   DateTime @default(now())
  }
  ```

- **Refresh endpoint**: `POST /api/auth/refresh` — valida el refresh token (hash compare + `expiresAt` + `revokedAt`), emite un nuevo access + nuevo refresh, marca el viejo como `revoked` con `replacedBy`.
- **Rotación**: cada uso del refresh emite uno nuevo y revoca el anterior.
- **Reuse detection**: si un refresh revocado se intenta usar → se revocan TODOS los refresh tokens del user (asume compromiso) + log a Sentry + email al usuario.
- **Refresh token TTL**: 7 días.
- **Logout**: revoca el refresh token activo (`revokedAt = now()`).

### Frontend

- Cliente intercepta respuestas 401 de API, llama `/api/auth/refresh`, reintenta request original
- Se implementa como helper en `lib/client/fetch-with-refresh.ts`

## Consecuencias

### Positivas

- Ventana de ataque por token comprometido < 15 minutos
- Logout global efectivo (revocando refresh tokens)
- Auditoría de sesiones activas posible (listar `RefreshToken` por user)
- Detección de robo de token (reuse detection corta la cadena)

### Negativas / riesgos

- Complejidad en frontend: lógica de interceptar 401 + refresh + reintento
- Tabla nueva y escritura en DB en cada refresh (mitigable — es una escritura chica, cada 15min por user)
- Si el refresh token se compromete sin ser detectado, el atacante tiene 7 días
- Race conditions posibles si dos tabs refrescan a la vez → resolver con single-flight promise en el cliente

## Alternativas consideradas

- **Mantener JWT 24h sin refresh**: descartado, excede ventana tolerada por la consigna de seguridad.
- **Session tokens opacos + Redis session store**: más seguro (revocación inmediata server-side) pero requiere infra extra hoy innecesaria.
- **Auth0 / Clerk**: costo y vendor lock-in, además de perder control sobre el flow de empresas con password.
- **Session cookie httpOnly sin JWT**: viable pero NextAuth ya arma el JWT flow — cambiar a DB sessions requiere migrar más cosas.

## Notas de implementación (2026-04-25)

Implementado en commit único `feat(auth): JWT 15min + refresh token rotation (Fase 3 paso 3.2)`. Bump 1.7.0 → 1.8.0.

### Lo que coincide con la decisión original

- Access token JWT con `maxAge: 15 * 60` (15 min). Firmado con `NEXTAUTH_SECRET` vía `next-auth/jwt encode()`.
- Refresh token opaco (32 bytes random hex), almacenado hasheado SHA-256.
- Tabla `refresh_tokens` con `id, userId, tokenHash, expiresAt, revokedAt, replacedBy, createdAt`.
- TTL refresh: 7 días.
- Endpoint `POST /api/auth/refresh`.
- Rotación: cada uso emite uno nuevo y revoca el anterior con `replacedBy`.
- Reuse detection: usar refresh revocado revoca TODOS los activos del user (servicio `revokeAllForUser` invocado desde `validateAndRotate`).
- Logout (`POST /api/auth/logout`): revoca refresh activo.
- Cliente: helper `fetch-with-refresh.ts` con interceptor 401 + reintento + redirect a /login. **Single-flight** (una sola promesa de refresh activa por tab).

### Desviaciones / decisiones extra

- **Bootstrap del refresh inicial**: en vez de un endpoint custom de signup, usamos `events.signIn` de NextAuth. Cuando completa cualquier sign-in (Google OAuth o Credentials de empresa), buscamos el `dbUser.id` por email y emitimos refresh + cookie con `cookies()` de `next/headers`. Razón: evita modificar el flow estándar de NextAuth y mantiene compatibilidad con ambos providers.
- **Fail-soft en `events.signIn`**: si la emisión falla (ej. DB momentáneamente abajo en el instante exacto del signin), el sign-in NO se bloquea — el cliente arranca con cookie de access válida 15 min y al primer refresh fallará → redirect a /login. Mejor degradación parcial que login bloqueado.
- **Email al user en reuse detection**: NO implementado en este paso. Hoy se loguea con `console.warn` el `userId+ip`. Sentry + email a Fase 6 (Observabilidad).
- **Race entre tabs**: el single-flight del wrapper es por TAB. Dos tabs concurrentes pueden disparar dos refresh; el segundo recibirá el refresh viejo (revocado por el primero) y caerá en reuse detection. Caso documentado en spec — la mitigación con `BroadcastChannel` se difiere hasta que aparezca como problema real.
- **Cookie names**: `practix.refresh-token` (HTTP) o `__Host-practix.refresh-token` (HTTPS). El prefix `__Host-` exige `secure + path=/ + sin Domain` y es la opción más segura disponible en navegadores modernos.
- **Rate limit refresh**: 10 req / 1 min por IP (en vez de userId como sugería la tabla original) — el endpoint no conoce el userId hasta validar el refresh, y validar bajo rate limit por hash es trivialmente esquivable.

### Verificación

Suite total tras el cambio: **850 tests / 45 archivos** verde. Coverage `functions 100%` (310/310), `lines 99.74%`. Tests nuevos:

- `refresh-tokens.service.test.ts` (19 tests): issue, validate happy path, invalid, reuse detection, rotación, revoke, hashing.
- `auth-cookies.test.ts` (4 tests): nombres y shape de cookies.
- `auth-jwt.test.ts` (8 tests): payload STUDENT/COMPANY, encode delegate.
- `fetch-with-refresh.test.ts` (13 tests): happy path, interceptor 401, redirect, single-flight, anti-loop.
- `auth.test.ts` extendido con 4 tests de `events.signIn` (50 tests totales).

Fuera de scope para este paso:

- E2E del flow refresh end-to-end (deferido a la próxima sesión si hace falta).
- Logger estructurado del 401/reuse a Sentry (Fase 6).

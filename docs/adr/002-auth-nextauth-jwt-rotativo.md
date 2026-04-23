# ADR 002 — Autenticación con NextAuth + JWT rotativo

- **Status**: Propuesto (implementación en Fase 3 del refactor)
- **Fecha**: 2026-04-23
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

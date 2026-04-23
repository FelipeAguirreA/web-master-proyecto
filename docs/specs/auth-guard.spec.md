# Spec: Auth Guard (autorización por rol)

Capa de **autorización** del proyecto (no de autenticación — eso es NextAuth). Define el contrato que usan las API routes y el middleware para garantizar que un usuario solo accede a lo que su rol permite.

Vive en `src/server/lib/auth-guard.ts` (helpers para API routes) y `src/proxy.ts` (middleware Next.js 16, redirects de páginas).

## Reglas transversales

- **Defense in depth (3 capas)**: la autorización por rol se valida en múltiples capas independientes. Cada capa asume que las anteriores pueden faltar (zero trust entre capas).

  | Capa | Archivo                                        | Qué cubre                                                                     |
  | ---- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
  | 1    | `src/proxy.ts` (middleware)                    | Redirects de **páginas**: bloquea navegación cruzada entre dashboards         |
  | 2    | `src/server/lib/auth-guard.ts` (`requireAuth`) | Gate de **API routes**: retorna 401/403 antes de tocar el service             |
  | 3    | API route handler                              | Composición: llama `requireAuth(role)` y propaga el error como `NextResponse` |

- **Servicios no validan rol**: los services en `src/server/services/*` confían en que el caller (API route) ya filtró por rol. Solo validan **pertenencia al recurso** (ej. `userId === conversation.companyId`).
- **Roles soportados**: `STUDENT`, `COMPANY`, `ADMIN`. `ADMIN` se identifica por `email === ADMIN_EMAIL`, no por una columna `role` (decisión histórica — ver `src/lib/auth.ts`).

---

## requireAuth(requiredRole?)

**Propósito**: Garantizar que la request tiene una sesión válida y, opcionalmente, que el usuario tiene el rol esperado.

**Parámetros**:

- `requiredRole?: "STUDENT" | "COMPANY"` — si está, exige que `session.user.role === requiredRole`

**Retorno**: discriminated union

- **Éxito**: `{ session, user: { id, role, email } }`
- **Error**: `{ error: string, status: 401 | 403 }`

**Casos de error**:

- Sin sesión → `{ error: "Unauthorized", status: 401 }`
- Sesión válida pero rol distinto al `requiredRole` → `{ error: "Forbidden", status: 403 }`

**Reglas de negocio**:

- No lanza excepciones — retorna un objeto. La API route discrimina por presencia de `error`.
- Si `requiredRole` es undefined, solo exige sesión (no chequea rol). Útil para endpoints abiertos a STUDENT y COMPANY (ej. lectura de conversación).
- El caller es responsable de mapear `{ error, status }` a `NextResponse.json({ error }, { status })`.

**Patrón de uso esperado en API route**:

```ts
const auth = await requireAuth("COMPANY");
if ("error" in auth) {
  return NextResponse.json({ error: auth.error }, { status: auth.status });
}
// auth.user.id, auth.user.role disponibles aquí
```

---

## requireAdmin()

**Propósito**: Variante de `requireAuth` para endpoints exclusivos del admin (panel `/admin/*`).

**Parámetros**: ninguno.

**Retorno**: igual contrato que `requireAuth` (discriminated union éxito | error).

**Casos de error**:

- Sin sesión → `{ error: "Unauthorized", status: 401 }`
- Sesión válida pero `email !== ADMIN_EMAIL` → `{ error: "Forbidden", status: 403 }`

**Reglas de negocio**:

- El admin se identifica por **email constante** (`ADMIN_EMAIL` exportado desde `src/lib/auth.ts`), no por `role`. Esto es deliberado: el admin del proyecto es uno solo y se cambia rotando el constante (no creando users con role `ADMIN`).
- Implicación: si en el futuro hay múltiples admins, esta función debe migrarse a chequear una flag/role real.

---

## Middleware (`src/proxy.ts`) — gates de página

El middleware NO usa `requireAuth` (vive en edge runtime previo, sin acceso a la DB). Replica las reglas leyendo el JWT directo.

**Casos cubiertos** (en orden de evaluación):

| #   | Condición                                                                  | Acción                                      |
| --- | -------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | Pathname empieza con `/api/`                                               | Pasa (auth se valida por route)             |
| 2   | Sin token Y pathname empieza con `/dashboard` o `/registro`                | Redirect a `/login`                         |
| 3   | Sin token Y pathname público                                               | Pasa                                        |
| 4   | `role === "STUDENT"`, `registrationCompleted === false`, no en `/registro` | Redirect a `/registro` (gate de onboarding) |
| 5   | `role === "STUDENT"`, `registrationCompleted === true`, en `/registro`     | Redirect a `/dashboard/estudiante`          |
| 6   | Pathname `/dashboard/empresa` Y `role !== "COMPANY"`                       | Redirect a `/dashboard/estudiante`          |
| 7   | Pathname `/dashboard/estudiante` Y `role !== "STUDENT"`                    | Redirect a `/dashboard/empresa`             |

**Side effects**:

- Cada response recibe header `x-request-id: <uuid>` para correlación con Sentry y logs.

**Reglas de negocio**:

- El middleware NO valida rol para `/admin/*` — eso lo hace `requireAdmin()` en cada page server component (decisión: el middleware no debe conocer al admin por email).
- Matcher excluye `_next/static`, `_next/image`, `favicon.ico`, `api/health`, `api/auth` (estos no necesitan request-id ni gates).

---

## Casos de ataque cubiertos

| Ataque                                                                 | Capa que lo bloquea                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Estudiante navega a `/dashboard/empresa/ats/jobId`                     | Middleware (capa 1) — redirect                                           |
| Estudiante hace `POST /api/chat/conversations` (endpoint COMPANY-only) | `requireAuth("COMPANY")` (capa 2) — 403                                  |
| Empresa intenta leer mensajes de una conversación que no le pertenece  | Service (`getMessages` chequea pertenencia) — 403 propagado por la route |
| User no autenticado intenta `GET /api/chat/conversations/:id`          | `requireAuth()` (capa 2) — 401                                           |
| User con sesión expirada                                               | `getAuthSession()` retorna null → `requireAuth` → 401                    |

## Casos NO cubiertos por este spec

- **Rate limiting**: ver `src/server/lib/rate-limit.ts` y ADR-003.
- **CSRF**: NextAuth maneja tokens CSRF en sus propias routes; las API routes propias dependen de cookies same-site (default Next.js).
- **Refresh token rotation**: pendiente (ver ADR-002, status Propuesto).

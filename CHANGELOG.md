# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.18] - 2026-05-05

### Cleanup

- **Fase 4 paso 1: knip dead code sweep**. Instalado `knip@^6.11.0` como devDep + script `pnpm knip`. Configurado `knip.json` con entries Next.js (`page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`, `not-found.tsx`, `proxy.ts`, `instrumentation*.ts`) + ignore para `.husky/**`, `src/test/mocks/**`, `.next/**`, `coverage/**`. Salida final de knip: **0 findings** (100% clean).

#### Findings cerrados

- **Unused exports privatizados (1 const + 11 types)** — exports que solo se usaban dentro de su propio archivo. Cambiados a non-exported (interno):
  - `src/server/lib/storage.ts`: `supabase` (const) → privado.
  - `src/hooks/useNotifications.ts`: `AppNotification` (type) → privado.
  - `src/server/lib/auth-cookies.ts`: `CookieOptions` (interface) → privado.
  - `src/server/lib/auth-jwt.ts`: `JwtPayload` (interface) → privado.
  - `src/server/lib/ats/preset-modules.ts`: `ModuleType`, `PresetModule` → privados (la const `PRESET_MODULES` se mantiene exportada — sí se usa desde el dashboard).
  - `src/server/lib/ats/scoring-engine.ts`: `ModuleScoreDetail`, `ATSResult` → privados (los callers usan inferencia desde `scoreApplication()`).
  - `src/server/services/chat.service.ts`: `ChatErrorCode` → privado.
  - `src/server/services/interviews.service.ts`: `InterviewErrorCode` → privado.
  - `src/server/services/refresh-tokens.service.ts`: `IssuedRefreshToken`, `RotatedRefreshToken`, `RotationResult` → privados (callers usan inferencia).

- **Tipos verdaderamente muertos eliminados** en `src/types/index.ts`: `User`, `StudentProfile`, `CompanyProfile`, `PaginatedResponse`. Confirmado con `Grep` que ningún módulo los importaba (las apariciones de "StudentProfile" en `users.service.ts` eran del tipo `StudentProfileInput` — no relacionado). Quedan exportados solo `Internship` y `Application` (sí se usan desde el frontend en `practicas/`, `dashboard/estudiante/`, `InternshipCard.tsx`).

- **Boy-scout: `postcss` agregado a devDependencies**. Antes era transitivo via `tailwindcss@4` — funcionaba, pero `postcss.config.mjs` lo invocaba sin estar declarado. knip lo flaggeaba como "unlisted dependency". Ahora explícito (`postcss@8.5.12`).

- **Falsos positivos silenciados en knip.json** — `lint-staged` y `tailwindcss` agregados a `ignoreDependencies` (lint-staged se invoca via husky pre-commit, tailwind se usa via `globals.css` y postcss). `lint-staged` también en `ignoreBinaries`. `.husky/**` agregado a `ignore` para evitar que knip flagee el binary del pre-commit hook.

### Tests

- Suite total: **1097 tests / 57 archivos** verde (sin cambios — el sweep no introdujo ni rompió tests, los exports privatizados se usaban solo internamente).
- TSC clean ✅.

### Notes

- **Decisión "privatizar vs eliminar"**: para los types que solo se usaban dentro de su archivo, decidimos quitar el `export` (mantener la definición pero hacerla local) en lugar de eliminar la definición misma. Razón: los types describen el contrato interno del módulo y siguen siendo útiles para la legibilidad y para el tipado interno. Solo eliminamos definiciones cuando NADIE las usa (los 4 types muertos de `src/types/index.ts`).
- **`ChatErrorCode` y `InterviewErrorCode` privatizados**: estos los exporté yo en los audits de Fase 3 paso 3.7 (1.10.11 y 1.10.13) pensando en consumers externos del service, pero ningún caller real los importó. YAGNI — quedan privados. Si en el futuro un test o handler los necesita, se re-exporta.
- **knip 6.x**: la versión 6 tiene auto-detection muy buena de Next.js, Vitest, Playwright, Prisma, Sentry. Casi no necesita config explícita más allá de `entry`/`project`/`ignore`.
- **Próximo paso**: Fase 4 lote 2 — reorganización de `src/lib/` (mover `auth.ts` a `server/lib/`, mover `supabase/realtime-client.ts` a `client/`).

## [1.10.17] - 2026-05-05

### Security

- **Hardening en `/api/health` (Fase 3 paso 3.7 / finding #L1) + CIERRE COMPLETO DEL PASO 3.7** — duodécimo y último lote del audit `/api/*`. Inventario coincide con el real: 1 handler. Endpoint público intencional para load balancers, k8s probes, status pages, monitoring externo. Área cerrada con un finding 🛑 + tres ⚠️ aceptados intencional.
  - **#L1 — `catch {}` swallowed sin Sentry en el ping a la DB**. Severidad **alta** — observability gap crítico. **El endpoint que monitorea health era el único que NO le avisaba a Sentry cuando la DB caía**. Si pgBouncer se desconectaba, Supabase tenía un incidente, o el connection pool se saturaba, el cliente recibía `503 degraded` correctamente — pero ningún alert llegaba a Sentry/oncall. **Ironía**: el endpoint diseñado para detectar problemas era el que más silenciaba el problema. Patrón #J1 (catch silencioso) elevado a severidad alta porque acá es **literalmente el work del endpoint**. Fix: `Sentry.captureMessage("Health check: DB ping failed", { level: "error", tags: { health: "db_down" }, extra: { error: ... } })` en el catch. El cliente sigue recibiendo el response degraded sin leak del error crudo, pero Sentry/oncall ahora se enteran inmediatamente. Defensa robusta contra Error y string-throws (algunos drivers tiran strings o objetos custom).

### Tests

- Suite total: **1097 tests / 57 archivos** verde (antes 1092 / 56). Nuevo archivo `src/test/unit/health-route.test.ts` (5 tests):
  - 200 ok cuando DB responde — Sentry NO se llama.
  - **503 degraded cuando DB falla** — Sentry recibe `captureMessage` con `level=error` + `tags: { health: "db_down" }`.
  - Response shape: timestamp ISO + version semver.
  - **Sentry recibe el error crudo en `extra`, cliente NO lo ve** (no leak).
  - Defensa contra string-throws (algunos drivers tiran strings, no Error instances).
- `src/test/mocks/prisma.ts`: agregado `$queryRaw` al mock con el mismo patrón que `$transaction` (no enumerable, mockReset en `resetPrismaMock`). Útil para futuros tests que necesiten queries raw.

### Notes

- **Observability es seguridad**: un sistema que falla silenciosamente es indistinguible de un sistema bajo ataque. Cualquier `catch` sin Sentry/logger en producción es una superficie ciega — y los endpoints de monitoring son los más críticos porque su fallo es difícil de detectar.
- **#L2/#L3/#L4 aceptados intencional**: público sin auth (load balancers, status pages necesitan acceder), sin rate limit (polled cada 5-30s por monitoring externo), version leak (estándar de la industria — k8s, GitHub, npm packages todos exponen version en healthchecks). Documentados.

---

### ✅ Cierre del paso 3.7 (Fase 3 — Seguridad)

**Estado final**: 12/12 áreas auditadas y cerradas a lo largo de los bumps 1.10.5 → 1.10.17.

| Versión | Área            | Findings 🛑                           | Findings ⚠️   |
| ------- | --------------- | ------------------------------------- | ------------- |
| 1.10.5  | `auth`          | #A2                                   | #A1           |
| 1.10.6  | `admin`         | #B1, #B2, #B3                         | —             |
| 1.10.7  | `users`         | #C1 (eliminado)                       | —             |
| 1.10.8  | `applications`  | #D1, #D2, #D3, #D4                    | —             |
| 1.10.9  | `internships`   | #E1, #E2, #E3, #E4                    | #E5           |
| 1.10.10 | `ats`           | #F1, #F2, #F3, #F4, #F5               | —             |
| 1.10.11 | `chat`          | #G1, #G2, #G3, #G4                    | #G5           |
| 1.10.13 | `interviews`    | #H1, #H2, #H3, #H4                    | #H5           |
| 1.10.14 | `notifications` | #I1, #I2                              | #I3           |
| 1.10.15 | `matching`      | #J1, #J2 (path traversal CWE-22), #J3 | —             |
| 1.10.16 | `perfil`        | #K1, #K2                              | #K3           |
| 1.10.17 | `health`        | #L1                                   | #L2, #L3, #L4 |

**Totales del paso 3.7**: **31 findings 🛑 cerrados con tests + 14 findings ⚠️ documentados**. Suite final 1097/1097 verde (+210 tests vs estado inicial del paso). TSC clean.

**Patrones convergentes** (régimen estacionario):

- #G1 error mapping (try/catch + Sentry + 500 genérico) — aplicado en 11/12 áreas
- #G2 anti-enumeration / 404 unification — aplicado en 7/12 áreas
- #G3 error.code pattern (handlers matchean por code, no string includes) — aplicado en 2/12 áreas (chat, interviews)
- #G4 rate limit en mutations costosas por `auth.user.id` — aplicado en 7/12 áreas

**Hallazgos novedosos**:

- **#J2 (matching)** — Path traversal CWE-22: `originalName` no sanitizado se concatenaba al path de Supabase Storage, permitiendo escapar del folder del user. Único caso de path traversal del audit.
- **#L1 (health)** — Health check sin Sentry: el endpoint diseñado para detectar problemas era el que más silenciaba el problema. Lección "observability es seguridad".
- **Anti-enumeration profunda en service** (`interviews` #H2): cambio movido al service mismo (en lugar de solo en el handler) para garantizar consistency si el service se consume desde otros lugares.

**Lecciones metodológicas**:

- **Inventory inicial subcontaba en 6/11 áreas con sub-routes**. Conteo confiable: `Glob src/app/api/AREA/**/route.ts` + leer cada export HTTP.
- **TSC pre-commit** después del lote 1.10.12 (que arrastró deuda TS del 1.10.10) — todos los lotes posteriores corrieron `tsc --noEmit` antes del commit.
- **Helper `chatError`/`interviewError`** consolidado en 2 áreas. Candidato a extraer a `src/server/lib/errors.ts` con la próxima área que lo use.
- **Tests con `vi.hoisted` + mock literal de FormData** (en lugar de `new FormData()` real) para preservar el `type` del File. Patrón establecido en `matching-routes`/`perfil-routes`.

**Con el paso 3.7 cerrado, la Fase 3 (Seguridad) queda completa**. Próximas fases del refactor-plan: Fase 4 (Limpieza dead code), Fase 5 (Patrones de diseño), Fase 6 (Observabilidad y performance).

## [1.10.16] - 2026-05-05

### Security

- **Hardening en `/api/perfil/*` (Fase 3 paso 3.7 / findings #K1, #K2)** — undécimo lote de fixes derivado del audit `/api/*`. El inventario inicial decía "2 handlers" pero el recuento real es **3** (`route.ts` GET+PUT + `avatar/route.ts` POST) — corregido en `docs/security-audit-api.md`. Subcuenta confirmada en 6/11 áreas auditadas. Área cerrada con dos findings 🛑 + uno ⚠️ aceptado.
  - **#K1 — Sin try/catch + Sentry en los 3 handlers**. Severidad baja-media — info disclosure. Patrón #G1/#H1/#I1/#J1: cualquier error de Prisma o Storage propagaba al runtime de Next.js. Fix universal: `try/catch` envolvente, `Sentry.captureException(err, { tags: { route: "perfil.X.METHOD" }, extra: { userId, role? } })`, response genérico `{ error: "Error interno", code: "INTERNAL_ERROR" }` con 500. Plus: errores de validación ahora incluyen `code` (`VALIDATION_ERROR`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`).
  - **#K2 — `POST /api/perfil/avatar` sin rate limit**. Severidad baja-media — DoS interno + churn de CDN. Cada llamada hace upload a Supabase Storage + `prisma.user.update` + (para COMPANY) un segundo update sobre `CompanyProfile`. Sin throttle, hot-loop al endpoint dispara N uploads + 2N updates por segundo, presionando bucket policy y CDN cache. Fix: `rateLimit("avatar:${auth.user.id}", 10, HOUR_MS)` antes de tocar Storage. **Simétrico con `upload-cv`** (#J3, 1.10.15) — ambos endpoints de upload por user comparten presupuesto conceptual.

### Tests

- Suite total: **1092 tests / 56 archivos** verde (antes 1074 / 55). Nuevo archivo `src/test/unit/perfil-routes.test.ts` (18 tests). Cobertura por handler:
  - `GET /api/perfil` (#K1): 3 tests — 401, 200 con `where: id === auth.user.id`, 500 + Sentry sin leak.
  - `PUT /api/perfil` (#K1): 5 tests — 401, 400 Zod, **update con `where: { id: auth.user.id }` (no leak ajeno)**, **trim a name/lastName/phone**, 500 + Sentry sin leak.
  - `POST /api/perfil/avatar` (#K1+#K2): 10 tests — 401, **#K2 rate limit 429 sin tocar service**, **rate limit usa key con `auth.user.id`**, 400 INVALID_FILE_TYPE, 400 FILE_TOO_LARGE, **path usa `auth.user.id` directo (no originalName — anti path-traversal natural)**, **dual-write a CompanyProfile.logo solo para COMPANY**, **STUDENT no toca CompanyProfile**, 500 + Sentry sin leak, 200 happy path con `?v=` cache-busting.

### Notes

- **Anti-path-traversal natural en POST avatar**: a diferencia de `upload-cv` (#J2 de 1.10.15), el path usa `auth.user.id` directo (`avatars/${userId}.${ext}`) sin tocar el `originalName` del cliente. **Cero superficie para path traversal**.
- **Dual-write a `CompanyProfile.logo` para COMPANY**: si la primera update de `User.image` succede pero la segunda falla, queda inconsistencia (avatar nuevo en User, logo viejo en CompanyProfile). El catch de #K1 cubre con Sentry pero NO hace rollback. Aceptable: la inconsistencia es visualmente perceptible (header ≠ listado) pero no rompe seguridad. Para fix robusto futuro: `prisma.$transaction([userUpdate, companyProfileUpdate])`.
- **No hay magic-bytes check**: el handler valida solo el `file.type` declarado por el browser. Riesgo real bajo: el avatar se sirve via Supabase Storage que setea el `Content-Type` del header a partir del mime declarado. Polyglot JS-en-JPG sería descargado como JPG por el browser.
- **#K3 (sin service layer)** aceptado como ⚠️ — mismo patrón que `notifications` (#I3). Boy-scout para sweep futuro.
- **Decisión rate limit `10/hora`**: simetría con `upload-cv` y consistencia con costo del POST.
- **Convergencia parcial**: el área cierra #G1 (error mapping) y #G4 (rate limit) del régimen estacionario. NO aplican #G2 ni #G3. Patrón "área trivial-CRUD con sub-handler de upload".
- **Paso 3.7**: 11/12 áreas cerradas. Falta: `health` (1 handler) — siguiente y último lote para cerrar el paso 3.7 completo.
- **Nota sobre el commit**: la entrada del CHANGELOG fue introducida en un commit posterior (`docs(changelog): agregar entrada 1.10.16`) por una colisión del Edit anterior con el linter. El bump de version (`package.json`) y los archivos de código quedaron en el commit `f9bd73c`.

## [1.10.15] - 2026-05-05

### Security

- **Hardening en `/api/matching/*` (Fase 3 paso 3.7 / findings #J1, #J2, #J3)** — décimo lote de fixes derivado del audit `/api/*`. El inventario inicial decía "2 handlers" pero el recuento real es **3** (`recommendations/route.ts` GET + `upload-cv/route.ts` POST+DELETE) — corregido en `docs/security-audit-api.md`. Patrón emergente: subcuenta confirmada en 5/10 áreas auditadas. Área cerrada con tres findings 🛑.
  - **#J1 — Error mapping leak en los 3 handlers**. Severidad baja-media — info disclosure. Patrón #G1/#H1/#I1 con tres variantes del mismo problema:
    - `GET /recommendations`: `catch {}` **sin parámetro** — error completamente swallowed sin Sentry. Si HuggingFace, Prisma o el cosine similarity fallan, el evento se pierde y nadie se entera.
    - `POST /upload-cv`: catch hacía `error.message` al cliente — mensajes crudos de Supabase Storage, HuggingFace o pdf-parse llegaban al frontend.
    - `DELETE /upload-cv`: idem `error.message` al cliente del upsert Prisma.

    Fix universal: `try/catch` envolvente, `Sentry.captureException(err, { tags, extra: { userId, fileSize? } })`, response `{ error: "Error interno", code: "INTERNAL_ERROR" }` con 500.

  - **#J2 — Path traversal en `processCV` por `originalName` no sanitizado (CWE-22 / OWASP A01)**. Severidad **alta** — broken access control / arbitrary file write. **Primer finding de path traversal del audit**. El service hacía `path = \`cvs/\${userId}/\${timestamp}-\${originalName}\``y mandaba directo a`uploadFile("documents", path, ...)`. Vector de ataque: un STUDENT autenticado sube un archivo cuyo `name`contiene`../../`, `/`, `\\` — el path de Supabase Storage **escapa del folder del user** y puede:
    1. Sobrescribir CVs ajenos: `name = "../other-user-id/cv.pdf"` → reemplaza el CV de otro student.
    2. Plantar archivos en buckets vecinos: `name = "../../profile-photos/foo.png"` → escribe fuera del scope `cvs/`.
    3. Confundir lectura/listado con caracteres de control.

    Fix: helper `sanitizeFilename(originalName)` que (a) extrae solo el basename con `split(/[\\/]/).pop()` (descarta segmentos de path), (b) recorta el stem a 60 chars con `replace(/[^a-zA-Z0-9_-]/g, "_")` (whitelist estricta), (c) fuerza la extensión a la whitelist `pdf|doc|docx` (default `pdf`), (d) fallback a `cv` si el stem queda sin alfanuméricos. **Defensa en profundidad**: el handler ya whitelist-ea el mime (PDF/DOCX), pero el sanitize protege incluso si el browser miente sobre el mime.

  - **#J3 — `DELETE /upload-cv` sin rate limit**. Severidad baja — DoS interno / asimetría. POST tenía `5/hora` pero DELETE no, permitiendo hot-loop al endpoint (un upsert por llamada). Fix: `rateLimit("delete-cv:${userId}", 5, HOUR_MS)` consistente con POST. Mantiene simetría conceptual: subir + borrar CV con el mismo presupuesto en ambas direcciones.

### Tests

- Suite total: **1074 tests / 55 archivos** verde (antes 1051 / 54). Nuevo archivo `src/test/unit/matching-routes.test.ts` (17 tests) + extensión de `matching.service.test.ts` con 6 tests del sanitize anti-traversal.
  - `GET /api/matching/recommendations` (#J1): 5 tests — 401 sin sesión sin tocar rate limit, 429 sin tocar service, **rate limit usa key con `auth.user.id`**, 500 + Sentry sin leak (ya no swallow), 200 happy path.
  - `POST /api/matching/upload-cv` (#J1): 7 tests — 401, 429, 400 sin archivo, 400 INVALID_FILE_TYPE, 400 FILE_TOO_LARGE, 500 + Sentry sin leak, 200 happy path.
  - `DELETE /api/matching/upload-cv` (#J1+#J3): 5 tests — 401, **429 (#J3 rate limit)**, **rate limit usa key con `auth.user.id`**, 500 + Sentry sin leak, 200 happy path.
  - `processCV` sanitize (#J2): 6 tests — bloquea `../../etc/passwd.pdf`, bloquea slashes mixtos `folder\\sub/file.pdf`, fuerza extensión a whitelist (rechaza `.exe`), sanitiza caracteres especiales (paréntesis, espacios), recorta stems de >60 chars, fallback a `cv.pdf` cuando el stem queda sin alfanuméricos (`...`).

### Notes

- **#J2 es el primer finding de path traversal del audit** — todos los lotes anteriores eran ownership/error-mapping/rate-limit. Lección consolidada: **cualquier campo del cliente que se concatene a una ruta** (filesystem path, S3 key, URL, redirect) necesita sanitización, no solo validation. La whitelist de mime es ortogonal — protege contra "subió un .exe" pero NO contra "subió un .pdf llamado `../../foo.pdf`". Patrón a buscar en futuras auditorías.
- **Mock de FormData**: el test usa un mock literal `{ get: (key) => file }` en lugar de `new FormData()` real. Razón: `FormData.set()` re-envuelve el File y normaliza el `type` a `application/octet-stream`, rompiendo los tests de validación de mime. El mock directo preserva el `type` exacto del fakeFile.
- **`getRecommendations` sin paginación**: el service hace `findMany` sin take/skip — carga todas las internships APPROVED en memoria. Para N=10000 es ~38MB + CPU O(N×384). NO security crítico (rate limit 20/hora ya frena abuso). Anotado para sweep funcional.
- **CV bucket policy**: el bucket Supabase `documents` define quién accede al `cvUrl`. Fuera del scope del audit del handler.
- **Decisión rate limit `5/hora`**: alineado con costo de HuggingFace embedding (~500ms-2s + cuota mensual). Cubre uso legítimo (subir, revisar, reemplazar 1-2× por sesión) y frena abuso de cuota.
- **Convergencia parcial + 1 patrón nuevo**: el área cierra #G1 (error mapping) y #G4 (rate limit) del régimen estacionario, **más #J2 (path traversal)**. NO aplican #G2 (anti-enumeration ya cubierta porque cada user tiene UN CV y el service usa `auth.user.id` directo) ni #G3 (no hay throws con codes propios). El audit sigue convergiendo pero todavía descubre vectores específicos.
- **Validación pre-commit**: `tsc --noEmit` corrido **antes** del commit, salida limpia. Lección aprendida del 1.10.12 sigue aplicándose en todos los lotes desde entonces.
- **Paso 3.7**: 10/12 áreas cerradas (`auth`, `admin`, `users`, `applications`, `internships`, `ats`, `chat`, `interviews`, `notifications`, `matching`). Pendientes: `perfil`, `health`. Cierre del paso a la vista.

## [1.10.14] - 2026-05-05

### Security

- **Hardening en `/api/notifications/*` (Fase 3 paso 3.7 / findings #I1, #I2)** — noveno lote de fixes derivado del audit `/api/*`. Inventario inicial coincide con el real esta vez: 3 handlers (`route.ts` GET + `[id]/route.ts` DELETE + `read-all/route.ts` PATCH). Particularidad: el área **NO tiene service layer** — los handlers acceden directo a Prisma (anotado como ⚠️ #I3). Área más simple del audit: cierra solo 2 patrones (no aplica anti-enumeration porque `deleteMany`+filtro ya lo cubre nativamente, no aplica error.code porque no hay service con throws).
  - **#I1 — Sin try/catch + Sentry en los 3 handlers**. Severidad baja-media — info disclosure. Patrón #G1/#H1: cualquier error de Prisma (FK violation, conexión refused, deadlock) propagaba al runtime de Next.js que retornaba 500 con stack trace en dev / mensaje crudo en prod. Fix universal: `try/catch` envolvente, `Sentry.captureException(err, { tags: { route: "notifications.X.METHOD" }, extra: { userId, ...notificationId? } })` en el catch, response genérico `{ error: "Error interno", code: "INTERNAL_ERROR" }` con 500.
  - **#I2 — `PATCH /api/notifications/read-all` sin rate limit**. Severidad baja-media — DoS interno. El handler dispara `updateMany` sobre **todas** las notificaciones no leídas del user en una sola query. Para un user con miles de notificaciones, cada llamada toca cientos/miles de rows. Sin throttle, hot-loop al endpoint puede presionar la DB. Fix: `rateLimit("notifications-read-all:${userId}", 10, MIN_MS)` antes de tocar DB. 10/min cubre uso legítimo extremo (apretar "Marcar todo como leído" rápido) y corta hot-loop.

### Tests

- Suite total: **1051 tests / 54 archivos** verde (antes 1037 / 53). Nuevo archivo `src/test/unit/notifications-routes.test.ts` (14 tests) con `vi.hoisted` para mocks de `requireAuth`, `Sentry.captureException`, `rateLimit/rateLimitResponse` + uso de `prismaMock` para mockear acceso directo a Prisma desde los handlers. Cobertura por handler:
  - `GET /api/notifications` (#I1): 3 tests — 401, 200 con filtro `userId` + `take: 20`, 500 + Sentry sin leak.
  - `DELETE /api/notifications/[id]` (#I1): 5 tests — 401, **404 cuando deleteMany count=0 (anti-enumeration natural)**, **deleteMany usa filtro de owner**, 500 + Sentry sin leak, 200 happy path.
  - `PATCH /api/notifications/read-all` (#I1+#I2): 6 tests — 401, **#I2 rate limit 429 sin tocar DB**, **rate limit usa key con `auth.user.id`**, **updateMany filtra por userId Y read=false**, 500 + Sentry sin leak, 200 happy path.

### Notes

- **Anti-enumeration natural en DELETE**: el handler usa `deleteMany` con WHERE `{ id, userId }` en una sola query, en lugar de `findUnique` + ownership check. Si `id` no existe O no es del user, `count` retorna 0 → 404. **No es necesario el patrón "404 unification" del service** que aplicamos en `chat`/`interviews` — el path único nunca diferencia "no existe" de "ajena". Patrón emergente más limpio para casos donde la lógica es trivial.
- **#I3 (sin service layer)** aceptado como ⚠️ — los 3 handlers tienen lógica trivial (3 ops Prisma simples). Rompe Clean Architecture (`CLAUDE.md`) pero NO es security. Si la lógica crece (filters, observer pattern de Fase 5, cleanup), conviene crear `notifications.service.ts`.
- **GET sin paginación**: `take: 20` hardcoded — bug de UX, no security. Anotado para sweep funcional posterior.
- **`requireAuth()` sin role específico**: correcto. Las notificaciones son cross-role (STUDENT y COMPANY las reciben). El filtro por `userId` ya garantiza scope por owner.
- **Decisión rate limit `10/min` en read-all**: balance UX/anti-spam. El botón "marcar todo como leído" es un click humano — 10/min cubre uso legítimo extremo. Bajarlo a 5 podría frustrar.
- **Convergencia parcial**: el área cierra solo 2 patrones (#I1=#G1, #I2=#G4-light). NO aplican #G2 (anti-enumeration ya nativa por `deleteMany`+filtro) ni #G3 (no hay service con throws). Confirmación de que el régimen estacionario depende del shape del área — áreas con `service` complejo necesitan los 4 patrones, áreas trivial-CRUD solo 2.
- **Validación pre-commit**: `tsc --noEmit` corrido **antes** del commit, salida limpia. Lección aprendida del 1.10.12 sigue aplicada.
- **Paso 3.7**: 9/12 áreas cerradas (`auth`, `admin`, `users`, `applications`, `internships`, `ats`, `chat`, `interviews`, `notifications`). Pendientes: `matching`, `perfil`, `health`.

## [1.10.13] - 2026-05-05

### Security

- **Hardening en `/api/interviews/*` (Fase 3 paso 3.7 / findings #H1, #H2, #H3, #H4)** — octavo lote de fixes derivado del audit `/api/*`. El inventario inicial decía "4 handlers" pero el recuento real es **7** (`route.ts` GET+POST + `[id]/route.ts` GET+PATCH+DELETE + `send-to-chat/route.ts` POST + `available-candidates/[jobId]/route.ts` GET) — corregido en `docs/security-audit-api.md`. Área completa cerrada con cuatro findings 🛑 + uno ⚠️ aceptado.
  - **#H1 — Error mapping leak universal en los 7 handlers**. Severidad baja-media — info disclosure. Patrón #E3/#F2/#G1: todos los catch hacían `{ error: err.message }` con status 500, propagando mensajes crudos de Prisma/infra. Fix universal: `try/catch` envolvente, `Sentry.captureException(err, { tags: { route: "interviews.X.METHOD" }, extra: { userId, interviewId/jobId } })` en el catch, response genérico `{ error: "Error interno", code: "INTERNAL_ERROR" }` con 500.
  - **#H2 — Ownership fail diferenciaba 403 vs 404 (anti-enumeration)**. Severidad media — IDOR enumeration. 5 handlers retornaban 404/403 según existence/ownership, permitiendo enumerar IDs válidos de interviews ajenas. **Fix más profundo que en áreas previas**: en lugar de unificar solo en el handler, se cambió el throw del **service** mismo — cuando el caller no es owner, el service ahora throws `NOT_FOUND` con mensaje genérico ("Interview not found", "Application not found", "Internship not found"). Doble defensa: el service por sí solo no expone la diferencia, y el handler solo matchea por `code === "NOT_FOUND"` → 404.
  - **#H3 — String matching frágil para mapear errores → códigos consistentes**. Severidad baja — defensa en profundidad / mantenibilidad. Patrón #G3: handlers usaban `message.includes("Not authorized")` / `message.includes("not found")` para decidir status code. **Inconsistencia interna**: el service ya usaba `err.code = "INTERVIEW_ALREADY_EXISTS"` puntualmente, pero el resto seguía con string matching. Fix: añadida `InterviewErrorCode` union (`NOT_FOUND | FORBIDDEN | INTERVIEW_ALREADY_EXISTS | APPLICATION_MISMATCH | NEW_CANDIDATE_NO_CONVERSATION`) + helper `interviewError(code, message)`. Migrados los 14 throws sin code al patrón. Tests del service migrados a `rejects.toMatchObject({ message, code })`.
  - **#H4 — `POST /api/interviews/[id]/send-to-chat` sin rate limit**. Severidad media — spam/notification flood. El handler dispara una transacción de 3 ops Prisma (`message.create` + `interview.update` + `conversation.update`) más broadcast realtime al student via Supabase. Sin throttle, una company podía spamear notifications de "Entrevista agendada/actualizada" al chat del student. Fix: `rateLimit("interview-send-to-chat:${userId}", 10, MIN_MS)` antes de tocar DB. 10/min es generoso para uso legítimo (1 al agendar + 1-2 al editar) y corta el flood.

### Tests

- Suite total: **1037 tests / 53 archivos** verde (antes 1002 / 52). Nuevo archivo `src/test/unit/interviews-routes.test.ts` (35 tests) con `vi.hoisted` para mocks de `requireAuth`, `Sentry.captureException`, los 7 services de interviews y `rateLimit/rateLimitResponse`. Cobertura por handler:
  - `POST /api/interviews` (#H1+#H2+#H3): 7 tests — 401, 400 Zod, NOT_FOUND, **400 APPLICATION_MISMATCH**, 409 INTERVIEW_ALREADY_EXISTS, 500 + Sentry sin leak, 201 happy path.
  - `GET /api/interviews` (#H1): 3 tests — 401, 200 con lista, 500 + Sentry sin leak.
  - `GET /api/interviews/[id]` (#H1+#H2+#H3): 4 tests — 401, **NOT_FOUND incluye ownership fail (anti-enumeration)**, 500 + Sentry, 200 happy path.
  - `PATCH /api/interviews/[id]` (#H1+#H2+#H3): 7 tests — 401, 400 Zod, NOT_FOUND, 409 ALREADY_EXISTS, **400 NEW_CANDIDATE_NO_CONVERSATION**, 500 + Sentry, 200 happy path.
  - `DELETE /api/interviews/[id]` (#H1+#H2+#H3): 4 tests — 401, NOT_FOUND, 500 + Sentry, 200 happy path.
  - `POST /api/interviews/[id]/send-to-chat` (#H1+#H2+#H3+#H4): 6 tests — 401, **#H4 rate limit 429 sin tocar DB**, **rate limit usa key con `auth.user.id`**, NOT_FOUND, 500 + Sentry sin leak, 201 happy path.
  - `GET /api/interviews/available-candidates/[jobId]` (#H1+#H2+#H3): 4 tests — 401, NOT_FOUND, 500 + Sentry, 200 happy path.
- `src/test/unit/interviews.service.test.ts`: 45 tests verde (mismo conteo). Migrados los 16 asserts de `rejects.toThrow(message)` a `rejects.toMatchObject({ message, code })` para verificar el `code` correcto en cada throw. Los 7 tests que antes verificaban "Not authorized" ahora verifican `NOT_FOUND` (anti-enumeration #H2).

### Notes

- **Helper `interviewError`** sigue el mismo shape que `chatError` (área `chat`, 1.10.11). Patrón consolidado en 2 áreas — candidato a extraer a `src/server/lib/errors.ts` con la próxima área que lo use (probablemente `notifications`).
- **Anti-enumeration profunda en #H2**: a diferencia de áreas previas donde el "404 unification" se hacía solo en el handler (mapeando FORBIDDEN→404), acá el cambio se aplicó **en el service**. Razón: el service también es consumido por otros lugares (futuros tests, jobs, scripts). Que el service por sí solo no exponga la diferencia es una mejor garantía.
- **`APPLICATION_MISMATCH` y `NEW_CANDIDATE_NO_CONVERSATION` mantienen 400 (no 404)**: ambos códigos solo se lanzan **después de ownership confirmada**, no hay enumeration risk. Son errores de payload/UX del cliente. 400 con código específico ayuda al frontend a mostrar mensaje útil.
- **#H5 (validación URL en `meetingLink`)** aceptado como ⚠️ — el flow legítimo necesita texto libre ("TBD", "Zoom dial-in: +56...", etc.) y las companies son trusted (aprobadas por admin). El campo se renderiza como texto plano (no `<a href>`), así que `javascript:` no se ejecuta. Documentado.
- **Convergencia confirmada**: el área `interviews` cierra los mismos 4 patrones que ya emergieron en lotes previos (#H1=#G1, #H2=#G2, #H3=#G3, #H4=#G4). El audit ya alcanzó régimen estacionario — los próximos lotes deberían ejecutarse rápido.
- **Compatibilidad con frontend**: cero cambios de contrato en happy path. Cambios visibles: 404 en lugar de 403 cuando un user toca interviews ajenas (deseado), error genérico en lugar de mensaje crudo en 500 (deseado), 429 en `send-to-chat` con header `Retry-After` cuando se excede 10/min.
- **Validación pre-commit**: lección aprendida del lote anterior (1.10.12 fixeó deuda TSC). Esta vez `tsc --noEmit` se corrió **antes** del commit, no después. Salida limpia.
- **Paso 3.7**: 8/12 áreas cerradas (`auth`, `admin`, `users`, `applications`, `internships`, `ats`, `chat`, `interviews`). Pendientes: `notifications`, `matching`, `perfil`, `health`.

## [1.10.12] - 2026-05-05

### Fixes

- **TSC error en `src/app/api/ats/config/route.ts:175` (deuda del 1.10.10)**. El refactor #F3 sumó un `discriminatedUnion("type", ...)` con schemas estrictos por scorer que produce tipos con arrays mutables (`required: string[]`, etc.), pero `Prisma.ATSModuleCreateManyInput.params` espera `Prisma.InputJsonValue` (que tiene arrays readonly). `tsc --noEmit` reportaba `TS2322` con cadena larga de incompatibilidad estructural. Fix: cast explícito `params: m.params as Prisma.InputJsonValue` en el `createMany` del upsert atómico, con comentario justificando que el schema Zod ya validó el shape concreto. `tsc --noEmit` ahora limpio. Tests del área `ats` (33) intactos.

## [1.10.11] - 2026-05-05

### Security

- **Hardening en `/api/chat/*` (Fase 3 paso 3.7 / findings #G1, #G2, #G3, #G4)** — séptimo lote de fixes derivado del audit `/api/*`. El inventario inicial decía "4 handlers" pero el recuento real es **6** (`conversations/route.ts` GET+POST + `[conversationId]/route.ts` GET + `messages/route.ts` GET+POST + `read/route.ts` PATCH) — corregido en `docs/security-audit-api.md`. Área completa cerrada con cuatro findings 🛑 + uno ⚠️ aceptado.
  - **#G1 — Error mapping leak universal en los 6 handlers**. Severidad baja-media — info disclosure. Patrón calcado de #E3/#F2: todos los catch hacían `{ error: err.message }` con status 500, propagando mensajes crudos de Prisma/infra. Fix universal: `try/catch` envolvente, `Sentry.captureException(err, { tags: { route: "chat.X.METHOD" }, extra: { userId, conversationId } })` en el catch, response genérico `{ error: "Error interno", code: "INTERNAL_ERROR" }` con 500.
  - **#G2 — Ownership fail diferenciaba 403 vs 404 (anti-enumeration)**. Severidad media — IDOR enumeration. Patrón #D1/#F1: handlers retornaban `404 "Conversation not found"` cuando no existía vs `403 "No autorizado"` cuando existía pero el caller no era parte de la conversación. Eso permite enumerar IDs válidos de conversations ajenas. Fix: ambos casos (`code === "NOT_FOUND" || code === "FORBIDDEN"`) devuelven `404 { code: "NOT_FOUND" }` con mismo mensaje. Plus, dentro del service `getOrCreateConversation` se reordenó `existence → ownership → stage` (en lugar de `existence → stage → ownership`) para no leak `pipelineStatus` de apps ajenas: una app que NO es del caller devuelve `NOT_FOUND` regardless del stage. `INTERVIEW_REQUIRED` solo se lanza después de ownership confirmada — OK exponerlo como 403 con código específico.
  - **#G3 — String matching frágil para mapear errores → códigos consistentes**. Severidad baja — defensa en profundidad / mantenibilidad. Los handlers matcheaban con `message.includes("Not authorized")` / `message.includes("INTERVIEW stage")` para decidir status code. Si alguien refactoreaba el wording del throw, los handlers respondían 500 sin avisar. **Inconsistencia interna detectada**: `sendMessage` ya usaba `err.code = "STUDENT_CANNOT_INITIATE"` (patrón limpio), el resto del service no. Fix: extendido el patrón `code` a TODOS los throws — agregada `ChatErrorCode` union (`NOT_FOUND | FORBIDDEN | INTERVIEW_REQUIRED | STUDENT_CANNOT_INITIATE`) y helper local `chatError(code, message)`. Handlers matchean por `err.code` (no por message). Tests del service migrados a `rejects.toMatchObject({ message, code })`.
  - **#G4 — `POST /api/chat/conversations/[id]/messages` sin rate limit**. Severidad media — spam / DoS de chat. Cada mensaje crea row + bumpea `updatedAt` de la conversación + dispara realtime broadcast a Supabase. Sin throttle, una company autenticada podía spamear miles de mensajes/minuto a un student (acoso, llenado de inbox, presión sobre Realtime). Fix: `rateLimit("chat-message:${userId}", 30, MIN_MS)` antes de tocar DB. 30 mensajes/min es generoso para uso legítimo (~1 cada 2s) y corta el spam-flood.

### Tests

- Suite total: **1002 tests / 52 archivos** verde (antes 967 / 51). Nuevo archivo `src/test/unit/chat-routes.test.ts` (34 tests) con `vi.hoisted` para mocks de `requireAuth`, `Sentry.captureException`, los 6 services de chat y `rateLimit/rateLimitResponse`. Cobertura por handler:
  - `POST /api/chat/conversations` (#G1+#G2+#G3): 6 tests — 401 sin sesión, 400 sin `applicationId`, 404 NOT_FOUND, 403 PIPELINE_STATUS_REQUIRED para INTERVIEW_REQUIRED, 500 + Sentry sin leak del error crudo, 201 happy path.
  - `GET /api/chat/conversations` (#G1): 3 tests — 401, filtra por role STUDENT, 500 + Sentry sin leak.
  - `GET /api/chat/conversations/[id]` (#G1+#G2+#G3): 5 tests — 401, NOT_FOUND, **404 unification para FORBIDDEN**, 500 + Sentry, 200 happy path.
  - `GET /api/chat/conversations/[id]/messages` (#G1+#G2+#G3): 5 tests — 401, NOT_FOUND, **404 unification para FORBIDDEN**, 500 + Sentry sin leak, 200 happy path.
  - `POST /api/chat/conversations/[id]/messages` (#G1+#G2+#G3+#G4): 10 tests — 401, **#G4 (rate limit 429 sin tocar DB)**, **rate limit usa key con `auth.user.id` (no IP)**, 400 content vacío, 400 content > 4000 chars, NOT_FOUND, **404 unification para FORBIDDEN**, 403 STUDENT_CANNOT_INITIATE, 500 + Sentry sin leak, 201 happy path.
  - `PATCH /api/chat/conversations/[id]/read` (#G1+#G2+#G3): 5 tests — 401, NOT_FOUND, **404 unification para FORBIDDEN**, 500 + Sentry, 200 happy path.
- `src/test/unit/chat.service.test.ts`: 31 → 32 tests. Migrados los 8 tests existentes que usaban `rejects.toThrow(message)` a `rejects.toMatchObject({ message, code })` para verificar que cada throw expone el `code` correcto. Nuevo test `ownership se chequea ANTES que pipelineStatus` que verifica el reorden de #G2 (una app que NO es del caller y NO está en INTERVIEW devuelve `NOT_FOUND`, no `INTERVIEW_REQUIRED`).

### Notes

- **Helper `chatError(code, message)`** en `chat.service.ts` centraliza el patrón `Error & { code }` que ya usaba `interviews.service.ts` ad-hoc. Si aparece en más áreas del audit (probable), considerar extraer a `src/server/lib/errors.ts` en un sweep futuro.
- **Reorden en `getOrCreateConversation`** (existence → ownership → stage) es estructural — la lógica de negocio no cambia, pero la **secuencia de checks ahora respeta defense-in-depth**. Algo a mirar en otros services en próximos sweeps.
- **Decisión rate limit `30/min` en POST messages**: balance entre UX (tipear rápido en chat es legítimo) y anti-spam. Subirlo (e.g. 60) aumenta riesgo de spam con costo nulo en UX. Bajarlo (e.g. 15) puede frustrar usuarios legítimos en conversaciones intensas. 30/min = 1 mensaje cada 2s → muy razonable.
- **Por qué `INTERVIEW_REQUIRED` mantiene 403 y no se unifica a 404**: ese código solo se lanza DESPUÉS de ownership confirmada (caller ES owner de la application), entonces no hay enumeration risk. Devolver 404 ahí confundiría al frontend legítimo. 403 con código `PIPELINE_STATUS_REQUIRED` es correcto.
- **#G5 (rate limit en `POST /api/chat/conversations`)** aceptado como ⚠️ — costo bajo de abuso. Cada llamada requiere (a) auth COMPANY, (b) application existente, (c) ownership match, (d) `pipelineStatus === "INTERVIEW"`. Solo crea una conversation idempotente. Riesgo real bajo. Si quisiéramos cerrarlo: `rateLimit("chat-create-conv:${userId}", 30, MIN_MS)`.
- **Convergencia confirmada**: el área `chat` cierra los mismos 4 patrones que ya emergieron en lotes previos (#G1 = #E3/#F2, #G2 = #D1/#F1, #G3 nuevo, #G4 = #F4/#F5). El `error.code` pattern (#G3) extiende el helper que ya usábamos puntualmente en interviews/chat → ahora consistente en todo chat.
- **Compatibilidad con frontend**: cero cambios de contrato en happy path. Cambios visibles: 404 en lugar de 403 cuando un user toca conversaciones ajenas (deseado), error genérico en lugar de mensaje crudo en 500 (deseado), 429 en POST messages con header `Retry-After` cuando se excede 30/min.
- **Paso 3.7**: 7/12 áreas cerradas (`auth`, `admin`, `users`, `applications`, `internships`, `ats`, `chat`). Pendientes: `interviews`, `notifications`, `matching`, `perfil`, `health`.

## [1.10.10] - 2026-04-27

### Security

- **Hardening en `/api/ats/*` (Fase 3 paso 3.7 / findings #F1, #F2, #F3, #F4, #F5)** — sexto lote de fixes derivado del audit `/api/*`. Área completa cerrada con cinco findings 🛑 en los cinco handlers (`POST /api/ats/config`, `GET /api/ats/config/[jobId]`, `PATCH /api/ats/pipeline/[applicationId]`, `POST /api/ats/score/[applicationId]`, `POST /api/ats/score/job/[jobId]`).
  - **#F1 — Ownership fail diferenciaba 404 vs 403 (anti-enumeration)**. Severidad media — info disclosure / IDOR enumeration. 4 handlers respondían `404 "Recurso no encontrado"` cuando no existía vs `403 "No autorizado"` cuando existía pero no pertenecía a la company del session user. Esa diferencia permite a una `COMPANY` autenticada **enumerar IDs válidos** de applications/internships ajenas con un loop. Fix: ambos casos devuelven `404 { error: "Recurso no encontrado", code: "NOT_FOUND" }`. Misma decisión que cerramos en #D1/#D2 (applications) — patrón "404 unificado en ownership fail" ya es convención del audit.
  - **#F2 — Error mapping leak: errores crudos de Prisma/infra al cliente**. Severidad baja-media — info disclosure. Los 5 handlers no tenían `try/catch` envolvente; cualquier error inesperado (DEADLOCK, FK violation, OOM en pool, UNIQUE constraint, conexión refused) propagaba el `error.message` crudo al cliente con nombres de tabla, columnas, SQL state. Fix universal: `try/catch` en cada handler, `Sentry.captureException(error)` en el catch, response genérico `{ error: "Error interno del servidor", code: "INTERNAL_ERROR" }` con 500. Patrón consistente con la "whitelist de mensajes propagables" establecida en internships (#E3).
  - **#F3 — `params: z.any()` en `POST /api/ats/config`**. Severidad baja — defensa en profundidad. El schema de módulos aceptaba `params: z.any()` y serializaba ese valor a la columna JSON `params` de `ATSModule`. Los scorers downstream (`skills.scorer`, `experience.scorer`, etc.) asumen formas concretas — sin validación, basura arbitraria llega a los scorers (riesgo: crashes silenciosos, scoring inválido, payload bloat). Fix: `discriminatedUnion("type", ...)` con un schema strict() por cada scorer real (`SKILLS`, `EXPERIENCE`, `EDUCATION`, `LANGUAGES`, `PORTFOLIO`) + `passthrough()` para `CUSTOM` (el scoring engine lo ignora). Plus: `array.max(20)` para módulos, `string.max(120)` para labels — caps razonables anti-bloat.
  - **#F4 — `score/job` con `Promise.all` crudo + sin rate limit**. Severidad media — DoS interno. El handler `POST /api/ats/score/job/[jobId]` rescoreaba **todas** las applications de una internship con `Promise.all(applications.map(...))` crudo: con N=200 applications, eso disparaba 200 ejecuciones simultáneas de `scoreApplication` (CPU: parsing CV + matching skills/exp/edu por módulo) más 200 `prisma.application.update` simultáneos contra Supabase pgBouncer. Una empresa con muchos postulantes podía saturar el connection pool y CPU del worker de Vercel — escalando a un DoS auto-infligido. Fix: `rateLimit("ats-score-job:${userId}", 5, MIN_MS)` antes de tocar DB + procesamiento en batches de 5 (`for (let i = 0; i < apps.length; i += 5) { await Promise.all(batch...) }`). Mantiene la semántica (todas se procesan, todas devueltas) pero acota el pico a 5 simultáneos.
  - **#F5 — `score/[applicationId]` sin rate limit**. Severidad media — DoS individual. El scoring de una application individual también es CPU. Sin throttle, una company autenticada podía dispararlo en loop. Fix: `rateLimit("ats-score-one:${userId}", 60, MIN_MS)` antes de tocar DB. Límite generoso (60/min) para no estorbar uso legítimo del kanban.

### Tests

- Suite total: **967 tests / 51 archivos** verde (antes 934 / 50). Nuevo archivo `src/test/unit/ats-routes.test.ts` (33 tests) con `vi.hoisted` para mocks de `requireAuth`, `Sentry.captureException`, `scoreApplication` y `rateLimit/rateLimitResponse`. Cobertura por handler:
  - `POST /api/ats/config` (#F1+#F2+#F3): 9 tests — 5 casos negativos del discriminated union (params extra, minYears negativo, required como string en PORTFOLIO, required como objeto en LANGUAGES, minGPA fuera de rango), happy path con upsert, 2 tests de #F1 (company sin profile / internship ajena → 404), 2 tests de #F2 (transaction error → 500 + Sentry sin leak / json roto → 400 sin Sentry).
  - `GET /api/ats/config/[jobId]` (#F1+#F2): 5 tests — 401, #F1 (company no existe / internship ajena → 404), #F2 (error inesperado → 500 + Sentry sin leak), happy path.
  - `PATCH /api/ats/pipeline/[applicationId]` (#F1+#F2): 5 tests — Zod inválido, #F1 (no existe / no es del owner → 404), #F2, happy path verificando que `pipelineStatus` y `status` se sincronizan según `PIPELINE_TO_STATUS`.
  - `POST /api/ats/score/[applicationId]` (#F1+#F2+#F5): 6 tests — #F5 (rate limit 429 sin tocar DB), #F1 (no existe / ajena → 404), ATS inactivo → 400, #F2, happy path con `scoreApplication` mockeado.
  - `POST /api/ats/score/job/[jobId]` (#F1+#F2+#F4): 6 tests — #F4 (rate limit 429 sin tocar DB), #F1, ATS inactivo, **#F4 batch processing** (con N=25 applications verifica que `update` se llama 25 veces y `body.scored === 25` — la concurrencia limitada no pierde apps), #F2, happy path.
- `src/test/mocks/prisma.ts`: agregados modelos `aTSConfig` y `aTSModule` al `baseMock`, plus método `createMany` al factory `createModelMock` (faltaba — `aTSModule.createMany` venía undefined y rompía el upsert atómico de config).

### Notes

- **Convergencia con #D1/#D2/#E3**: el área `ats` adoptó las tres convenciones que emergieron en lotes anteriores: (1) 404 unificado en ownership fail (anti-enumeration), (2) error mapping seguro con whitelist de mensajes propagables + Sentry, (3) Zod estricto en cualquier body. El audit converge a un patrón único — buena señal de uniformidad.
- **Decisión rate limit por `auth.user.id`** (no por IP): los handlers de score son auth-only (`requireAuth("COMPANY")`), así que el identifier por user es más preciso que por IP (NAT corporativo no comparte límite entre empresas distintas). Patrón consistente con `matching/upload-cv` y `matching/recommendations`.
- **`BATCH_SIZE = 5` en `score/job`**: trade-off CPU/latency. Subirlo (e.g. 10) acelera el batch pero acerca al límite del pool de pgBouncer. Bajarlo (e.g. 3) es más conservador pero aumenta latency en jobs grandes. 5 es un punto razonable; si en prod aparece presión en el pool, bajarlo en lugar de subirlo.
- **Compatibilidad con frontend**: cero cambios de contrato HTTP en happy path. El cambio visible es 404 en lugar de 403 cuando una company toca recursos ajenos — comportamiento correcto y deseado.
- **Paso 3.7**: 6/12 áreas cerradas (`auth`, `admin`, `users`, `applications`, `internships`, `ats`). Pendientes: `chat`, `interviews`, `notifications`, `matching`, `perfil`, `health`.

## [1.10.9] - 2026-04-27

### Security

- **Hardening en `/api/internships/*` (Fase 3 paso 3.7 / findings #E1, #E2, #E3, #E4)** — quinto lote de fixes derivado del audit `/api/*`. El inventario inicial decía "3 handlers" pero el recuento real es **6** (`route.ts` GET+POST + `[id]/route.ts` GET+PUT+PATCH+DELETE) — corregido en `docs/security-audit-api.md`.
  - **#E1 — `GET /api/internships/[id]` no filtraba `isActive` ni `companyStatus`**. Severidad media — info disclosure. El listado público (`listInternships`) filtraba `isActive: true` + `company.companyStatus: "APPROVED"`, pero el detalle por ID era `findUnique` directo sin filtros. Una práctica soft-deleted o de empresa PENDING/REJECTED seguía accesible vía URL bookmarkeada / link compartido / scraping previo, rompiendo la promesa de moderación. Fix: `findUnique` → `findFirst` con `where: { id, isActive: true, company: { is: { companyStatus: "APPROVED" } } }`. Ahora el detalle es espejo del filtro del listado.
  - **#E2 — `PATCH /api/internships/[id]` sin Zod** (patrón #B1/#D3 emergente). Antes: `(await request.json()) as { isActive: boolean }`. Ahora: `patchSchema = z.object({ isActive: z.boolean() })` con `safeParse` → 400 con `details` si llega `{ isActive: "true" }`, `null`, `undefined` o body roto. Defensa en profundidad antes de que el valor llegue a Prisma.
  - **#E3 — Error mapping leak en `[id]/route.ts` (PUT/PATCH/DELETE)**. Severidad media — info disclosure. Los catch genéricos hacían `{ error: error.message }` con status 404, pudiendo exponer mensajes crudos de `PrismaClientKnownRequestError` con nombres de tabla, columnas, SQL state. Fix: helper `notFoundOrInternal(error)` que matchea exactamente la cadena `"Not found or not authorized"` (única frase whitelisted por los services del módulo) → 404; lo demás → `Sentry.captureException(error)` + 500 genérico `"Error interno del servidor"`. Mismo patrón aplicado al POST de `route.ts` con `"Company not approved"` → 403 y `"Company profile required"` → 400 como únicas frases propagables.
  - **#E4 — `POST /api/internships` no chequeaba `companyStatus === "APPROVED"`**. Severidad media — bypass parcial del flow de moderación + waste de recursos. El dashboard solo mostraba banner visual para PENDING/REJECTED (`src/app/(dashboard)/dashboard/empresa/page.tsx:251`); el backend no bloqueaba el POST. Una empresa no aprobada podía crear N internships y consumir embeddings de HuggingFace ($$$). Fix: en `createInternship`, después del `findUnique` de la company, `if (company.companyStatus !== "APPROVED") throw new Error("Company not approved")`. Handler mapea ese error a 403 antes de tocar HuggingFace o `prisma.internship.create`.

### Tests

- Suite total: **934 tests / 50 archivos** verde (antes 891 / 48). Refactor de `src/test/unit/internships.service.test.ts` (12 → 17 tests) sumando: 3 tests de `getInternshipById` para `#E1` (filtros `isActive` + `APPROVED`, retorna null si soft-deleted, retorna null si company no APPROVED) + 2 tests de `createInternship` para `#E4` (rechaza PENDING, rechaza REJECTED). Nuevo archivo `src/test/unit/internships-id-route.test.ts` (14 tests) cubriendo Zod en PATCH (`#E2`: 5 casos) + error mapping seguro en PUT/PATCH/DELETE (`#E3`: 6 casos verificando que el mensaje crudo NO leak al cliente y que `Sentry.captureException` SÍ se llama con el error original) + 2 tests del GET para confirmar que el filtro nuevo del service resulta en 404. Nuevo archivo `src/test/unit/internships-route.test.ts` (6 tests) cubriendo el gate de `#E4` en POST (3 casos: PENDING/REJECTED/APPROVED) + error mapping del POST (3 casos: "Company profile required" → 400, Zod inválido → 400, error inesperado → 500 + Sentry sin leak).

### Notes

- **Decisión 404 vs 403 en #E3**: el helper `notFoundOrInternal` devuelve 404 (no 403) cuando matchea `"Not found or not authorized"`. Razón: misma decisión que en `#D1`/`#D2` — no leak de existence. Una company que prueba IDs ajenos recibe 404 indistinguible de "no existe", sin confirmar el id.
- **Patrón "whitelist de mensajes propagables"**: el módulo establece la convención de que **solo** strings literales del set whitelisted (`"Not found or not authorized"`, `"Company not approved"`, `"Company profile required"`) llegan al cliente. Cualquier otro `Error` (de Prisma, conexión, embedding, etc.) va a Sentry y se mapea a 500 genérico. Esta convención debería aplicarse a las próximas áreas del audit (`ats`, `chat`, `interviews`, etc.) para uniformidad.
- **Helper `notFoundOrInternal`** centraliza el patrón en `src/app/api/internships/[id]/route.ts`. Si más áreas adoptan el mismo patrón, considerar extraer a `src/server/lib/http-errors.ts` en un sweep futuro.
- **#E5 (rate limit en `GET /api/internships`)** aceptado como ⚠️ — DoS leve, consistente con otros GET públicos del proyecto. Documentado en el audit.
- **Bug funcional NO security** detectado durante el audit: `updateInternship` no regenera el embedding cuando cambian `title/description/skills` → matching desincronizado del contenido. Fuera del scope de seguridad, anotado para sweep funcional posterior.
- **Compatibilidad con frontend**: cero cambios de contrato HTTP. Las firmas internas de `getInternshipById` y `createInternship` mantienen la misma signatura externa (cambia el `where` interno y se suma un throw nuevo).
- **Paso 3.7**: 5/12 áreas cerradas (`auth`, `admin`, `users`, `applications`, `internships`). Pendientes: `ats`, `chat`, `interviews`, `notifications`, `matching`, `perfil`, `health`.

## [1.10.8] - 2026-04-27

### Security

- **IDOR + hardening en `/api/applications/*` (Fase 3 paso 3.7 / findings #D1, #D2, #D3, #D4)** — el audit detectó dos **Broken Access Control** (OWASP Top 10 #1) en el área `applications` que permitían que cualquier usuario autenticado como `COMPANY` mutara o notificara postulaciones que NO le pertenecían. Cuarto lote de fixes derivado del audit `/api/*`.
  - **#D1 — IDOR en `PATCH /api/applications/[id]`**. Antes: `updateApplicationStatus(applicationId, status)` solo recibía el id de la postulación; el service hacía `prisma.application.update` sin chequear ownership. Una empresa autenticada podía hacer `PATCH /api/applications/<id-de-otra-empresa>` con `{ status: "REJECTED" }` y modificar postulaciones de prácticas de competencia (o aceptarlas y disparar notificaciones falsas al student). Ahora: la firma incluye `companyUserId`, el service usa el helper privado `findOwnedApplication(applicationId, companyUserId)` que filtra por `where: { id, internship: { companyId } }`. Si no matchea → throw `"Not found or not authorized"` → handler devuelve 404 (sin leak de existence).
  - **#D2 — IDOR en `POST /api/applications/[id]/notify`**. Mismo patrón: `notifyAcceptedApplication(applicationId)` y `notifyRejectedApplication(applicationId)` no validaban ownership, así que cualquier company autenticada podía disparar emails "tu postulación fue aceptada/rechazada" a students de prácticas ajenas (vector de phishing). Ahora ambos reciben `companyUserId` y usan el mismo `findOwnedApplication` helper.
  - **#D3 — body sin Zod en `[id]/notify`** (patrón #B1 emergente). Antes: cast `as { type: "accepted" | "rejected" }`. Ahora: `z.object({ type: z.enum(["accepted", "rejected"]) })` con `safeParse`. Body roto / type inválido → 400 con `details` de Zod.
  - **#D4 — fallo de `sendNewApplicationEmail` a Sentry** (patrón #B3 emergente). Antes: `.catch(console.error)` se perdía en Vercel. Ahora: `Sentry.captureException(err, { tags: { mail: "new_application" }, extra: { internshipId, studentUserId } })`.

### Tests

- Suite total: **909 tests / 48 archivos** verde (antes 903 / 48). Refactor de `src/test/unit/applications.service.test.ts` (18 → 25 tests) sumando: ownership tests (`#D1` + `#D2`) cubriendo company inexistente y application de otra company (3 tests por cada uno de los 3 services owned), happy paths actualizados a la nueva firma con `companyUserId`, **mail failure → Sentry con tags y extras correctos** (`#D4`), mail OK → no Sentry. Verificación explícita que `findFirst` filtra por `internship.companyId`.

### Notes

- **Decisión 404 vs 403 en IDOR**: el service throw `"Not found or not authorized"` → handler devuelve 404 (no 403). Razón: 403 confirma que el recurso existe y solo bloquea acceso; 404 no leak la existencia. Para endpoints donde el atacante puede iterar IDs, 404 es la respuesta correcta (consistente con el patrón ya usado en `getApplicantsByInternship`).
- **Patrón emergente reforzado**: el helper `findOwnedApplication(applicationId, companyUserId)` es la solución compartida del IDOR — devuelve null si la company no existe O si la application no es del owner. Todo el control de acceso queda en una función chica y testeable. Si más adelante aparece IDOR en `interviews` o `ats`, ese patrón se replica.
- **Compatibilidad con frontend**: cambios solo de firma interna del service. Los handlers exponen el mismo contrato HTTP (mismo body schema en PATCH, mismo body en notify). El frontend no necesita cambios.
- **Paso 3.7**: 4/12 áreas cerradas (`auth`, `admin`, `users`, `applications`). Pendientes: `internships`, `ats`, `chat`, `interviews`, `notifications`, `matching`, `perfil`, `health`.

## [1.10.7] - 2026-04-27

### Removed

- **`PATCH /api/users/role` eliminado (Fase 3 paso 3.7 / finding #C1)** — el endpoint permitía a cualquier usuario autenticado cambiar su propio `role: STUDENT ↔ COMPANY` con un cast `as { role: string }` (sin Zod). Una búsqueda exhaustiva en `src/` confirmó que **no tiene callers en el frontend** — la única referencia era `promps/PROMP/modulo-10-company.md`, el prompt que pidió crearlo originalmente para el MVP.
  - **Por qué se eliminó**: dead code + superficie de role-escalation marginal. Aunque cualquier role-switch a COMPANY entraba con `companyStatus: PENDING` (default del schema) y los gates en `internships.service.ts` y `matching.service.ts` filtran por `APPROVED`, el endpoint sigue siendo superficie de ataque innecesaria. Si en el futuro un dev suma una feature que confíe en `role` sin chequear `companyStatus`, el agujero queda abierto.
  - **Flow de empresas hoy**: `/registro/empresa` con credentials → `companyStatus: PENDING` → aprobación admin via `PATCH /api/admin/empresas/[id]`. Quien tenga que probar el dashboard empresa local cambia el role manualmente en Prisma Studio (documentado en `promps/PROMP/modulo-10-company.md`).

### Documentation

- **`promps/PROMP/modulo-10-company.md`** actualizado: sacada la sección "Crea un API route que permita cambiar el rol" + nota explicativa de por qué se eliminó. Verificación del módulo ahora dice "via Prisma Studio" en vez de "via Prisma Studio o el endpoint".

### Notes

- **Paso 3.7**: 3/12 áreas cerradas (`auth`, `admin`, `users`). Pendientes: `applications`, `internships`, `ats`, `chat`, `interviews`, `notifications`, `matching`, `perfil`, `health`.
- Resto del área `users` está limpio: `me`, `registro`, `profile/student`, `profile/company` usan `requireAuth(role?)` correctamente, schemas Zod completos, services llamados con `auth.user.id` (sin posibilidad de leer datos ajenos).
- Sin tests nuevos — el cambio es eliminar código sin uso. Suite 903/903 sigue verde.

## [1.10.6] - 2026-04-27

### Security

- **Hardening de `PATCH /api/admin/empresas/[id]` (Fase 3 paso 3.7 / findings #B1, #B2, #B3)** — segundo lote de fixes derivado del audit `/api/*`. Cierra los 3 ⚠️ levantados en el área `admin`:
  - **#B1 — validación de body con Zod**. Antes: `(await request.json()) as { action: string }` (cast TypeScript + chequeo manual). Ahora: `z.object({ action: z.enum(["approve", "reject"]) })` con `safeParse`. Body que no parsea (json roto, no objeto, action inválida) → 400 con `details` de Zod.
  - **#B2 — diferenciar 404 de 500**. Antes: `Prisma P2025 RecordNotFound` caía en el catch genérico → 500. Ahora: try/catch específico sobre el `prisma.companyProfile.update`, si `err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025"` → 404 `"Empresa no encontrada"`. Cualquier otro error sigue siendo 500.
  - **#B3 — fallos del email a Sentry**. Antes: `sendCompanyStatusEmail(...).catch((err) => console.error(...))` se perdía en Vercel. Ahora: `Sentry.captureException(err, { tags: { mail: "company_status" }, extra: { empresaId, newStatus } })`. El admin puede rastrear desde Sentry qué emails de aprobación/rechazo no salieron y reenviarlos manualmente.

### Tests

- Suite total: **903 tests / 48 archivos** verde (antes 891 / 47). +12 tests nuevos en `src/test/unit/admin-empresas-route.test.ts` cubriendo: auth (401/403 propagados sin tocar DB), body validation (json roto, body vacío, action inválida, body string), happy paths (approve/reject con email correcto), error handling (P2025 → 404 sin email, error genérico → 500 sin Sentry mail-tagged), mail failure → Sentry con tags y extras correctos, mail OK → no Sentry.

### Notes

- **Paso 3.7**: 2/12 áreas cerradas (`auth`, `admin`). Pendientes: `users`, `applications`, `internships`, `ats`, `chat`, `interviews`, `notifications`, `matching`, `perfil`, `health`.
- **Patrón emergente**: el handler de admin tenía 3 problemas que esperamos repetir en otras áreas: (a) cast `as` en body en vez de Zod, (b) catch genérico que esconde 404s detrás de 500s, (c) errores de mail que solo van a `console`. Los 3 son boy-scout fixes localizados; si aparecen en muchos handlers, evaluamos refactor parejo (helper `parseBody(schema, req)` y wrapper de mailer con Sentry).

## [1.10.5] - 2026-04-27

### Security

- **Reuse de refresh token a Sentry (Fase 3 paso 3.7 / finding A2)** — primer fix derivado del audit `/api/*` (paso 3.7). Antes, cuando `validateAndRotate` retornaba `kind: "reuse-detected"` en `/api/auth/refresh`, el evento solo quedaba en `console.warn(...)`. En Vercel los logs de console se pierden rápido y este es un evento de seguridad **crítico** (señal fuerte de cuenta comprometida — alguien usó un refresh ya rotado). Ahora se emite `Sentry.captureMessage("Refresh token reuse detected", { level: "error", tags: { auth: "refresh_reuse" }, extra: { userId, ip } })` para que dispare alertas.
  - **Level `error` (no `warning`)** — coherente con la severidad. A diferencia de los login attempts del paso 3.6 (level `warning`, son intentos fallidos esperables), un reuse de refresh token rotado solo ocurre por compromiso de cookie o ataque MITM.
  - **No se hashea `userId`** — el `userId` interno (cuid generado por Prisma) no es PII por sí mismo y es el identificador útil para mitigar (revocar tokens del user, alertar al usuario).

### Tests

- Suite total: **891 tests / 47 archivos** verde (antes 882 / 46). +9 tests en `src/test/unit/auth-refresh-route.test.ts` cubriendo: reuse-detected → captura con tags y extras correctos, status 401, cookies clearadas, ip "unknown" cuando falta `x-forwarded-for`, **happy path NO emite Sentry**, **kind=invalid NO emite Sentry**, **sin cookie NO emite Sentry**, **rate-limited NO emite Sentry**, payload no contiene rawToken plaintext.

### Notes

- **Paso 3.7 sigue abierto** — este es el primer fix de findings detectados por el audit. Áreas pendientes: `admin`, `users`, `applications`, `internships`, `ats`, `chat`, `interviews`, `notifications`, `matching`, `perfil`, `health`. El finding `#A1` (enumeration por timing en `auth/empresa/register`) queda documentado como ⚠️ aceptado — el rate limit `5/h por IP` mitiga el ataque a un costo razonable.
- Próximo paso del 3.7: auditar `/api/admin`.

## [1.10.4] - 2026-04-26

### Added

- **Telemetría de login attempts a Sentry (Fase 3 paso 3.6 / P2 — tarea 2 de 3)** — cada intento de login fallido al `CredentialsProvider` emite `Sentry.captureMessage("Failed login attempt", { level: "warning" })` con tags `{ auth: "failed_login", reason: <X> }` y extras `{ email_hash, ip }`. Cada intento exitoso deja un `Sentry.addBreadcrumb({ category: "auth.login", level: "info" })` que da contexto sin saturar el inbox de Sentry. Los 4 valores de `reason` cubren los 4 paths de retorno `null` del `authorize`:
  - **`missing_credentials`** — sin `email` o sin `password` en el payload.
  - **`rate_limited`** — el rate limit (5 intentos / 5 min por IP+email) cortó el flujo.
  - **`user_not_found_or_not_company`** — el email no está en `User`, el `role` no es `COMPANY` o el user no tiene `passwordHash`.
  - **`invalid_password`** — bcrypt no matcheó el hash.

### Security / Privacy

- **Email hasheado, no plaintext.** En lugar de loguear el email del intento, se hashea con `crypto.createHash("sha256")` y se truncan los primeros 8 chars hex. Permite correlacionar intentos del mismo atacante en una ventana sin guardar PII en Sentry. El password NUNCA aparece en el payload (ni siquiera en los breadcrumbs). El IP sí va en plaintext porque ya es necesario para correlación de ataques distribuidos y aparece en los logs de Vercel/Sentry de todos modos.
- El hash es **case-insensitive** (`email.toLowerCase()` antes de hashear) — `FOO@BAR.COM` y `foo@bar.com` colapsan al mismo hash, igual que el rate limit.

### Tests

- Suite total: **882 tests / 46 archivos** verde (antes 873). +9 tests en `src/test/unit/auth.test.ts` cubriendo: cada `reason` con su payload, success path → solo breadcrumb, hash case-insensitive, **payload no contiene plaintext email ni password** (verificado con `JSON.stringify(call).not.toContain(...)`).
- Mock de `@sentry/nextjs` agregado al test file (`captureMessage` y `addBreadcrumb` como `vi.fn()` hoisted).

### Notes

- **Cobertura del callback `signIn` (Google OAuth)**: en este commit NO se sumó telemetría al callback `signIn` cuando el create de DB falla y retorna `false` (ya capturado por el global error handler de Sentry vía `instrumentation.ts`). Si en el futuro se quiere distinguir "fallo de DB en create de student" de un error genérico, sumar `Sentry.captureException` en ese path.
- **Pendientes Fase 3 P2** (1 tarea restante): audit `/api/*` (`requireAuth` + Zod + no leak de datos ajenos).

## [1.10.3] - 2026-04-26

### Added

- **Headers extra de seguridad (Fase 3 paso 3.5 / P2 — tarea 3 de 3)** — sumados a la lista estática de `next.config.ts`:
  - **`X-Permitted-Cross-Domain-Policies: none`** — bloquea Adobe Flash/PDF cargando archivos `crossdomain.xml` que permitan acceso cross-origin. Vector legacy pero recomendado por OWASP Secure Headers Project.
  - **`Cross-Origin-Opener-Policy: same-origin`** — aísla el browsing context: si una página abre `window.open()` a un origen distinto, el handle queda neutralizado (no `window.opener` cross-origin). Mitiga ataques tipo Spectre/side-channel via opener y tabnabbing reverso.

### Notes

- **COOP no rompe Google OAuth** porque NextAuth usa redirect flow (no popup). Validado con la suite E2E `e2e/auth-credentials.spec.ts` (login empresa con credentials) y por inspección del código de NextAuth — no usa `window.opener` ni `postMessage` cross-origin. Si en el futuro se agrega popup login, COOP `same-origin` puede romper la comunicación con la ventana popup; en ese caso evaluar `same-origin-allow-popups`.
- **No se agregó `Cross-Origin-Embedder-Policy: require-corp`** a propósito: rompería imágenes y recursos cross-origin (avatares de Google `lh3.googleusercontent.com`, archivos de Supabase Storage). El beneficio (`crossOriginIsolated = true`) no es relevante hoy porque PractiX no usa `SharedArrayBuffer` ni APIs que lo requieran.
- **No se agregó `Cross-Origin-Resource-Policy`** porque el default `same-origin` que aplican algunos browsers a recursos sin header explícito ya es razonable, y forzar `same-site` rompería las imágenes externas de avatar/storage.
- Validación en producción: `curl -I https://practix.vercel.app/` debe mostrar las dos cabeceras nuevas. Suite 873/873 verde — sin tests nuevos porque la convención del repo ya no testea presencia de headers estáticos (los HSTS/X-Frame/etc. tampoco están testeados unit/E2E).
- **Pendientes Fase 3 P2** (2 tareas restantes): audit `/api/*` (`requireAuth` + Zod + no leak) y login attempts a Sentry con breadcrumbs.

## [1.10.2] - 2026-04-26

### Security

- **CI: `pnpm audit` sube de `--audit-level=high` a `--audit-level=moderate` (Fase 3 paso 3.4 / P1.2)** — cierra el segundo P1 de seguridad de Fase 3 según `context/refactor-plan.md`. Antes el job dejaba pasar vulnerabilidades de severidad `moderate`; ahora cualquier advisory `moderate-or-higher` rompe CI.
  - Resueltas 9 vulnerabilidades activas detectadas en el audit local previo al cambio: **4 HIGH** (`@xmldom/xmldom <0.8.13` vía `mammoth`: uncontrolled recursion DoS + 3 variantes de XML node injection — `GHSA-2v35-w6hq-6mfw`, `GHSA-f6ww-3ggp-fr8h`, `GHSA-x6wf-f3px-wcqx`, `GHSA-j759-j44w-7fr8`); **1 moderate** `@hono/node-server <1.19.13` (middleware bypass vía repeated slashes — `GHSA-92pp-h63x-v22m`, dev-only vía `prisma>@prisma/dev`); **1 moderate** `hono <4.12.14` (HTML injection en `hono/jsx` SSR — `GHSA-458j-xx4x-4375`, dev-only vía `prisma>@prisma/dev`); **1 moderate** `uuid <14.0.0` (missing buffer bounds check en `v3/v5/v6` cuando `buf` es provisto — `GHSA-w5hq-g745-h8pq`, NO aplicable al call-site de `next-auth@4.24.13` que usa `v4()` sin `buf`, pero subimos versión por higiene); **2 moderate** `postcss <8.5.10` (XSS vía `</style>` en CSS stringify — `GHSA-qx2v-qp2m-jg93`, vía `next` y `@tailwindcss/postcss`).

### Added

- **`pnpm.overrides` en `package.json`** — fuerza versiones parchadas en dependencias transitivas:
  - `@xmldom/xmldom: ">=0.8.13"` (0.8.12 → 0.9.10) — mammoth aún no bumpeó, override puente.
  - `@hono/node-server: ">=1.19.13"` (1.19.11 → 2.0.0) — major bump aceptado por ser dev-only de prisma.
  - `hono: ">=4.12.14"` (4.12.12 → 4.12.15) — patch.
  - `postcss: ">=8.5.10"` (8.4.31/8.5.9 → 8.5.12) — patch.
  - `uuid: "^14.0.0"` (8.3.2 → 14.0.0) — major bump validado contra `next-auth@4.24.13` (export `v4` preservado en v14).

### Changed

- **`.github/workflows/ci.yml:75`**: `--audit-level=high` → `--audit-level=moderate`.

### Tests

- Suite total: **873 tests / 46 archivos** verde (antes 869). Sin tocar tests; el override `uuid: ^14` se validó corriendo la suite completa + `tsc --noEmit` después de reinstalar.

### Notes

- `pnpm audit --audit-level=moderate` local: `No known vulnerabilities found`.
- **Lección sobre `uuid <14`**: el advisory pedía v14 por bounds check en `v3/v5/v6`. `next-auth@4` usa solo `v4()` sin `buf`, así que NO estaba afectado en runtime. Igual se actualizó porque `pnpm audit` no diferencia call-site, y mantener el flag a nivel `moderate` requiere que el report quede limpio. Plan B (ignore-CVE) quedó como fallback documentado, no necesario.
- **Lección sobre `@hono/node-server@2.0.0`**: salto major dentro de `prisma@7.7.0 > @prisma/dev > @hono/node-server`. `prisma generate` (postinstall) corrió OK, suite verde — riesgo cubierto, pero conviene reverificar al próximo bump de `prisma`.
- **Pendientes Fase 3 P2** (3 tareas): audit `/api/*` (requireAuth + Zod + no leak de datos ajenos), login attempts a Sentry con breadcrumbs, headers extra (`X-Permitted-Cross-Domain-Policies`, `Cross-Origin-Opener-Policy`).

## [1.10.1] - 2026-04-26

### Fixed

- **Migración pendiente de `refresh_tokens` aplicada en Supabase.** El modelo `RefreshToken` se agregó a `prisma/schema.prisma` en el cierre del paso 3.2 (commit `040f1e8`, bump 1.8.0), pero la tabla nunca se creó en la DB de Supabase. El bug se manifestaba como `P2021 / TableDoesNotExist` en cada login (Google OAuth o Credentials) cuando `events.signIn` invocaba `issueRefreshToken`. Por el manejo fail-soft del callback, el login NO se bloqueaba — pero el refresh token rotation no funcionaba y cada login dejaba el error en logs.
  - Causa raíz: el proyecto nunca usó `prisma migrate` para sincronizar el schema con Supabase. Hasta el commit `5863dee`, además, las migraciones via pooler de pgBouncer estaban rotas. Por convención del repo se aplica la migración via SQL manual + Supabase SQL Editor (mismo workflow que `add_fk_cascades.sql` del 2026-04-26).

### Added

- **`prisma/manual-migrations/2026-04-26_create_refresh_tokens.sql`** — SQL manual reviewable como audit trail. Crea `refresh_tokens` con sus 3 índices (`tokenHash` UNIQUE, `userId`, `expiresAt`) y el FK a `users(id)` con `ON DELETE CASCADE` (declarado en schema con `onDelete: Cascade`). Incluye sección de rollback comentada al final.

### Notes

- Suite verde sin cambios: **869 tests / 46 archivos**. El bug era de operación de DB, no afectaba ni runtime ni tests (los tests usan mock de Prisma vía `src/test/mocks/prisma.ts`, que YA tenía `refreshToken: createModelMock()` desde 1.8.0).
- Validado contra Supabase: aplicado el SQL en SQL Editor; reiniciado `pnpm dev`; login con Google completó sin `P2021` en logs.

## [1.10.0] - 2026-04-26

### Added

- **CSP estricto con nonces dinámicos por request (Fase 3, Paso 3.3 / P1.1)** — cierra el primer P1 de seguridad de Fase 3. Sustituye el CSP estático laxo de `next.config.ts` (que tenía `'unsafe-eval' 'unsafe-inline'` en `script-src`) por una política locked con nonce dinámico por request, generado en `src/proxy.ts`. Ver `docs/specs/csp.spec.md`.
  - **`script-src`** prod: `'self' 'nonce-X' 'strict-dynamic' https://*.sentry.io`. Sin `unsafe-eval`, sin `unsafe-inline`. `'strict-dynamic'` necesario para que los chunks dinámicos de Next que un script con nonce válido carga, hereden el permiso.
  - **`script-src`** dev: idem + `'unsafe-eval'`. **Asimetría documentada**: React 19 dev mode usa `eval()` para reconstruir callstacks de devtools (`"React requires eval() in development mode"`); en prod NO. La diferencia es controlada por el flag `isDev` que `proxy.ts` deriva de `process.env.NODE_ENV`.
  - **Directivas nuevas**: `base-uri 'self'` (anti `<base href>` injection), `form-action 'self'` (anti form-exfiltration), `object-src 'none'` (bloquea legacy `<object>/<embed>/<applet>`).
  - **`style-src`** mantiene `'unsafe-inline'` a propósito: Tailwind v4, next/font y Radix-style libs emiten `<style>` y `style="..."` inline. Sacarlo rompería UI; threat model de CSS injection es bajo. Decisión documentada en el spec.
- **Helper `src/server/lib/csp.ts`** con `generateNonce()` (UUID v4 → base64) y `buildCspHeader(nonce, isDev)` (puro, testeable).

### Changed

- **`src/proxy.ts`**: genera nonce, inyecta `x-nonce` en el request (Next lo detecta automáticamente y lo aplica a sus scripts internos: `__NEXT_DATA__`, RSC payload streaming, hydration, font/css preloads). Setea `Content-Security-Policy` en el response con el mismo nonce. Helper local `withSecurity(res)` factoriza la lógica de aplicar `x-request-id` + CSP a passthrough y a los 5 redirects de auth.
- **`next.config.ts`**: removido el `cspHeader` estático y la línea `{ key: "Content-Security-Policy", value: cspHeader }`. Los demás headers (HSTS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy) quedan donde estaban. Comentario explica que CSP ahora vive en `proxy.ts`.

### Tests

- Suite total: **869 tests / 46 archivos** verde (antes 851). Coverage: **functions 100%**, lines 99.74%, branches 94.19% — NFR mantenido.
- Tests nuevos:
  - `csp.test.ts` (22 tests): `generateNonce` (no vacío, base64, valores distintos consecutivos); `buildCspHeader` modo prod (default-src, nonce, NO unsafe-eval, NO unsafe-inline en script-src, presencia de strict-dynamic, hosts de Sentry/Supabase/HF/Brevo/Google Fonts, frame-ancestors/base-uri/form-action/object-src, separación con `;`); `buildCspHeader` modo dev (agrega unsafe-eval al script-src; conserva nonce y strict-dynamic; sigue sin unsafe-inline).
- E2E nuevo `e2e/csp.spec.ts` (6 tests): header CSP presente en `/`, nonce con formato base64, sin `'unsafe-eval'` en producción, dos requests con nonces distintos, sin violaciones CSP en console al cargar `/`, `/login`, `/practicas` y `/dashboard/empresa` (autenticado). NO corrido en CI todavía — validado vía dev server local.

### Notes

- Validación manual sobre dev server: 62/62 `<script>` del HTML inicial llevan `nonce` aplicado por Next.js. Login con Google completó el flow sin warnings de CSP en console.
- **`promps/PROMP/modulo-12-deploy.md`** queda con CSP viejo a propósito (es material didáctico del módulo, no convención del proyecto). Si en algún momento se sincroniza, se actualiza ahí también.
- **Pendiente Fase 3 P1**: el otro P1 (`pnpm audit --audit-level=moderate` en CI) no se tocó en este commit.

## [1.9.0] - 2026-04-26

### Added

- **Política `onDelete` explícita en 8 FKs** — auditoría del schema reveló 8 relaciones que defaulteaban a `NO ACTION` de Postgres (= bloqueo silencioso). Borrar un `User` con entrevistas asociadas fallaba por FK violation; admin panel para rechazar empresas y baja GDPR rotos en producción. Ver `docs/specs/db-cascades.spec.md`.
  - 7 FKs pasan a `Cascade`: `Conversation.company/student → User`, `Interview.{company,student,internship,application,conversation}`.
  - 1 FK pasa a `SetNull`: `Message.sender → User`. Preserva el historial visible para la contraparte cuando se borra un user. Implica `Message.senderId String?` (breaking en tipos TypeScript — `MessageBubble` ahora muestra "Usuario eliminado" cuando `sender` es null).
- **Suite de tests de integración con DB real** — primer caso del proyecto. `src/test/integration/db-cascades.test.ts` con los 6 escenarios del spec corriendo contra Postgres en Docker. Config aislado (`vitest.integration.config.ts`) y script `pnpm test:integration` separado del default (no corre en CI ni en `pnpm test` para no requerir DB up).
- **`prisma/manual-migrations/2026-04-26_add_fk_cascades.sql`** — SQL manual reviewable como audit trail. Aplicable con `psql` o desde el SQL Editor de Supabase. Incluye sección de rollback comentada al final.
- **`docker-compose.yml`**: puerto del postgres dev cambiado de `5432` a `5433` para evitar conflicto con instalaciones nativas de Postgres en Windows (que ganan el listen sobre Docker).

### Changed

- **`prisma/schema.prisma`**: las 8 FKs declaran su política `onDelete` explícita. `Message.senderId` y `Message.sender` son nullables.
- **`src/components/chat/ChatWindow.tsx`**: tipos `Message.senderId` y `Message.sender` aceptan null; render con fallback `"Usuario eliminado"` cuando `sender` es null.
- **`src/components/chat/ConversationList.tsx`**: tipo `lastMessage.senderId` aceptado nullable.
- **`src/test/components/ChatWindow.test.tsx`**: mock de `MessageBubble` extendido con `data-sender-name`. Nuevo test del caso `sender = null`.
- **`vitest.config.ts`**: excluye `src/test/integration/**` de la suite default.

### Notes

- Suite total: **851 tests / 45 archivos** (+1 test nuevo del caso sender null). Coverage: 100% functions (310/310), lines 99.74%, branches 94.19%.
- Tests de integración: 6/6 verde contra Docker en `localhost:5433`.
- **Pendiente operativo**: aplicar el SQL manual a Supabase. La migración es ALTER (no destructiva): solo redefine política para deletes futuros, los registros existentes no se tocan.

## [1.8.1] - 2026-04-26

### Fixed

- **`prisma.config.ts`: migraciones a Supabase corrían por el pooler en vez de la conexión directa.** Prisma 7.0 eliminó el campo `datasource.directUrl` del config — el `directUrl` que quedó del setup anterior era ignorado silenciosamente (verificado con `node -e "require('prisma/config').defineConfig({...})"`). El `url` que se pasaba era `DATABASE_URL` (pooler de pgBouncer en Supabase, puerto 6543), pero pgBouncer no soporta todas las queries que usa `prisma migrate`. La nueva forma en Prisma 7: el `url` del config TS es el que la CLI usa para migraciones (el cliente runtime sigue leyendo `DATABASE_URL` del env por convención, sin pasar por este config).
  - Cambio: `url: process.env.DIRECT_URL ?? process.env.DATABASE_URL`. Si hay `DIRECT_URL` (Supabase) la CLI usa la conexión directa (5432); si no (Docker local: solo hay una conexión directa al postgres del container) cae a `DATABASE_URL`.
  - Removido el `@ts-expect-error` y `directUrl: process.env.DIRECT_URL` (era código muerto en runtime).

### Changed

- `README.md`: documenta la variable `DIRECT_URL` en la tabla de variables de entorno (antes no aparecía aunque ya estaba en `src/lib/env.ts` como opcional). Aclara que `DATABASE_URL` lo usa el cliente Prisma (queries) y `DIRECT_URL` la CLI (migraciones).

### Notes

- Suite verde sin cambios: **850 tests / 45 archivos**. El bug era de configuración CLI, no afectaba ni runtime ni tests.
- Cómo verificar en producción: correr `pnpm db:push` con `DIRECT_URL` en `.env.local`. La CLI debería conectar al puerto 5432 directo (no al 6543 pooler). Si la migración antes fallaba con "prepared statement does not exist" o similar, este era el motivo.

## [1.8.0] - 2026-04-26

### Added

- **JWT 15 min + refresh token rotation (Fase 3, Paso 3.2)** — cierre del último P0 de seguridad de Fase 3, según ADR-002. Reduce la ventana de ataque por token comprometido de 24 horas a 15 minutos.
  - **Access token** JWT con `maxAge: 15 * 60` (15 min). Cookie `next-auth.session-token` (HTTP) o `__Secure-next-auth.session-token` (HTTPS). Firmado con `NEXTAUTH_SECRET` vía `next-auth/jwt encode()` desde `/api/auth/refresh` para mantener payload indistinguible del emitido en signIn.
  - **Refresh token** opaco: 32 bytes random hex, almacenado hasheado SHA-256 en tabla `refresh_tokens`. TTL 7 días. Cookie `practix.refresh-token` (HTTP) o `__Host-practix.refresh-token` (HTTPS).
- **Tabla `refresh_tokens`** en Prisma schema con `id, userId, tokenHash UNIQUE, expiresAt, revokedAt, replacedBy, createdAt`. Índices en `userId` y `expiresAt`. `onDelete: Cascade` desde User.
- **Service `src/server/services/refresh-tokens.service.ts`**: `issueRefreshToken`, `validateAndRotate`, `revokeRefreshToken`, `revokeAllForUser`. Resultado discriminado `{ kind: "ok" | "invalid" | "reuse-detected" }` en `validateAndRotate`. **Reuse detection**: usar refresh revocado dispara revocación masiva de todos los tokens activos del user (asume compromiso).
- **Helpers**: `src/server/lib/auth-jwt.ts` (`buildJwtPayload` reproduce el shape del callback `jwt`; `encodeAccessJwt` firma con TTL 15min) y `src/server/lib/auth-cookies.ts` (nombres y opciones según protocolo HTTP/HTTPS).
- **Endpoint `POST /api/auth/refresh`**: lee cookie del refresh, valida + rota, emite nuevo access JWT y setea ambas cookies. Rate limit 10 req / 1 min por IP. Mensajes 401 distinguibles por caso (sin sesión / inválido / reuse-detected) con `console.warn` para reuse.
- **Endpoint `POST /api/auth/logout`**: revoca refresh activo, limpia ambas cookies. Idempotente.
- **`events.signIn` en `src/lib/auth.ts`**: al completar cualquier sign-in (Google OAuth o Credentials), emite refresh inicial y setea cookie con `cookies()` de `next/headers`. Fail-soft: si la emisión falla, el sign-in NO se bloquea (mejor degradación parcial que login bloqueado).
- **Wrapper cliente `src/lib/client/fetch-with-refresh.ts`**: intercepta 401, llama a `/api/auth/refresh`, reintenta UNA vez. **Single-flight** por tab (variable module-level con `.finally()` que limpia). Anti-loop para `/api/auth/refresh` y `/api/auth/logout`. Redirect a `/login?callbackUrl=...` preservando pathname+search en falla. NO altera shape del fetch (no añade `credentials: "same-origin"` por default — fetch a mismo origen ya envía cookies).

### Changed

- **Migración a `fetchWithRefresh`** en 14 archivos cliente (50 llamadas) — pages del dashboard, hooks, componentes de chat. Páginas en `(auth)` (login, registro, forgot, reset) mantienen `fetch` directo porque NO usan sesión activa.
- `src/lib/auth.ts`: `session.maxAge: 24 * 60 * 60 → ACCESS_TOKEN_MAX_AGE_S` (15 min).
- `src/test/mocks/prisma.ts`: agrega `refreshToken: createModelMock()` para que el mock de Prisma cubra el nuevo modelo.

### Tests

- Suite total: **850 tests / 45 archivos** verde (antes 802).
- Coverage: **functions 100% (310/310)**, lines 99.74%, statements 98.86%, branches 94.16% — NFR mantenido.
- Tests nuevos:
  - `refresh-tokens.service.test.ts` (19 tests): issue genera hash y nunca persiste raw; rotación happy path con replacedBy; reuse detection revoca masivo; expirado/invalid retorna `kind: "invalid"`; revoke idempotente; helpers de hash/random determinísticos.
  - `fetch-with-refresh.test.ts` (13 tests): happy path; interceptor 401 con retry; redirect a /login con callbackUrl preservado; single-flight (2 requests paralelos comparten 1 sola llamada a /refresh); anti-loop para /refresh y /logout; permite nuevo refresh tras uno completado.
  - `auth-cookies.test.ts` (4 tests): nombres según HTTP/HTTPS, shape de session/refresh/clear cookies.
  - `auth-jwt.test.ts` (8 tests): `buildJwtPayload` para STUDENT (con/sin rut), COMPANY (con/sin profile, con/sin companyName); `encodeAccessJwt` delega a `next-auth/jwt encode()` con secret y maxAge correcto.
  - `auth.test.ts` extendido con 4 tests de `events.signIn`: emisión OK con cookie seteada; noop sin email; noop si user no existe en DB; fail-soft con `console.error` en error de emisión.

### Migration

Schema cambió. **Hay que correr `pnpm db:push` con la DB local arriba (`docker compose up`)** después de pull. La tabla `refresh_tokens` no tiene datos existentes que migrar — los usuarios actuales tendrán que volver a iniciar sesión la primera vez (sin refresh token previo, el wrapper recibirá 401 al primer intento de refresh y los redirigirá a /login).

## [1.7.1] - 2026-04-26

### Fixed

- **Errores de TypeScript acumulados en `master` que vitest no detectaba** (transpila sin chequear tipos). `tsc --noEmit` quedó verde tras estos arreglos:
  - `prisma.config.ts`: Prisma 7 ya no declara `directUrl` en el config type. Marcado con `@ts-expect-error` + comentario apuntando a revisión en Fase 4/6 — confirmar que las migraciones a Supabase siguen tomando `DIRECT_URL` desde env (no se reproduce en runtime el `directUrl` del `defineConfig` con esta versión).
  - `src/server/lib/ats/scoring-engine.ts`: cast de `module.params` a `unknown` para que las conversiones a `PortfolioParams` (campos no opcionales) no fallen el check de overlap parcial.
  - `src/app/api/ats/score/[applicationId]/route.ts` y `src/app/api/ats/score/job/[jobId]/route.ts`: `moduleScores` se castea a `Prisma.InputJsonValue` (era `ModuleScoreDetail[]`, sin index signature compatible con `Json`).
  - `src/app/api/auth/reset-password/route.ts`: `parsed.error.errors` → `parsed.error.issues` (Zod 4 renombró la propiedad).
  - `src/app/(dashboard)/dashboard/estudiante/page.tsx`: removido `@ts-expect-error` muerto sobre `<Icon />` (ya no había error que esperar).
  - `src/test/components/ChatWindow.test.tsx`: `onMock` tipado con `(..._args: unknown[])` para que `mock.calls[0]?.[2]` no sea `never`. El handler se castea inline al shape `(payload: { new: { conversationId: string } }) => Promise<void> | void`.
  - `src/test/components/KanbanColumn.test.tsx`: `buildCandidate` recibe `Record<string, unknown>` (los tests pasan `name` flat que no existe en `CandidateData`); el cast final pasa por `unknown` para deslindar overlap. `dataTransfer` mock con `as unknown as DataTransfer`.
  - `src/test/unit/auth.test.ts`: alias local `SessionUserExt` para acceder a `id`/`role`/`registrationCompleted`/`companyStatus`/`name` en `session.user` sin chocar con la unión del tipo de NextAuth.
  - `src/test/unit/cv-parser.test.ts`: anotación `this: unknown` en el patch de `Module.prototype.require`.
  - `src/test/unit/mail.test.ts`: signature de `lastCallBody` afloja a `{ mock: { calls: unknown[][] } }` (el `vi.spyOn<typeof globalThis, "fetch">` no compilaba con la constraint de keys de globalThis).

### Notes

- Suite verde sin cambios: **802 tests / 41 archivos**.
- `tsc --noEmit` ahora es bloqueante de verdad — la presencia de `.next/dev/types/validator.ts` corrupto ocultaba estos errores con fallas de parser en archivos generados.
- Boy Scout previo al cierre de Fase 3 paso 3.2 (refresh tokens). El paso 3.2 introducía nuevo código sobre estos archivos y hubiese mezclado el fix de tipos con la feature.

## [1.7.0] - 2026-04-25

### Added

- **Rate limit en endpoints de auth (Fase 3, Paso 3.1.5)** — cierre del gap declarado en el commit `f256259`. Cubre los 3 callers que faltaban según la tabla del ADR-003:
  - `POST /api/auth/forgot-password`: 3 req / 5 min por IP. Mensaje 429 genérico que no referencia el email (anti-enumeration).
  - `POST /api/auth/reset-password`: 10 req / 5 min por IP. Defensa adicional al token de 256 bits.
  - `authorize` del CredentialsProvider (`src/lib/auth.ts`): 5 req / 5 min por **IP + email** (lowercased). Al exceder retorna `null` — NextAuth lo traduce a "credenciales inválidas", indistinguible para el atacante. Loguea `console.warn` con IP y email.
- Helper `extractClientIp(req)` en `src/lib/auth.ts` que normaliza el header `x-forwarded-for` aceptando `req.headers` como `Headers` (App Router) o plain object (capitalized incluído), tomando el primer IP de listas encadenadas.
- 11 tests nuevos en `src/test/unit/auth.test.ts` (`describe("CredentialsProvider — rate limit en login")`): throttling con short-circuit a Prisma, identifier compuesto, ramas de `extractClientIp` (Headers/plain/encadenado/unknown), happy path. Mock hoisted de `@/server/lib/rate-limit` con default `success: true` en `beforeEach`.
- `scripts/test-upstash-ratelimit.ts` — smoke test contra Upstash real para distinguir modo Upstash vs fallback (latencia y comportamiento de bloqueo).

### Changed

- `docs/specs/rate-limit.spec.md`: agrega tabla de **callers cubiertos** con limit/ventana/identifier por endpoint y las decisiones de identifier (login `IP + email` vs forgot/reset por IP vs mutaciones autenticadas por userId). Quita el gap "Rate limit en login y forgot-password" de "Casos NO cubiertos".
- `docs/adr/003-rate-limiting-upstash.md`: status `Propuesto` → `Aceptado, implementado (Fase 3 pasos 3.1 y 3.1.5)`. Apéndice "Notas de implementación" con detalle de los dos commits y desviación de la tabla original (ventana de login 1 min → 5 min, más agresiva contra brute-force lento).

### Tests

- Suite total: **802 tests / 41 archivos** en verde (antes 791).
- Coverage: **functions 100% (291/291)**, lines 99.72%, statements 98.85%, branches 94.28% — NFR mantenido.
- `src/lib/auth.ts`: 100% func, 98.24% branches, 100% lines.

## [1.6.0] - 2026-04-25

### Changed

- **Rate limit distribuido (Fase 3, Paso 3.1)** — `src/server/lib/rate-limit.ts` ahora usa **Upstash Redis** vía `@upstash/ratelimit` con algoritmo **sliding window**. Resuelve gap de severidad **Alta** del ADR-003: el rate limit in-memory no funcionaba en Vercel multi-instancia (cada instancia tenía su propio `Map`).
- **Interfaz cambió a async**: `rateLimit(identifier, limit, windowMs)` ahora retorna `Promise`. Los 4 callers (`/api/internships`, `/api/auth/empresa/register`, `/api/matching/recommendations`, `/api/matching/upload-cv`) actualizados con `await`. `rateLimitResponse(resetAt)` se mantiene síncrono.
- **Fallback in-memory automático**: si las env vars `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` no están configuradas, el módulo cae al comportamiento histórico fixed-window (útil para dev local y tests). Loguea `console.warn` la primera vez.
- **Fail-open en error de Upstash**: si la llamada a Redis falla (red, timeout, 5xx), retorna `success: true` y loguea `console.error`. Un fallo de nuestra infra no debe bloquear usuarios legítimos. Riesgo asumido (ADR-003): durante caída de Upstash un atacante puede abusar; mitigación futura es agregar layer en Cloudflare/edge.
- `docs/specs/rate-limit.spec.md` reescrito para reflejar contrato async, ambos modos (Upstash + fallback) y reglas de fail-open.

### Added

- **Variables de entorno opcionales** (`src/lib/env.ts`):
  - `UPSTASH_REDIS_REST_URL` (URL del REST endpoint del Redis de Upstash)
  - `UPSTASH_REDIS_REST_TOKEN` (token de acceso del REST endpoint)
  - Ambas son opcionales en el schema (`.optional()`). En producción deben estar seteadas; en dev/test pueden faltar y el sistema cae al fallback.
- Tests del modo Upstash en `src/test/unit/rate-limit.upstash.test.ts` (7 tests con mock de `@upstash/ratelimit` y `@upstash/redis`): instancia Redis con env, delega a `Ratelimit.limit`, mapea `reset → resetAt`, success/blocked, configuración de sliding window, cache del Ratelimit por par `(limit, windowMs)`, fail-open en error de red, reuso de instancia Redis entre llamadas.

### Dependencies

- `+@upstash/ratelimit ^2.0.8`
- `+@upstash/redis ^1.37.0`

## [1.5.1] - 2026-04-25

### Documentation

- Cierre formal de **Fase 1 del refactor (ADRs)** en `context/refactor-plan.md`: sección "FASE 1 ✅ CERRADA" con tabla de status de los 6 ADRs y referencia al commit principal `a325ea9`.
- ADR 006 — apéndice "Notas de implementación" documentando que el modelo concreto cambió de `sentence-transformers/all-MiniLM-L6-v2` a `BAAI/bge-small-en-v1.5` (ambos 384 dims). El cambio se debe a que HuggingFace Inference API rutea los modelos `sentence-transformers/*` al `SentenceSimilarityPipeline` en el free tier, lo que impide obtener embeddings individuales (solo retorna scores entre pares). La decisión de stack (HF API + 384 dims + cosine + `Float[]`) se mantiene; solo cambia el modelo concreto. Se respeta la convención del README de ADRs: el cuerpo aceptado no se edita; se agrega un apéndice fechado.

## [1.5.0] - 2026-04-25

### Tests

- Cierre de **Fase 2 del refactor (Testing)**. Pasos 11 y 12 — coverage al 100% functions + nuevos tests para llegar a la meta NFR.
- Coverage final: **functions 100%** (287/287), **lines 99.71%**, **statements 98.81%**, **branches 94.15%** (umbrales del proyecto: 100/80/80/80).
- 40 archivos de test en verde, 783 tests totales.
- Unit tests nuevos:
  - `auth.test.ts` (24 tests): cubre `authOptions.callbacks` (signIn, jwt, session), `authorize` del CredentialsProvider y `getAuthSession`. Mock de bcryptjs y next-auth. Reutiliza `prismaMock`.
  - `cv-extractor.test.ts` (34 tests): función pura `parseCVText`. Cubre todas las ramas (skills, soft skills, experiencia por años + por rangos de fecha, educación, idiomas con nivel, portfolio links).
- Unit tests extendidos:
  - `applications.service.test.ts`: agrega `getMyApplications`, `notifyAcceptedApplication`, `notifyRejectedApplication` y todas las ramas de `updateApplicationStatus` (REVIEWED/ACCEPTED/REJECTED + sin notificación cuando status no mapea).
  - `matching.service.test.ts`: agrega `processCV` (upsert con buffer + upload + embedding) y `deleteCV` (limpieza de cvUrl/cvText/embedding).
  - `users.service.test.ts`: agrega `completeStudentRegistration`.
  - `internships.service.test.ts`: agrega `updateInternship` (404 cuando no es dueño + update isActive).
- Component tests extendidos:
  - `ModuleEditModal.test.tsx`: cubre EDUCATION, LANGUAGES, PORTFOLIO completo (incluyendo TagInput preferred + hardFilter de cada tipo) y rama default (`type` no mapeado).
  - `ChatWindow.test.tsx`: handler del payload INSERT del realtime de Supabase (filtra otros conversationIds) + scrollToBottom al llegar mensajes nuevos via polling.
  - `MessageInput.test.tsx`: handler `onInput` del auto-resize del textarea (calcula altura según `scrollHeight`, limita a 128px).
  - `PublicNav.test.tsx`: cierre del drawer al clickear cualquier link interno (Dashboard, Editar perfil, Panel admin, Iniciar sesión, Empezar gratis, Prácticas, logo PractiX).

### Changed

- `vitest.config.ts`:
  - Thresholds elevados a `functions: 100, lines: 80, branches: 80, statements: 80` (NFR del proyecto cumplido).
  - `coverage.exclude` ampliado con archivos sin lógica de negocio: `instrumentation-client.ts` (Sentry boot), `preset-modules.ts` (constante de configuración), `realtime-client.ts` (singleton de Supabase), `providers.tsx` (wrapper de SessionProvider), `lib/env.ts` (zod parse top-level), `lib/constants.ts` (export de string), `app/global-error.tsx` (boundary de Sentry).
  - Coverage ahora reporta sólo código testeable como unit/component, no infra de bootstrap.
- `package.json`: agregado `@vitest/coverage-v8` como devDep (antes corría sin reporter v8).

### Chore

- `Dockerfile.dev` y `.dockerignore`: copiar `prisma/` antes de `pnpm install` para que `postinstall` (que dispara `prisma generate`) no falle por falta de schema. `.dockerignore` reduce el contexto del build (excluye `node_modules`, `.next`, `coverage`, `test-results`, etc.).

## [1.4.2] - 2026-04-23

### Fixed

- `deleteInternship` ahora hace **soft delete** (`isActive: false`) en lugar de borrado físico (`prisma.internship.delete`). Antes, eliminar una práctica destruía el registro y rompía la integridad referencial con `Application` (las postulaciones quedaban huérfanas o se perdían en cascade). El soft delete preserva el historial de postulaciones, mantiene el contrato documentado en `CLAUDE.md` ("Prácticas usan soft delete (campo isActive: Boolean)"), y deja la práctica fuera del listing público porque `listInternships` ya filtra por `isActive: true`. Bug detectado al desbloquear los unit tests del service en la Fase 2 del refactor.

## [1.4.1] - 2026-04-23

### Documentation

- Cierre de Fase 1 del refactor: 6 ADRs en `docs/adr/` con formato Contexto / Decisión / Consecuencias / Alternativas
  - ADR-001 Monolito modular + Clean Architecture (Aceptado)
  - ADR-002 Autenticación con NextAuth + JWT rotativo (Propuesto, implementación en Fase 3)
  - ADR-003 Rate limiting con Upstash Redis (Propuesto, implementación en Fase 3)
  - ADR-004 Testing strategy — pirámide (Aceptado parcial, completa en Fase 2)
  - ADR-005 Observabilidad con Sentry + logger estructurado (Aceptado parcial, completa en Fase 6)
  - ADR-006 Matching con embeddings HuggingFace + cosine similarity (Aceptado, implementado)
- `docs/adr/README.md` con índice, formato y convenciones (un ADR no se edita una vez aceptado; se superseed)

### Chore

- `.gitignore`: ignorar `/test-results` y `/playwright-report` (artifacts de Playwright que se regeneran en cada corrida)

## [1.4.0] - 2026-04-22

### Added

- Responsive completo para mobile (320px edge, 375px iPhone SE, 390-414px Plus) y tablet (768px) con foco en iPhone SE como referencia
  - Drawer hamburguesa en layouts dashboard, admin y público (`PublicNav`) con backdrop, slide desde la izquierda, cierre por overlay, ESC y click en cualquier link del drawer
  - `PublicNav` detecta sesión via `useSession`: cuando hay sesión muestra links del dashboard según rol (STUDENT / COMPANY / ADMIN) en lugar de links públicos de conversión
- Endpoint `DELETE /api/notifications/[id]` con filtro por `userId` para evitar borrados ajenos (404 si no pertenece al usuario)
- Botón X por notificación en el panel de campana con update optimista + rollback en caso de error
- Botón "Volver al dashboard" en el header del panel admin + entrada en el dropdown del usuario

### Changed

- Nomenclatura unificada: "Prácticas" reemplaza a "Explorar" en navs, footer landing y navbar dashboard (se mantiene "Explorá" en copy imperativo)
- Dashboard estudiante: límite de 6 recomendaciones visibles (`visibleRecommendations` consistente en render, tab counter y mensaje del hero)
- Modales (`ScoreBreakdownModal`, modal de detalle de postulación): bottom sheet en mobile (`items-end`) con `max-h-[calc(100dvh-80px)]` para no taparse con navbar sticky, header sticky con X de 44px touch target
- `ModuleCard` ATS: layout de 2 filas en mobile (header con icon+label+actions, slider en segunda fila con ancho completo) para que el weight input respire
- Ranking de candidatos (`/dashboard/empresa/candidatos/[jobId]` y `/dashboard/empresa/ats/[jobId]`): tabla en desktop, cards con badges (Pipeline, ATS, Match) en mobile
- Panel de notificaciones: posicionamiento `fixed` en mobile (`top-[76px] right-3`) para garantizar que entre en viewport; `absolute` en desktop mantenido
- Altura de inbox chat: `h-[calc(100dvh-80px)]` en mobile para que el `MessageInput` quede realmente sticky (antes `min-h-*` permitía que el contenedor crezca más que el viewport y el scroll se llevaba el input)

### Fixed

- Texto desbordando recuadros en detalle de práctica (`/practicas/[id]`): agregado `break-words [overflow-wrap:anywhere]` en H1 título, descripción y requirements; `break-all` en chips de skills
- Auth grids `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` para que los formularios no se aprieten en mobile
- Filter bar `/practicas` selects colapsando mal en mobile
- Panel de notificaciones se salía del viewport por la izquierda (root cause: `right-0` anclado al botón bell que no está al borde derecho del header)
- ATS header con botones "Gestionar candidatos" + "Guardar" desbordando en mobile: ahora se apilan en `<sm:` y se alinean horizontal en `sm:+`

## [1.3.0] - 2026-04-21

### Added

- Columna "Acciones" en la tabla de ranking de candidatos (`/dashboard/empresa/candidatos/[jobId]`) con botones contextuales según estado: Ver CV, Aprobar, Rechazar, Contactar, Enviar email
- Botón "Gestionar candidatos" en el header de la página de configuración ATS para navegar directamente al listado

### Changed

- `ScoreBreakdownModal` pasa a ser puramente informativo (solo muestra breakdown de score). Las acciones (aprobar, rechazar, contactar, enviar email, ver CV) viven ahora en la tabla de ranking para separar responsabilidades: ATS = configurar criterios y ver scores, candidatos = gestionar pipeline
- Pulido visual y refinamiento UI en módulos chat, calendario, perfil, admin y dashboards

### Fixed

- Sincronización entre `status` y `pipelineStatus` al mover tarjetas en el kanban del pipeline. El backend (`PATCH /api/ats/pipeline/[applicationId]`) ahora actualiza ambos campos con mapeo: PENDING→PENDING, REVIEWING→REVIEWED, INTERVIEW→ACCEPTED, REJECTED→REJECTED. El cliente refleja el cambio y resetea el flag de email enviado para permitir reenvío acorde al nuevo estado
- Video del hero en la landing que no arrancaba consistentemente al recargar: `preload="metadata"` → `preload="auto"` para que el buffer esté disponible al autoPlay. Se eliminan `poster="/hero-poster.jpg"` y `<source>` del webm que generaban 404 y retrasaban la inicialización del pipeline de decodificación

## [1.2.1] - 2026-04-17

### Changed

- Rediseño visual "Premium Modern SaaS — Warm Tech" aplicado por oleadas
  - Públicas: landing, listing y detalle de práctica refinadas
  - Auth: login, registro, forgot-password y reset-password alineadas al sistema warm
  - Oleada 1 dashboards: layout, router `/dashboard`, perfil, `dashboard/estudiante` y `dashboard/empresa`
- Sistema de diseño: fondo `#FAFAF8`, cards `rounded-[24px]`, gradientes warm, tabs pill, mesh radial + grain

### Fixed

- Postulación duplicada visualmente en `practicas/[id]`: al recargar una práctica ya postulada el botón "Postularme" volvía a aparecer porque el UI no hidrataba el estado persistido. Ahora al montar se consulta `/api/applications/my` y se setea `applied` + `wasAlreadyApplied` si corresponde, mostrando "Ya te postulaste a esta práctica" con link al dashboard

### Added

- `public/hero-video.mp4` — video de fondo para el hero de la landing

## [1.2.0] - 2026-04-16

### Added

- Módulo de chat en tiempo real entre empresas y candidatos aceptados
  - Optimistic UI: el mensaje aparece al instante sin bloquear el input
  - Polling cada 3 s como fallback garantizado al Supabase Realtime
  - Smart scroll: baja automáticamente solo si el usuario está cerca del fondo
  - Badge de mensajes sin leer en el navbar con polling cada 5 s
- Calendario de entrevistas para empresas (`/dashboard/empresa/calendar`)
  - CRUD completo de entrevistas con modal de confirmación al eliminar
  - Envío de invitación al candidato como mensaje de tipo `INTERVIEW` en el chat
  - Mensajes de tipo `INTERVIEW` alineados al lado del emisor
- Módulo de edición de perfil (`/perfil`)
  - Upload de avatar/logo a Supabase Storage bucket `avatars`
  - Vista previa local con blob URL antes de guardar
  - Actualización en tiempo real del navbar sin re-login vía `update()` de NextAuth
  - Dropdown en el navbar al hacer clic en el avatar con opción "Editar perfil" y "Cerrar sesión"
- Sistema de notificaciones en la campanita del navbar
  - Notificación automática al estudiante cuando su postulación cambia a REVIEWED, ACCEPTED o REJECTED
  - Badge rojo en la campanita con conteo de no leídas
  - Dropdown con historial de notificaciones y opción "Marcar leídas"
  - Polling cada 10 s
- Logo de empresa visible en el explorador de prácticas y en el chat
- Nombre completo (nombre + apellido) del estudiante en el chat para empresas
- Encabezado del chat muestra `Nombre Apellido - Empresa` para el estudiante

### Fixed

- Nombre de empresa en el chat mostraba `User.name` personal en lugar de `CompanyProfile.companyName`
- Scrollbar innecesario en la página de mensajes (`calc(100vh-64px)` → `calc(100vh-80px)`)
- `CompanyProfile.logo` no se sincronizaba al subir avatar — ahora se actualiza en la misma transacción
- `listInternships` usaba `CompanyProfile.logo` sin fallback a `User.image` — empresas antiguas no mostraban logo
- Nombre del usuario de empresa en el navbar mostraba nombre personal en lugar del nombre de la empresa
- CSP bloqueaba URLs `blob:` en `img-src` — agregado `blob:` para permitir previsualización de imágenes
- Bucket `avatars` no existía en Supabase Storage — creado con acceso público

---

## [1.1.0] - 2026-04-13

### Added

- Flujo de registro guiado obligatorio para estudiantes nuevos (`/registro`)
  - Campos: nombre, apellidos, documento de identidad (RUT con validación Módulo 11 o pasaporte/DNI), teléfono con selector de país
  - Pre-rellena nombre desde la sesión de Google
  - Validación client-side completa antes de llamar al servidor
- Selector de país con código de marcación en el campo teléfono (15 países, Chile por defecto)
- Gate de registro en `proxy.ts`: estudiantes sin registro completo son redirigidos a `/registro` en cualquier ruta
- Campos `lastName`, `rut` (único) y `phone` en el modelo `User`
- Endpoint `POST /api/users/registro` con validación Zod y verificación de unicidad de RUT
- Navbar session-aware en homepage y `/practicas`: muestra "Mi Dashboard" si hay sesión activa, "Iniciar sesión" si no
- Modal de detalle al hacer clic en una postulación: descripción completa, área, ubicación, modalidad, duración, requisitos y skills
- `registrationCompleted` en el JWT y sesión de NextAuth para controlar el gate sin consultar DB en cada request

### Fixed

- Sesión aparecía cerrada al navegar al homepage o a `/practicas` — ambas páginas tenían navbar estático sin leer la sesión
- `error.errors` de Zod v4 renombrado a `error.issues` — causaba 500 en el endpoint de registro
- `getMyApplications` devolvía el vector embedding (384 floats) innecesariamente al frontend — excluido con `select`
- Archivos `.doc` (Word binario) aceptados pero no procesables por `mammoth` — eliminados de `ALLOWED_TYPES`
- Bytes nulos (`\x00`) en PDFs causaban error de encoding UTF-8 en PostgreSQL — sanitizado antes de persistir

### Changed

- `middleware.ts` renombrado a `proxy.ts` y función exportada a `proxy` (convención Next.js 16)
- Route `[...nextauth]` actualizado para manejar `params` asíncronos (requerido por Next.js 16)

---

## [1.0.0] - 2026-04-13

### Added

- Notificaciones por email transaccional con Brevo (nueva postulación, cambio de estado)
- Health check endpoint en `/api/health` con verificación de base de datos
- Security headers de producción (HSTS, CSP, X-Frame-Options, etc.)
- Dockerfile multi-stage optimizado para producción (imagen < 300MB)
- Pipeline CI/CD con GitHub Actions: lint, type-check, tests, build y audit de dependencias
- Script `postinstall` para generar Prisma Client automáticamente en Vercel
- `sentry.client.config.ts` — inicialización de Sentry en el navegador con Session Replay
- Tests E2E con Playwright: landing, autenticación y listado de prácticas con filtros
- Tests de componente con Vitest + Testing Library: `InternshipCard` (13 casos)
- Script `prisma/regen-embeddings.ts` para regenerar embeddings tras cambio de modelo

### Fixed

- `processCV` y `deleteCV` usaban `prisma.update` — tronaban si el `StudentProfile` no existía; cambiado a `upsert`
- `updateStudentProfile` en `users.service.ts` — mismo problema corregido con `upsert`
- `GET /api/matching/recommendations` devolvía 400 cuando el estudiante no tenía CV; ahora retorna `[]`
- Embeddings incompatibles entre modelos: seed usaba `BAAI/bge-small-en-v1.5`, app usaba `paraphrase-multilingual-MiniLM-L12-v2` (ruteado incorrectamente a `SentenceSimilarityPipeline` por HuggingFace). Unificado a `BAAI/bge-small-en-v1.5` con límite de 2000 caracteres

---

## [0.1.0] - 2026-04-09

### Added

- Setup inicial del proyecto: Next.js 16 + React 19 + TypeScript + Tailwind v4
- Estructura clean architecture: app/api → server/services → server/lib
- Dependencias: NextAuth, Prisma, Supabase, Zod, HuggingFace, Sentry, Brevo
- Husky + lint-staged + commitlint (conventional commits)
- Vitest + Testing Library + Playwright configurados
- Docker Compose con PostgreSQL 15 para desarrollo local
- Validación de variables de entorno con Zod (src/lib/env.ts)
- Prisma inicializado con datasource postgresql
- Colores brand/accent y tipografía Outfit

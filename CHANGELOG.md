# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

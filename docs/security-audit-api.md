# Security Audit `/api/*` (Fase 3 — Paso 3.7)

> Inventario auditable de todos los handlers HTTP del proyecto.
> Generado el 2026-04-26.
> Aprobación final: cuando todos los handlers estén ✅ o ⚠️ documentados, paso 3.7 cierra y la Fase 3 cierra.

## Convenciones

| Estado | Significado                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------ |
| ✅     | Handler correcto: autorización adecuada, validación de input donde corresponde, output sin leak.       |
| ⚠️     | Observación documentada como decisión consciente o riesgo bajo aceptado. NO bloquea el cierre del 3.7. |
| 🛑     | Fix requerido. Abre commit `fix(security): ...` propio con tests antes de cerrar el 3.7.               |

## Criterios revisados por handler

1. **AuthZ**: ¿usa `requireAuth(role?)` cuando debería? Si es público, ¿el endpoint puede serlo sin riesgo?
2. **Validación de input**: ¿hay schema Zod para body / query / params? Si es un GET sin parámetros usuario-controlados, N/A.
3. **Output**: ¿filtra solo datos del owner / scope correcto? ¿No expone PII de otros usuarios?
4. **Defensa en profundidad**: rate limit donde aplique, anti-enumeration en flows sensibles, no leak via timing.

---

## Áreas

| Área            | Handlers | Estado                                                            |
| --------------- | -------- | ----------------------------------------------------------------- |
| `auth`          | 6        | ✅ cerrada (#A2 fixeado en 1.10.5, #A1 ⚠️ aceptado)               |
| `admin`         | 2        | ✅ cerrada (#B1, #B2, #B3 fixeados en 1.10.6)                     |
| `users`         | 4\*      | ✅ cerrada (#C1 eliminado en 1.10.7)                              |
| `applications`  | 5        | ✅ cerrada (#D1+#D2+#D3+#D4 fixeados en 1.10.8)                   |
| `internships`   | 6        | ✅ cerrada (#E1+#E2+#E3+#E4 fixeados en 1.10.9, #E5 ⚠️ aceptado)  |
| `ats`           | 5        | ✅ cerrada (#F1+#F2+#F3+#F4+#F5 fixeados en 1.10.10)              |
| `chat`          | 6        | ✅ cerrada (#G1+#G2+#G3+#G4 fixeados en 1.10.11, #G5 ⚠️ aceptado) |
| `interviews`    | 7        | ✅ cerrada (#H1+#H2+#H3+#H4 fixeados en 1.10.13, #H5 ⚠️ aceptado) |
| `notifications` | 3        | ✅ cerrada (#I1+#I2 fixeados en 1.10.14, #I3 ⚠️ aceptado)         |
| `matching`      | 2        | ⏳ pendiente                                                      |
| `perfil`        | 2        | ⏳ pendiente                                                      |
| `health`        | 1        | ⏳ pendiente                                                      |

---

## `auth` (6 handlers)

| Método   | Path                         | AuthZ                                                   | Zod                           | Output                                         | Estado                     |
| -------- | ---------------------------- | ------------------------------------------------------- | ----------------------------- | ---------------------------------------------- | -------------------------- |
| GET/POST | `/api/auth/[...nextauth]`    | Público intencional (NextAuth maneja CSRF/state/sesión) | N/A (delegado a NextAuth)     | Cookies `__Secure-*` httpOnly                  | ✅                         |
| POST     | `/api/auth/empresa/register` | Público intencional (registro)                          | `companyRegisterSchema`       | `{success:true}` o 409 sin filtrar otros datos | ⚠️ #A1                     |
| POST     | `/api/auth/forgot-password`  | Público intencional                                     | `z.object({email})`           | Genérico anti-enumeration (incluso en error)   | ✅                         |
| POST     | `/api/auth/reset-password`   | Público intencional (token-bound)                       | `z.object({token, password})` | Genérico, sin revelar si user existe           | ✅                         |
| POST     | `/api/auth/logout`           | No requiere sesión activa (idempotente)                 | N/A (lee cookie)              | `{ok:true}` + clear cookies                    | ✅                         |
| POST     | `/api/auth/refresh`          | Validación por refresh cookie (no requireAuth)          | N/A (lee cookie)              | `{ok, user}` + cookies rotadas                 | ✅ (#A2 cerrado en 1.10.5) |

### Findings activos

**⚠️ #A1 — Enumeration por timing en `auth/empresa/register`**

- Síntoma: el path "email ya registrado" responde con 1 query + 409 (~10ms). El path "email nuevo" responde con 1 query + `bcrypt.hash(cost=12)` + `prisma.user.create` (~200–400ms). Un atacante podría inferir si un email está registrado midiendo latencia.
- Mitigaciones existentes: rate limit por IP `5 / hora` ya cierra ataques de barrido masivo.
- Riesgo residual: bajo. Atacante con muchas IPs aún podría enumerar lentamente.
- Decisión propuesta: **aceptar como ⚠️**. Si quisiéramos cerrar, opciones:
  1. Ejecutar `bcrypt.hash` siempre (descartar el resultado si email existe) → uniformiza tiempos.
  2. Responder genérico `200 OK` siempre y mandar email de "alguien intentó registrarse con tu cuenta" si ya existía → cambia UX.
- Acción: documentado. Si el usuario quiere cerrarlo, abrir fix opcional.

**✅ #A2 — Reuse detection en `auth/refresh` ahora va a Sentry** (cerrado en 1.10.5)

- Antes: cuando `validateAndRotate` retornaba `kind: "reuse-detected"`, el evento solo quedaba en `console.warn(...)`. En Vercel los logs de console se pierden rápido.
- Por qué importaba: detección de reuse de refresh token = señal **fuerte** de cuenta comprometida (alguien usó un token ya rotado). Es un evento de seguridad CRÍTICO que debía visibilizarse en Sentry — coherente con la decisión del paso 3.6 (login attempts a Sentry).
- Fix aplicado: `Sentry.captureMessage("Refresh token reuse detected", { level: "error", tags: { auth: "refresh_reuse" }, extra: { userId, ip } })`. Level `error` (no `warning`) porque a diferencia de un login fallido, un reuse de refresh rotado solo ocurre por compromiso real.
- Tests: 9 nuevos en `src/test/unit/auth-refresh-route.test.ts`. Suite 891/891 verde.

### Notas

- El bcrypt cost 12 está bien (acordado en paso 3.1). Mantenerlo.
- El password schema (`min 8 + upper + lower + digit + symbol`) está duplicado entre `companyRegisterSchema` y `reset-password/route.ts`. Refactor a `passwordSchema` compartido es boy-scout, NO bloquea el audit.
- `auth/logout` no necesita `requireAuth`: una request sin cookies válidas igual termina con cookies clearadas (idempotente y seguro).
- `[...nextauth]` delegate al `authOptions` de `lib/auth.ts` — la lógica sensible (rate limit, telemetría a Sentry, hash de email) ya quedó cubierta en pasos 3.1 y 3.6.

---

## `admin` (2 handlers)

| Método | Path                       | AuthZ               | Zod                                                     | Output                   | Estado                              |
| ------ | -------------------------- | ------------------- | ------------------------------------------------------- | ------------------------ | ----------------------------------- |
| GET    | `/api/admin/empresas`      | `requireAdmin()` ✅ | N/A (sin params usuario-controlados)                    | Lista companies + owners | ✅                                  |
| PATCH  | `/api/admin/empresas/[id]` | `requireAdmin()` ✅ | `z.object({ action: z.enum(["approve","reject"]) })` ✅ | entidad actualizada      | ✅ (#B1+#B2+#B3 cerrados en 1.10.6) |

### Findings cerrados

**✅ #B1 — body validation con Zod** (cerrado en 1.10.6). Antes: `as { action: string }`. Ahora: `safeParse` con enum estricto. Body roto / objeto vacío / acción desconocida → 400 con `details` de Zod.

**✅ #B2 — 404 para empresa inexistente** (cerrado en 1.10.6). Antes: P2025 caía en catch genérico → 500. Ahora: try/catch específico, `Prisma.PrismaClientKnownRequestError` con code `P2025` → 404 `"Empresa no encontrada"`.

**✅ #B3 — fallo del email a Sentry** (cerrado en 1.10.6). Antes: `console.error`. Ahora: `Sentry.captureException(err, { tags: { mail: "company_status" }, extra: { empresaId, newStatus } })`. El admin puede rastrear y reenviar manualmente.

### Notas

- El catch genérico del GET (`/api/admin/empresas`) silencia errores con `catch {}` sin loguear. Bajo tráfico, bajo impacto. NO se sumó Sentry por consistencia con el patrón general de catch genérico que ya tienen muchos handlers — si hacemos un sweep general lo cubrimos parejo.

## `users` (4 handlers, antes 5)

> Originalmente 5 handlers. `PATCH /api/users/role` eliminado en 1.10.7 — finding #C1.

| Método | Path                         | AuthZ                       | Zod                       | Output                                                | Estado |
| ------ | ---------------------------- | --------------------------- | ------------------------- | ----------------------------------------------------- | ------ |
| GET    | `/api/users/me`              | `requireAuth()` ✅          | N/A                       | `getUserWithProfile(auth.user.id)` (solo dueño)       | ✅     |
| POST   | `/api/users/registro`        | `requireAuth("STUDENT")` ✅ | `registrationSchema` ✅   | `{success:true}` o 409 RUT duplicado                  | ✅     |
| PUT    | `/api/users/profile/student` | `requireAuth("STUDENT")` ✅ | `studentProfileSchema` ✅ | propio profile (`updateStudentProfile(auth.user.id)`) | ✅     |
| PUT    | `/api/users/profile/company` | `requireAuth("COMPANY")` ✅ | `companyProfileSchema` ✅ | propio profile (`updateCompanyProfile(auth.user.id)`) | ✅     |

### Findings cerrados

**🛑 #C1 — `PATCH /api/users/role` era código muerto + superficie de role-escalation** (eliminado en 1.10.7).

- Síntoma: el endpoint permitía a cualquier user autenticado cambiar su `role: STUDENT ↔ COMPANY` con un cast `as { role: string }` (sin Zod).
- Mitigaciones existentes: cualquier role-switch a COMPANY entra con `companyStatus: PENDING` (default del schema). Gates en `internships.service.ts:17` y `matching.service.ts:67` filtran solo `APPROVED`. Riesgo real era bajo.
- Por qué se eliminó: **cero callers en el frontend** (única referencia: `promps/PROMP/modulo-10-company.md`, el prompt que lo creó). YAGNI + superficie de ataque innecesaria. Si mañana un dev suma una feature que confíe en `role` sin chequear `companyStatus`, abre agujero.
- Flow de empresas correcto: `/registro/empresa` con credentials → `companyStatus: PENDING` → aprobación admin.

### Notas

- Los 4 handlers restantes son ejemplo de patrón limpio: `requireAuth(role)` específico, Zod en el body, services llamados con `auth.user.id` (no body-controlled), respuestas que solo incluyen datos del owner.
- `POST /api/users/registro` usa `parse` (no `safeParse`) y captura `ZodError` en el catch. Es un patrón distinto al `safeParse` de admin pero igualmente correcto. NO bloquea — preferencia estilística que se puede unificar en un sweep futuro.

## `applications` (5 handlers)

| Método | Path                                | AuthZ                       | Zod                                                      | Output                                         | Estado                          |
| ------ | ----------------------------------- | --------------------------- | -------------------------------------------------------- | ---------------------------------------------- | ------------------------------- |
| POST   | `/api/applications`                 | `requireAuth("STUDENT")` ✅ | `applySchema` ✅                                         | application creada con `auth.user.id`          | ✅                              |
| GET    | `/api/applications/my`              | `requireAuth("STUDENT")` ✅ | N/A                                                      | solo `studentId === auth.user.id`              | ✅                              |
| GET    | `/api/applications/internship/[id]` | `requireAuth("COMPANY")` ✅ | N/A                                                      | service chequea ownership ✅                   | ✅                              |
| PATCH  | `/api/applications/[id]`            | `requireAuth("COMPANY")` ✅ | `updateStatusSchema` ✅                                  | application del owner (404 si no es del owner) | ✅ (#D1 cerrado en 1.10.8)      |
| POST   | `/api/applications/[id]/notify`     | `requireAuth("COMPANY")` ✅ | `z.object({ type: z.enum(["accepted","rejected"]) })` ✅ | `{success}` (404 si no es del owner)           | ✅ (#D2+#D3 cerrados en 1.10.8) |

### Findings cerrados

**🛑 #D1 — IDOR en `PATCH /api/applications/[id]`** (cerrado en 1.10.8). El service `updateApplicationStatus(applicationId, status)` no validaba que la application pertenezca a una internship de la company del session user. Cualquier `COMPANY` autenticada podía modificar postulaciones ajenas (rechazarlas, aceptarlas y notificar al student). **Severidad alta — OWASP Top 10 #1 Broken Access Control**. Fix: nueva firma `updateApplicationStatus(applicationId, status, companyUserId)` + helper privado `findOwnedApplication` que filtra por `internship.companyId`. Si no matchea → throw `"Not found or not authorized"` → 404.

**🛑 #D2 — IDOR en `POST /api/applications/[id]/notify`** (cerrado en 1.10.8). Mismo patrón: `notifyAcceptedApplication(applicationId)` y `notifyRejectedApplication(applicationId)` permitían disparar emails de aceptación/rechazo a students de prácticas ajenas (vector de phishing). Fix: ambas funciones reciben `companyUserId` y usan el mismo `findOwnedApplication` helper.

**✅ #D3 — body validation con Zod en `[id]/notify`** (cerrado en 1.10.8). Antes: cast `as { type }`. Ahora: `safeParse` con enum `["accepted", "rejected"]`.

**✅ #D4 — `sendNewApplicationEmail.catch(console.error)` a Sentry** (cerrado en 1.10.8). `Sentry.captureException(err, { tags: { mail: "new_application" }, extra: { internshipId, studentUserId } })`.

### Notas

- **Decisión 404 vs 403**: ownership check fallido devuelve 404 (no 403) para no leak la existencia del recurso. Consistente con el patrón ya usado en `getApplicantsByInternship`.
- **Helper `findOwnedApplication`** centraliza el control de acceso. Si más adelante aparece IDOR en otras áreas que dependen de ownership de applications, este helper se exporta y se reusa.
- **Frontend compatible** — los cambios son de firma interna del service; los handlers mantienen el mismo contrato HTTP.

## `internships` (6 handlers)

> Inventario inicial decía 3. Recuento real: 6 (`route.ts` GET+POST, `[id]/route.ts` GET+PUT+PATCH+DELETE).

| Método | Path                    | AuthZ                       | Zod                                               | Output                                                 | Estado                          |
| ------ | ----------------------- | --------------------------- | ------------------------------------------------- | ------------------------------------------------------ | ------------------------------- |
| GET    | `/api/internships`      | Público intencional         | `filterInternshipSchema` ✅                       | filtra `isActive: true` + `companyStatus: APPROVED` ✅ | ⚠️ #E5                          |
| POST   | `/api/internships`      | `requireAuth("COMPANY")` ✅ | `createInternshipSchema` ✅                       | gate de `companyStatus === "APPROVED"` ✅              | ✅ (#E4 cerrado en 1.10.9)      |
| GET    | `/api/internships/[id]` | Público intencional         | N/A                                               | filtra `isActive: true` + `companyStatus: APPROVED` ✅ | ✅ (#E1 cerrado en 1.10.9)      |
| PUT    | `/api/internships/[id]` | `requireAuth("COMPANY")` ✅ | `createInternshipSchema.partial()` (safeParse) ✅ | ownership check + 404 si no es del owner               | ✅ (#E3 cerrado en 1.10.9)      |
| PATCH  | `/api/internships/[id]` | `requireAuth("COMPANY")` ✅ | `z.object({ isActive: z.boolean() })` ✅          | ownership check + 404 si no es del owner               | ✅ (#E2+#E3 cerrados en 1.10.9) |
| DELETE | `/api/internships/[id]` | `requireAuth("COMPANY")` ✅ | N/A                                               | ownership check + soft delete (`isActive: false`)      | ✅ (#E3 cerrado en 1.10.9)      |

### Findings cerrados

**🛑 #E1 — `GET /api/internships/[id]` no filtraba `isActive` ni `companyStatus`** (cerrado en 1.10.9). Severidad media — info disclosure. El listado (`listInternships`) filtraba `isActive: true` + `company.companyStatus: "APPROVED"`, pero el detalle por ID era `findUnique` directo. Una práctica soft-deleted o de empresa PENDING/REJECTED seguía accesible vía URL bookmarkeada / link compartido / scraping previo, rompiendo la promesa de moderación. Fix: `findUnique` → `findFirst` con `where: { id, isActive: true, company: { is: { companyStatus: "APPROVED" } } }`.

**🛑 #E2 — `PATCH /api/internships/[id]` sin Zod** (cerrado en 1.10.9). Severidad baja-media — defensa en profundidad. Mismo patrón que cazamos en #B1 (admin) y #D3 (notify): cast `as { isActive: boolean }`. Fix: `patchSchema = z.object({ isActive: z.boolean() })` con `safeParse` → 400 con `details`.

**🛑 #E3 — Error mapping leak en `[id]/route.ts` (PUT/PATCH/DELETE)** (cerrado en 1.10.9). Severidad media — info disclosure. Los catch genéricos hacían `{ error: error.message }` con status 404, exponiendo mensajes crudos de Prisma (nombres de tabla, columnas, SQL state). Fix: helper `notFoundOrInternal` que matchea exactamente `"Not found or not authorized"` → 404, lo demás → `Sentry.captureException` + 500 genérico. Mismo patrón aplicado al POST de `route.ts`.

**🛑 #E4 — `POST /api/internships` no chequeaba `companyStatus === "APPROVED"`** (cerrado en 1.10.9). Severidad media — bypass parcial del flow de moderación + waste de recursos. El dashboard solo mostraba banner visual para PENDING/REJECTED (`page.tsx:251`); el backend no bloqueaba. Una empresa no aprobada podía crear N internships y consumir embeddings de HuggingFace ($$$). Fix: en `createInternship`, después del `findUnique`, `if (company.companyStatus !== "APPROVED") throw new Error("Company not approved")`. Handler mapea ese error a 403.

### Findings activos

**⚠️ #E5 — `GET /api/internships` sin rate limit** — Severidad baja, DoS leve. Endpoint público con `count + findMany + joins + paginación` y sin throttling propio. Vercel cubre algo a nivel infra. Aceptado como ⚠️ por consistencia con otros GET públicos del proyecto. Si querés cerrarlo: `rateLimit(\`internships-list:\${ip}\`, 60, MIN_MS)`.

### Notas

- **Bug funcional NO security**: `updateInternship` no regenera el embedding cuando cambian `title/description/skills` → matching desincronizado del contenido. Pendiente para sweep funcional, fuera del scope del audit de seguridad.
- **DELETE no cascadea applications**: intencional (preservar histórico para students). Las applications quedan visibles aunque la práctica esté soft-deleted.
- **Helper `notFoundOrInternal`** centraliza el patrón de error mapping seguro. Si aparece en otras áreas del audit, considerar extraer a `src/server/lib/`.

## `ats` (5 handlers)

| Método | Path                                | AuthZ                       | Zod                                                                          | Output                                                           | Estado                    |
| ------ | ----------------------------------- | --------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------- |
| POST   | `/api/ats/config`                   | `requireAuth("COMPANY")` ✅ | `discriminatedUnion("type", ...)` con schemas estrictos por scorer ✅        | ownership + 404 unificado, upsert atómico                        | ✅ (#F1+#F2+#F3 cerrados) |
| GET    | `/api/ats/config/[jobId]`           | `requireAuth("COMPANY")` ✅ | N/A                                                                          | ownership + 404 unificado                                        | ✅ (#F1+#F2 cerrados)     |
| PATCH  | `/api/ats/pipeline/[applicationId]` | `requireAuth("COMPANY")` ✅ | `z.object({ status: enum(["PENDING","REVIEWING","INTERVIEW","REJECTED"]) })` | ownership + 404 unificado                                        | ✅ (#F1+#F2 cerrados)     |
| POST   | `/api/ats/score/[applicationId]`    | `requireAuth("COMPANY")` ✅ | N/A                                                                          | rate limit `60/min/user`, ownership + 404 unificado              | ✅ (#F1+#F2+#F5 cerrados) |
| POST   | `/api/ats/score/job/[jobId]`        | `requireAuth("COMPANY")` ✅ | N/A                                                                          | rate limit `5/min/user`, batches de 5, ownership + 404 unificado | ✅ (#F1+#F2+#F4 cerrados) |

### Findings cerrados

**🛑 #F1 — Ownership fail diferenciaba 404 vs 403 (anti-enumeration)** (cerrado en 1.10.10). Severidad media — info disclosure / IDOR enumeration. 4 handlers (`config GET`, `pipeline PATCH`, `score POST`, `score job POST`) más el POST de config diferenciaban `404 "Postulación/Empresa no encontrada"` (cuando no existe) vs `403 "No autorizado"` (cuando existe pero no es del owner). Esa diferencia permite a una `COMPANY` autenticada **enumerar IDs válidos** de applications/internships ajenas con un loop. Fix: ambos casos devuelven `404 { error: "Recurso no encontrado", code: "NOT_FOUND" }`. Misma decisión que cerramos en #D1/#D2 (applications) — patrón "404 unificado en ownership fail" ahora es convención del audit.

**🛑 #F2 — Error mapping leak: errores crudos de Prisma/infra al cliente** (cerrado en 1.10.10). Severidad baja-media — info disclosure. Los 4 handlers no tenían `try/catch` envolvente; cualquier error inesperado (DEADLOCK, FK violation, OOM en pool, UNIQUE constraint, conexión refused) propagaba el `error.message` crudo al cliente. Fix universal: `try/catch` en cada handler, `Sentry.captureException(error)` en el catch, response genérico `{ error: "Error interno del servidor", code: "INTERNAL_ERROR" }` con 500. Patrón consistente con la "whitelist de mensajes propagables" establecida en internships (#E3).

**🛑 #F3 — `params: z.any()` en `POST /api/ats/config`** (cerrado en 1.10.10). Severidad baja — defensa en profundidad. El schema de módulos aceptaba `params: z.any()` y serializaba ese valor a la columna JSON `params` de `ATSModule`. Los scorers downstream (`skills.scorer`, `experience.scorer`, etc.) asumen formas concretas: `skills` espera `{ required: string[], preferred: string[], hardFilter: bool }`, `experience` espera `{ minYears: number, preferredRoles: string[], hardFilter: bool }`, etc. Sin validación, basura arbitraria llega a los scorers (riesgo: crashes silenciosos, scoring inválido, payload bloat). Fix: `discriminatedUnion("type", ...)` con un schema strict() por cada scorer real (`SKILLS`, `EXPERIENCE`, `EDUCATION`, `LANGUAGES`, `PORTFOLIO`) + `passthrough()` para `CUSTOM` que el scoring engine ignora. Plus: `array.max(20)` para módulos, `string.max(120)` para labels — caps razonables anti-bloat.

**🛑 #F4 — `score/job` con `Promise.all` crudo + sin rate limit** (cerrado en 1.10.10). Severidad media — DoS interno. El handler `POST /api/ats/score/job/[jobId]` rescoreaba **todas** las applications de una internship con `Promise.all(applications.map(...))` crudo: con N=200 applications, eso disparaba 200 ejecuciones simultáneas de `scoreApplication` (CPU: parsing CV + matching skills/exp/edu por módulo) más 200 `prisma.application.update` simultáneos contra Supabase pgBouncer. Una empresa con muchos postulantes podía saturar el connection pool y CPU del worker de Vercel — escalando a un DoS auto-infligido. Fix: `rateLimit("ats-score-job:${userId}", 5, MIN_MS)` antes de tocar DB + procesamiento en batches de 5 (`for (let i = 0; i < apps.length; i += 5) { await Promise.all(batch...) }`). Mantiene la semántica (todas se procesan, todas devueltas) pero acota el pico a 5 simultáneos.

**🛑 #F5 — `score/[applicationId]` sin rate limit** (cerrado en 1.10.10). Severidad media — DoS individual. El scoring de una application individual también es CPU (parse CV + N módulos). Sin throttle, una company autenticada podía dispararlo en loop contra una misma application (aunque no escala como #F4, sigue siendo abusable). Fix: `rateLimit("ats-score-one:${userId}", 60, MIN_MS)` antes de tocar DB. Límite generoso (60/min) para no estorbar uso legítimo del kanban.

### Notas

- **Convergencia con #D1/#D2/#E3**: el área `ats` adoptó las tres convenciones que emergieron de `applications` e `internships` en lotes anteriores: (1) 404 unificado en ownership fail (anti-enumeration), (2) error mapping seguro con whitelist de mensajes propagables + Sentry, (3) Zod estricto en cualquier body. El audit está convergiendo a un patrón único — buena señal.
- **Decisión rate limit por `auth.user.id`** (no por IP): los handlers de score son auth-only (`requireAuth("COMPANY")`), así que el identifier por user es más preciso que por IP (NAT corporativo no comparte límite entre empresas distintas).
- **`BATCH_SIZE = 5` en `score/job`**: trade-off CPU/latency. Subirlo (e.g. 10) acelera el batch pero acerca al límite del pool de pgBouncer. Bajarlo (e.g. 3) es más conservador pero aumenta latency en jobs grandes. 5 es un punto razonable; si en prod aparece presión en el pool, bajarlo en lugar de subirlo.
- **`#F3` cap de 20 módulos**: el seed/UI nunca crea más de ~7 (los 6 enum types + 1 CUSTOM). 20 es un cap defensivo amplio sin pegarle al uso real.
- **`scoreApplication` no es async** — el `await` de `Promise.all` en #F4 espera por los `prisma.application.update`, que sí es async. La función pura de scoring no agrega latency entre I/O.

## `chat` (6 handlers)

> Inventario inicial decía 4. Recuento real: 6 (`conversations/route.ts` GET+POST, `[conversationId]/route.ts` GET, `messages/route.ts` GET+POST, `read/route.ts` PATCH).

| Método | Path                                    | AuthZ                       | Zod                                 | Output                                                                   | Estado                        |
| ------ | --------------------------------------- | --------------------------- | ----------------------------------- | ------------------------------------------------------------------------ | ----------------------------- |
| POST   | `/api/chat/conversations`               | `requireAuth("COMPANY")` ✅ | `z.object({ applicationId })` ✅    | ownership + 404 unificado, INTERVIEW_REQUIRED → 403                      | ✅ (#G1+#G2+#G3 cerrados)     |
| GET    | `/api/chat/conversations`               | `requireAuth()` ✅          | N/A                                 | filtra por `auth.user.id` según role (COMPANY/STUDENT)                   | ✅ (#G1 cerrado)              |
| GET    | `/api/chat/conversations/[id]`          | `requireAuth()` ✅          | N/A                                 | ownership + 404 unificado                                                | ✅ (#G1+#G2+#G3 cerrados)     |
| GET    | `/api/chat/conversations/[id]/messages` | `requireAuth()` ✅          | N/A                                 | ownership + 404 unificado, side-effect: marca leídos                     | ✅ (#G1+#G2+#G3 cerrados)     |
| POST   | `/api/chat/conversations/[id]/messages` | `requireAuth()` ✅          | `z.object({ content: 1..4000 })` ✅ | rate limit `30/min/user`, ownership + 404, STUDENT_CANNOT_INITIATE → 403 | ✅ (#G1+#G2+#G3+#G4 cerrados) |
| PATCH  | `/api/chat/conversations/[id]/read`     | `requireAuth()` ✅          | N/A                                 | ownership + 404 unificado                                                | ✅ (#G1+#G2+#G3 cerrados)     |

### Findings cerrados

**🛑 #G1 — Error mapping leak universal en los 6 handlers** (cerrado en 1.10.11). Severidad baja-media — info disclosure. Patrón calcado de #E3/#F2: todos los catch hacían `{ error: err.message }` con status 500, propagando mensajes crudos de Prisma/infra (nombres de tabla, FK violations, conexión refused, etc.). Fix universal: `try/catch` envolvente, `Sentry.captureException(err, { tags: { route: "chat.X.METHOD" }, extra: { userId, conversationId } })` en el catch, response genérico `{ error: "Error interno", code: "INTERNAL_ERROR" }` con 500. Whitelist de mensajes propagables: solo los códigos conocidos del service.

**🛑 #G2 — Ownership fail diferenciaba 403 vs 404 (anti-enumeration)** (cerrado en 1.10.11). Severidad media — IDOR enumeration. Patrón #D1/#F1: handlers retornaban `404 "Conversation not found"` cuando no existía vs `403 "No autorizado"` cuando existía pero el caller no era parte de la conversación. Eso permite a un user autenticado **enumerar IDs válidos** de conversations ajenas. Fix: ambos casos (`code === "NOT_FOUND" || code === "FORBIDDEN"`) devuelven `404 { code: "NOT_FOUND" }` con mismo mensaje. Plus, dentro del service `getOrCreateConversation` se reordenó `existence → ownership → stage` (en lugar de `existence → stage → ownership`) para no leak `pipelineStatus` de apps ajenas: una app que NO es del caller devuelve `NOT_FOUND` regardless del stage. INTERVIEW_REQUIRED solo se lanza después de ownership confirmada — OK exponerlo como 403 con código específico.

**🛑 #G3 — String matching frágil para mapear errores → códigos consistentes** (cerrado en 1.10.11). Severidad baja — defensa en profundidad / mantenibilidad. Los handlers matcheaban con `message.includes("Not authorized")` / `message.includes("INTERVIEW stage")` para decidir status code. Si alguien refactoreaba el wording del throw, los handlers respondían 500 sin avisar. **Inconsistencia interna**: `sendMessage` ya usaba `err.code = "STUDENT_CANNOT_INITIATE"` (patrón limpio), el resto del service no. Fix: extendido el patrón `code` a TODOS los throws — agregada `ChatErrorCode` union (`NOT_FOUND | FORBIDDEN | INTERVIEW_REQUIRED | STUDENT_CANNOT_INITIATE`) y helper local `chatError(code, message)`. Handlers matchean por `err.code` (no por message). Tests del service migrados a `rejects.toMatchObject({ message, code })`.

**🛑 #G4 — `POST /api/chat/conversations/[id]/messages` sin rate limit** (cerrado en 1.10.11). Severidad media — spam / DoS de chat. Cada mensaje crea row + bumpea `updatedAt` de la conversación + dispara realtime broadcast a Supabase. Sin throttle, una company autenticada podía spamear miles de mensajes/minuto a un student (acoso, llenado de inbox, presión sobre Realtime). Fix: `rateLimit("chat-message:${userId}", 30, MIN_MS)` antes de tocar DB. 30 mensajes/min es generoso para uso legítimo (más que suficiente para una conversación humana) y corta el spam-flood.

### Findings activos

**⚠️ #G5 — `POST /api/chat/conversations` sin rate limit** — Severidad baja, costo bajo de abuso. Aceptado como ⚠️ porque cada llamada requiere (a) auth COMPANY, (b) application existente, (c) ownership match, (d) `pipelineStatus === "INTERVIEW"`. Solo crea una conversation idempotente (si existe, la retorna). Riesgo real: muy bajo. Si quisiéramos cerrarlo: `rateLimit("chat-create-conv:${userId}", 30, MIN_MS)`.

### Notas

- **Helper `chatError(code, message)`** en el service centraliza el patrón `Error & { code }` que ya usaba `interviews.service.ts` ad-hoc. Si aparece en más áreas del audit (probable), considerar extraer a `src/server/lib/errors.ts`.
- **Reorden en `getOrCreateConversation`** (existence → ownership → stage) es estructural — la lógica de negocio no cambia, pero la **secuencia de checks ahora respeta defense-in-depth**. Esto es algo a mirar en otros services del proyecto en próximos sweeps.
- **Decisión rate limit `30/min` en POST messages**: balance entre UX (tipear rápido en chat es legítimo) y anti-spam. Subirlo (e.g. 60) aumenta riesgo de spam con costo nulo en UX. Bajarlo (e.g. 15) puede frustrar usuarios legítimos en conversaciones intensas. 30/min = 1 mensaje cada 2s → muy razonable.
- **Por qué `INTERVIEW_REQUIRED` mantiene 403 y no se unifica a 404**: ese código solo se lanza DESPUÉS de ownership confirmada (caller ES owner de la application), entonces no hay enumeration risk. Devolver 404 ahí confundiría al frontend legítimo. 403 con código `PIPELINE_STATUS_REQUIRED` es correcto.
- **Convergencia confirmada**: el área `chat` cierra los mismos 4 patrones que ya emergieron en lotes previos (#G1 = #E3/#F2, #G2 = #D1/#F1, #G3 nuevo, #G4 = #F4/#F5). El `error.code` pattern (#G3) extiende el helper que ya usábamos puntualmente en interviews/chat → ahora consistente en todo chat.

## `interviews` (7 handlers)

> Inventario inicial decía 4. Recuento real: 7 (`route.ts` GET+POST, `[id]/route.ts` GET+PATCH+DELETE, `send-to-chat/route.ts` POST, `available-candidates/[jobId]/route.ts` GET). Mismo patrón de subcuenta detectado en `internships`, `chat` y `ats`.

| Método | Path                                           | AuthZ                       | Zod                         | Output                                                                  | Estado                        |
| ------ | ---------------------------------------------- | --------------------------- | --------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| POST   | `/api/interviews`                              | `requireAuth("COMPANY")` ✅ | `createSchema` ✅           | ownership + 404 unificado, APPLICATION_MISMATCH→400, ALREADY_EXISTS→409 | ✅ (#H1+#H2+#H3 cerrados)     |
| GET    | `/api/interviews`                              | `requireAuth("COMPANY")` ✅ | N/A (query string opcional) | filtra por `companyId === auth.user.id`                                 | ✅ (#H1 cerrado)              |
| GET    | `/api/interviews/[interviewId]`                | `requireAuth("COMPANY")` ✅ | N/A                         | ownership + 404 unificado                                               | ✅ (#H1+#H2+#H3 cerrados)     |
| PATCH  | `/api/interviews/[interviewId]`                | `requireAuth("COMPANY")` ✅ | `updateSchema` ✅           | ownership + 404 unificado, ALREADY_EXISTS→409, NO_CONVERSATION→400      | ✅ (#H1+#H2+#H3 cerrados)     |
| DELETE | `/api/interviews/[interviewId]`                | `requireAuth("COMPANY")` ✅ | N/A                         | ownership + 404 unificado                                               | ✅ (#H1+#H2+#H3 cerrados)     |
| POST   | `/api/interviews/[interviewId]/send-to-chat`   | `requireAuth("COMPANY")` ✅ | N/A                         | rate limit `10/min/user`, ownership + 404 unificado                     | ✅ (#H1+#H2+#H3+#H4 cerrados) |
| GET    | `/api/interviews/available-candidates/[jobId]` | `requireAuth("COMPANY")` ✅ | N/A                         | ownership + 404 unificado                                               | ✅ (#H1+#H2+#H3 cerrados)     |

### Findings cerrados

**🛑 #H1 — Error mapping leak universal en los 7 handlers** (cerrado en 1.10.13). Severidad baja-media — info disclosure. Patrón #E3/#F2/#G1: todos los catch hacían `{ error: err.message }` con status 500, propagando mensajes crudos de Prisma/infra. Fix universal: `try/catch` + `Sentry.captureException(err, { tags: { route: "interviews.X.METHOD" }, extra: { userId, interviewId/jobId } })`, response `{ error: "Error interno", code: "INTERNAL_ERROR" }` con 500. Whitelist de mensajes propagables: solo los códigos conocidos del service.

**🛑 #H2 — Ownership fail diferenciaba 403 vs 404 (anti-enumeration)** (cerrado en 1.10.13). Severidad media — IDOR enumeration. Patrón #D1/#F1/#G2: 5 handlers (`GET/PATCH/DELETE` de `[id]`, `send-to-chat`, `available-candidates`) retornaban `404 "no encontrada"` cuando no existía vs `403 "No autorizado"` cuando existía pero no era de la company. Permitía enumerar IDs válidos de interviews ajenas. Fix: dentro del **service** se cambió el throw de FORBIDDEN → NOT_FOUND con el mismo message ("Interview not found", "Application not found", "Internship not found", "New application not found"). Anti-enumeration profunda — no solo el handler, también el service oculta la existencia del recurso. El handler solo matchea por `code === "NOT_FOUND"` → 404 con mensaje genérico.

**🛑 #H3 — String matching frágil para mapear errores → códigos consistentes** (cerrado en 1.10.13). Severidad baja — defensa en profundidad / mantenibilidad. Patrón #G3: handlers matcheaban con `message.includes("Not authorized")` / `message.includes("not found")` — frágil ante refactor. **Inconsistencia interna**: el service ya usaba `err.code = "INTERVIEW_ALREADY_EXISTS"` puntualmente (en `createInterview` y `updateInterview`), pero el resto seguía con string matching. Fix: añadida `InterviewErrorCode` union (`NOT_FOUND | FORBIDDEN | INTERVIEW_ALREADY_EXISTS | APPLICATION_MISMATCH | NEW_CANDIDATE_NO_CONVERSATION`) + helper `interviewError(code, message)`. Migrados los 14 throws sin code al patrón. Handlers matchean por `err.code` exclusivamente. Tests del service migrados a `rejects.toMatchObject({ message, code })`.

**🛑 #H4 — `POST /api/interviews/[id]/send-to-chat` sin rate limit** (cerrado en 1.10.13). Severidad media — spam/notification flood. El handler dispara una transacción de 3 ops Prisma (`message.create` + `interview.update` + `conversation.update`) más broadcast realtime al student via Supabase. Sin throttle, una company autenticada podía spamear notifications de "Entrevista agendada/actualizada" al chat del student (acoso, presión sobre Realtime, churn de mensajes). Fix: `rateLimit("interview-send-to-chat:${userId}", 10, MIN_MS)` antes de tocar DB. 10/min es generoso para uso legítimo (re-enviar tras editar fecha) y corta el flood.

### Findings activos

**⚠️ #H5 — `meetingLink` sin validación URL** — Severidad baja, riesgo aceptado. El schema acepta `z.string().optional()` para `meetingLink`. Idealmente sería `z.string().url()`, pero el flow legítimo necesita texto libre: empresas pueden poner "TBD", "Zoom dial-in: +56...", "Link por confirmar", etc. Las companies son trusted (aprobadas por admin) y el campo se renderiza en el chat como texto plano (no `<a href>`), así que un `javascript:alert(1)` no se ejecuta. Riesgo residual: bajo. Si quisiéramos cerrarlo: `z.union([z.string().url(), z.literal(""), z.string().regex(/^TBD/i)])` o simplemente `z.string().refine(v => !v.startsWith("javascript:"))`.

### Notas

- **Anti-enumeration profunda en #H2**: a diferencia de áreas previas donde el "404 unification" se hacía solo en el handler (mapeando FORBIDDEN→404), acá el cambio se aplicó **en el service**: cuando el caller no es owner, el throw mismo es `NOT_FOUND` con un mensaje genérico ("Interview not found"). Razón: el service también es consumido por otros lugares (futuros tests, jobs, scripts). Que el service por sí solo no exponga la diferencia es una mejor garantía.
- **Helper `interviewError`** sigue el mismo shape que `chatError` (área `chat`, 1.10.11). Patrón consolidado en 2 áreas — candidato a extraer a `src/server/lib/errors.ts` con la próxima área que lo use (probablemente `notifications`).
- **Decisión rate limit `10/min` en send-to-chat**: balance UX/anti-spam. Una company legítima puede mandar al chat 1× al agendar y reenviar 1-2× al editar (fecha cambia, link cambia). 10/min es ~4× el uso legítimo máximo en pico — frena spam sin estorbar.
- **`APPLICATION_MISMATCH` mantiene 400 (no 404)**: este código solo se lanza después de ownership confirmada (la app ES del caller pero el internshipId del payload no matchea). No hay enumeration risk acá, es un error de payload del cliente. 400 con código específico ayuda al frontend a mostrar mensaje útil.
- **`NEW_CANDIDATE_NO_CONVERSATION` mantiene 400 (no 404)**: idem APPLICATION_MISMATCH — sale después de ownership confirmada del nuevo candidato. Es un guard de UX (forzar al usuario a iniciar el chat antes de reasignar la entrevista). 400 con mensaje específico es correcto.
- **Convergencia confirmada**: el área `interviews` cierra los mismos 4 patrones que ya emergieron en lotes previos (#H1=#G1, #H2=#G2, #H3=#G3, #H4=#G4). El audit ya ha alcanzado régimen estacionario — los próximos lotes (`notifications`, `matching`, `perfil`, `health`) deberían ejecutarse rápido siguiendo el mismo runbook.
- **Compatibilidad con frontend**: cero cambios de contrato en happy path. Cambios visibles: 404 en lugar de 403 cuando un user toca interviews ajenas (deseado), error genérico en lugar de mensaje crudo en 500 (deseado), 429 en `send-to-chat` con header `Retry-After` cuando se excede 10/min.

## `notifications` (3 handlers)

> Inventario inicial: 3. Recuento real: 3 ✅ (primer área donde el conteo coincide). Particularidad: **NO hay service layer** — los handlers acceden directo a Prisma. Funcional pero rompe Clean Architecture, anotado como ⚠️ #I3.

| Método | Path                          | AuthZ              | Zod | Output                                                                                 | Estado                |
| ------ | ----------------------------- | ------------------ | --- | -------------------------------------------------------------------------------------- | --------------------- |
| GET    | `/api/notifications`          | `requireAuth()` ✅ | N/A | filtra por `userId === auth.user.id`, take 20 hardcoded                                | ✅ (#I1 cerrado)      |
| DELETE | `/api/notifications/[id]`     | `requireAuth()` ✅ | N/A | `deleteMany` con filtro `id + userId` → count=0 retorna 404 (anti-enumeration natural) | ✅ (#I1 cerrado)      |
| PATCH  | `/api/notifications/read-all` | `requireAuth()` ✅ | N/A | rate limit `10/min/user`, `updateMany` filtrado por `userId + read=false`              | ✅ (#I1+#I2 cerrados) |

### Findings cerrados

**🛑 #I1 — Sin try/catch + Sentry en los 3 handlers** (cerrado en 1.10.14). Severidad baja-media — info disclosure. Patrón #G1/#H1: cualquier error de Prisma (FK violation, conexión refused, deadlock, etc.) propagaba al runtime de Next.js que retornaba 500 con stack trace en dev / mensaje crudo en prod. Fix universal: `try/catch` envolvente, `Sentry.captureException(err, { tags: { route: "notifications.X.METHOD" }, extra: { userId, ...notificationId? } })` en el catch, response genérico `{ error: "Error interno", code: "INTERNAL_ERROR" }` con 500.

**🛑 #I2 — `PATCH /api/notifications/read-all` sin rate limit** (cerrado en 1.10.14). Severidad baja-media — DoS interno. El handler dispara `updateMany` sobre **todas** las notificaciones no leídas del user en una sola query. Para un user con miles de notificaciones (caso poco común pero posible si nunca se limpian), cada llamada toca cientos/miles de rows. Sin throttle, hot-loop al endpoint puede presionar la DB. Fix: `rateLimit("notifications-read-all:${userId}", 10, MIN_MS)` antes de tocar DB. 10/min es generoso para uso legítimo (apretar "Marcar todo como leído" 1× por sesión) y corta el hot-loop.

### Findings activos

**⚠️ #I3 — Sin service layer (handlers acceden directo a Prisma)** — Severidad: 0 (no security). Los 3 handlers de `notifications/` tienen lógica trivial (3 ops Prisma simples) y la implementan directo en `route.ts`. Esto rompe la convención de Clean Architecture establecida en `CLAUDE.md` (`server/services/` con lógica de negocio pura). NO es un issue de seguridad — solo de arquitectura/mantenibilidad. Si la lógica crece (filters por tipo, marking individual, cleanup automático, observer pattern del refactor-plan Fase 5), conviene crear `src/server/services/notifications.service.ts` y migrar. Por ahora, aceptado como ⚠️ — Boy-Scout para sweep futuro.

### Notas

- **Anti-enumeration natural en DELETE**: el handler usa `deleteMany` con WHERE `{ id, userId }` en una sola query, en lugar de `findUnique` + ownership check. Si `id` no existe O no es del user, `count` retorna 0 → 404. **No es necesario el patrón "404 unification" del service en otras áreas** porque el path único nunca diferencia "no existe" de "ajena". Es un patrón emergente más limpio para casos donde la lógica es trivial — cero superficie para ownership leaks.
- **GET sin paginación**: el handler tiene `take: 20` hardcoded — bug de UX (un user nunca puede ver más de 20 notificaciones). NO es security. Anotado para sweep funcional posterior.
- **`requireAuth()` sin role específico**: correcto. Las notificaciones son cross-role (tanto STUDENT como COMPANY las reciben). El filtro por `userId` ya garantiza que cada user solo vea las suyas.
- **No hay rate limit en GET ni DELETE**: GET es read-only y barato (single index lookup `userId + ORDER BY createdAt + LIMIT 20`). DELETE toca 1 row. No requieren throttle. Solo `read-all` (updateMany sobre N rows) lo necesitaba.
- **Decisión rate limit `10/min` en read-all**: el botón "marcar todo como leído" es un click humano — 10/min cubre uso legítimo extremo (alguien apretando rápido por error o por inquietud). Bajarlo a 5 podría frustrar al usuario.
- **Convergencia parcial**: el área cierra solo 2 patrones (#I1=#G1, #I2=#G4-light). NO aplican #G2 (anti-enumeration ya está nativa por `deleteMany`+filtro) ni #G3 (no hay service con throws). Área **más simple del audit** — confirmación de que el régimen estacionario depende del shape del área.

## `matching` (2 handlers) — pendiente

## `perfil` (2 handlers) — pendiente

## `health` (1 handler) — pendiente

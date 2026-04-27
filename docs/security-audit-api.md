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

| Área            | Handlers | Estado                                                           |
| --------------- | -------- | ---------------------------------------------------------------- |
| `auth`          | 6        | ✅ cerrada (#A2 fixeado en 1.10.5, #A1 ⚠️ aceptado)              |
| `admin`         | 2        | ✅ cerrada (#B1, #B2, #B3 fixeados en 1.10.6)                    |
| `users`         | 4\*      | ✅ cerrada (#C1 eliminado en 1.10.7)                             |
| `applications`  | 5        | ✅ cerrada (#D1+#D2+#D3+#D4 fixeados en 1.10.8)                  |
| `internships`   | 6        | ✅ cerrada (#E1+#E2+#E3+#E4 fixeados en 1.10.9, #E5 ⚠️ aceptado) |
| `ats`           | 5        | ✅ cerrada (#F1+#F2+#F3+#F4+#F5 fixeados en 1.10.10)             |
| `chat`          | 4        | ⏳ pendiente                                                     |
| `interviews`    | 4        | ⏳ pendiente                                                     |
| `notifications` | 3        | ⏳ pendiente                                                     |
| `matching`      | 2        | ⏳ pendiente                                                     |
| `perfil`        | 2        | ⏳ pendiente                                                     |
| `health`        | 1        | ⏳ pendiente                                                     |

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

## `chat` (4 handlers) — pendiente

## `interviews` (4 handlers) — pendiente

## `notifications` (3 handlers) — pendiente

## `matching` (2 handlers) — pendiente

## `perfil` (2 handlers) — pendiente

## `health` (1 handler) — pendiente

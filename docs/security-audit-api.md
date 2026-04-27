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

| Área            | Handlers | Estado                                              |
| --------------- | -------- | --------------------------------------------------- |
| `auth`          | 6        | ✅ cerrada (#A2 fixeado en 1.10.5, #A1 ⚠️ aceptado) |
| `admin`         | 2        | ✅ cerrada (#B1, #B2, #B3 fixeados en 1.10.6)       |
| `users`         | 5        | ⏳ pendiente                                        |
| `applications`  | 5        | ⏳ pendiente                                        |
| `internships`   | 3        | ⏳ pendiente                                        |
| `ats`           | 5        | ⏳ pendiente                                        |
| `chat`          | 4        | ⏳ pendiente                                        |
| `interviews`    | 4        | ⏳ pendiente                                        |
| `notifications` | 3        | ⏳ pendiente                                        |
| `matching`      | 2        | ⏳ pendiente                                        |
| `perfil`        | 2        | ⏳ pendiente                                        |
| `health`        | 1        | ⏳ pendiente                                        |

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

## `users` (5 handlers) — pendiente

## `applications` (5 handlers) — pendiente

## `internships` (3 handlers) — pendiente

## `ats` (5 handlers) — pendiente

## `chat` (4 handlers) — pendiente

## `interviews` (4 handlers) — pendiente

## `notifications` (3 handlers) — pendiente

## `matching` (2 handlers) — pendiente

## `perfil` (2 handlers) — pendiente

## `health` (1 handler) — pendiente

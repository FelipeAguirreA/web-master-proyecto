# Plan de cumplimiento Ley 21.719 — PractiX

> Generado tras audit de cumplimiento legal en 2026-05-07.
> Vigencia de la ley: **1 de diciembre de 2026**.
> Regla rectora: implementación técnica + asesoría legal independiente para texto formal y DPAs.

---

## Contexto regulatorio

- **Ley 21.719** reemplaza a la Ley 19.628 sobre protección de la vida privada.
- **Publicada**: 13 de diciembre de 2024 (Diario Oficial).
- **Vigencia**: 1 de diciembre de 2026 (24 meses de transición).
- **Alcance**: cualquier organización pública o privada que trate datos personales de residentes en Chile, sin importar su tamaño.
- **Sanciones**: leves hasta 5.000 UTM, graves hasta 10.000 UTM, gravísimas hasta **20.000 UTM** (~$1.400M CLP). Reincidencia: hasta **4% de los ingresos anuales por ventas y servicios en Chile**.
- **Autoridad**: Agencia de Protección de Datos Personales (APDP). Fiscaliza, dicta instrucciones y sanciona.
- **Notificación de breach**: a la APDP y a los afectados sin dilación indebida y, cuando sea posible, a más tardar **72 horas** después de tener constancia.

### Obligaciones principales para PractiX

| Obligación                                   | Aplica acá                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| Designación de DPO (si manejo significativo) | Por evaluar — depende de volumen y sensibilidad efectivos                |
| Registro de actividades de tratamiento       | Sí — documento formal según formato APDP                                 |
| Evaluaciones de impacto (DPIA)               | Sí — el matching con embeddings y el ATS pueden caer en "alto riesgo"    |
| Notificación de incidentes en 72h            | Sí — siempre                                                             |
| Medidas técnicas y organizativas             | Sí — esta es nuestra fase principal de trabajo                           |
| Derechos del titular (ARCO+)                 | Sí — endpoints + UI                                                      |
| Bases legales de tratamiento                 | Sí — consentimiento + ejecución contrato + interés legítimo en seguridad |

---

## Auditoría inicial (2026-05-07)

### Lo que YA estaba resuelto antes de F-Legal

| Área                       | Detalle                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Cookies auth               | `__Host-`/`__Secure-` prefix + `httpOnly` + `Secure` + `SameSite=Lax`                                      |
| JWT rotativo               | 15 min sesión + 7 días refresh con rotación + detección de reuse                                           |
| CSP estricta               | `nonce-per-request` + `strict-dynamic` (Fase 3 P1.1 del refactor)                                          |
| Headers de seguridad       | HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, COOP, X-Permitted-Cross-Domain-Policies |
| Rate limiting              | Distribuido vía Upstash en endpoints sensibles                                                             |
| Audit logging              | Pino estructurado con `requestId`, `route`, `userId`                                                       |
| Hash de email para alertas | `reportFailedLogin` envía solo `email_hash` truncado a Sentry                                              |
| OWASP Top 10               | Audit completo (12 áreas, 31 findings 🛑 cerrados, 14 ⚠️ documentados)                                     |

### Gaps detectados (14 críticos)

| #   | Gap                                                                                      | Severidad  | Fase atacante       |
| --- | ---------------------------------------------------------------------------------------- | ---------- | ------------------- |
| 1   | `sendDefaultPii: true` en los 4 configs Sentry                                           | 🔴 CRÍTICO | F-Legal-1.1 ✅      |
| 2   | Footer links `href="#"` (Privacidad/Términos/Contacto vacíos)                            | 🔴 CRÍTICO | F-Legal-1.2 ✅      |
| 3   | Sin página `/privacidad` ni `/terminos`                                                  | 🔴 CRÍTICO | F-Legal-1.2 ✅      |
| 4   | Sin DPA / SCC con procesadores externos (HF, Sentry, Supabase, Vercel, Brevo, Google)    | 🔴 CRÍTICO | F-Legal-4 (externo) |
| 5   | Sin endpoint export data (derecho de portabilidad)                                       | 🟠 ALTO    | F-Legal-2.2         |
| 6   | Sin endpoint delete account (derecho al olvido)                                          | 🟠 ALTO    | F-Legal-2.3         |
| 7   | Sin checkbox de consentimiento en registro estudiante NI empresa                         | 🟠 ALTO    | F-Legal-1.3 ✅      |
| 8   | Sin banner de cookies / consentimiento previo a tracking                                 | 🟠 ALTO    | F-Legal-1.4 ✅      |
| 9   | Sin validación de mayoría de edad en registro                                            | 🟠 ALTO    | F-Legal-3.3         |
| 10  | Sin runbook de "incidente — data breach" (los 3 existentes cubren auth/db/HF, no breach) | 🟡 MEDIO   | F-Legal-3.1         |
| 11  | Sin política de retención documentada ni purga automática                                | 🟡 MEDIO   | F-Legal-3.2         |
| 12  | Vercel Analytics + Speed Insights cargaban sin consent previo                            | 🟡 MEDIO   | F-Legal-1.4 ✅      |
| 13  | Archivo CV en Supabase Storage no se elimina al borrar CV (deja blob residual)           | 🟡 MEDIO   | F-Legal-2.3         |
| 14  | Sin audit log forense de accesos a datos personales                                      | 🟡 MEDIO   | F-Legal-3.4         |

### Inventario de datos personales (schema Prisma)

**SENSIBLES** (requieren máxima protección):

- `User.email`, `User.rut`, `User.phone`, `User.passwordHash`
- `StudentProfile.cvUrl`, `cvText`, `cvParsed`, `embedding`, `university`, `career`, `semester`, `skills`
- `CompanyProfile.empresaRut`

**Identificadores internos** (no PII directa):

- `User.id`, `*.userId` (UUIDs cuid)

**Datos derivados de uso**:

- `Application.matchScore`, `atsScore`, `moduleScores`
- `Message.content`, `Conversation`, `Interview.notes`

### Procesadores externos (transferencia internacional)

| Proveedor    | Ubicación  | Datos enviados                   | Estado DPA   |
| ------------ | ---------- | -------------------------------- | ------------ |
| Supabase     | 🇺🇸 USA     | DB completa + archivos CV        | ❌ pendiente |
| Vercel       | 🇺🇸 USA     | Hosting + métricas (con consent) | ❌ pendiente |
| HuggingFace  | 🇺🇸 USA     | Texto del CV para embeddings     | ❌ pendiente |
| Brevo        | 🇫🇷 Francia | Emails transaccionales           | ❌ pendiente |
| Sentry       | 🇺🇸 USA     | Errores + traces (PII off)       | ❌ pendiente |
| Google OAuth | 🇺🇸 USA     | Email + nombre del estudiante    | ❌ pendiente |

---

## Orden de ejecución (acordado)

0. **F-Legal-1**: Quick wins críticos (1 sesión) — ✅ CERRADA
1. **F-Legal-2**: Derechos ARCO+ + persistencia de consent (1-2 sesiones)
2. **F-Legal-3**: Operacional (1 sesión)
3. **F-Legal-4**: Legal puro — externalizado a abogado especializado

Cada fase termina con commit conventional + bump semver + entry en CHANGELOG + suite verde.

---

## FASE 1 — Quick wins ✅ CERRADA (2026-05-07)

| Sub | Commit    | Bump   | Resultado                                                                                                                                                                                                                                                                                                                               |
| --- | --------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | `d75404d` | 1.11.1 | `sendDefaultPii: false` en los 4 configs Sentry + `beforeSend` sanitizer (`src/lib/sentry-sanitize.ts`) que strippa `user.email/username/ip_address`, redacta headers `cookie/authorization/x-api-key`, redacta query strings con tokens. Session Replay desactivado. 16 tests del sanitizer.                                           |
| 1.2 | `45a024b` | 1.11.2 | Páginas `/privacidad` (13 secciones) y `/terminos` (11 secciones) con disclaimer "borrador en revisión legal" + fecha de última actualización. 9 footer links `href="#"` arreglados en home + login + registro.                                                                                                                         |
| 1.3 | `e42d17f` | 1.11.3 | Checkbox required "Acepto Política y Términos" en registro estudiante + empresa. Validación client-side bloquea submit. Links `target="_blank"` para no perder state del form.                                                                                                                                                          |
| 1.4 | `0034083` | 1.11.4 | `<CookieConsent />` banner con 3 acciones (Aceptar todas / Solo esenciales / Personalizar). `<AnalyticsGate />` monta Vercel Analytics + Speed Insights solo si `consent.analytics === true`. Hook `useConsent` con `useSyncExternalStore` (React 18+ pattern correcto, evita anti-pattern setState-en-useEffect). 11 tests del helper. |

**Cierre**: 4 commits, suite 1117 → 1128 tests verde, TSC clean, push exitoso, deploy verificado.

**Lecciones**:

- `prisma.config.ts` resuelve `DIRECT_URL ?? DATABASE_URL` — aplicar `db:push` con `.env.local` apuntando a Supabase prod toca prod aunque pienses que va a Docker. (Ya cerrado en 1.10.37 con migrations versionadas.)
- React 19 enforcement de `react-hooks/set-state-in-effect`: lecturas iniciales de external storage requieren `useSyncExternalStore` con snapshot estable (string raw del localStorage), no `useState + useEffect`.
- Disclaimer "borrador en revisión legal" en las páginas legales > texto pulido sin revisión. Honestidad sobre el estado del documento.

---

## FASE 2 — Derechos ARCO+ (próxima)

### Objetivo

Cubrir los gaps #5, #6, #13 + persistencia formal del consent (gap implícito de F-Legal-1: hoy el consent vive solo en localStorage del browser).

### Sub-tasks

#### F-Legal-2.1 — Persistir consent en DB

- Migration Prisma: agregar a `User`:
  - `consentAcceptedAt: DateTime?`
  - `consentVersion: String?`
- Endpoints de registro guardan `acceptedAt = now()` + `version = CONSENT_VERSION` cuando el user submitea con checkbox marcado.
- Tests + suite verde.
- **Por qué**: hoy si la APDP pregunta "demuéstrenme que el user X aceptó la política versión Y en fecha Z", tenemos cero evidencia persistida. localStorage del browser no cuenta.

#### F-Legal-2.2 — Endpoint export data (derecho de portabilidad)

- `GET /api/users/me/export-data` con rate limit estricto (1 por hora por user).
- Retorna ZIP estructurado:
  - `user.json` con datos básicos del User
  - `student-profile.json` o `company-profile.json` según role
  - `applications.json` con history completo
  - `conversations/` con cada chat en JSON
  - `interviews.json`
  - `notifications.json`
  - `cv.pdf` o `cv.docx` (download desde Supabase Storage si existe)
  - `README.md` que explica qué hay en cada archivo
- Tests del endpoint + happy path E2E.

#### F-Legal-2.3 — Endpoint delete account (derecho al olvido)

- `DELETE /api/users/me` con confirmación (header `X-Confirm-Delete: yes` o body con confirm).
- Acciones:
  - Eliminar `User` (Prisma cascade ya configurado: borra StudentProfile/CompanyProfile, Applications, Conversations, Messages, Interviews, Notifications, RefreshTokens).
  - Eliminar archivo CV en Supabase Storage (no solo el campo) — gap #13.
  - Invalidar sesión (revocar refresh token actual + clear cookies).
  - Mantener mínimo registro de auditoría legal: `id` hasheado + `deletedAt` (sin email ni datos personales) por X meses.
- Tests del endpoint.

#### F-Legal-2.4 — UI "Mis derechos" en perfil

- Página `/perfil/derechos` o sección en `/perfil`.
- Botones "Descargar mis datos" y "Eliminar mi cuenta" con modal de confirmación + advertencia ("Esta acción es irreversible").
- Link a la política de privacidad y al contacto de DPO.

### Estado

- [x] F-Legal-2.1 (consent persistence) — commit `7cab169`, bump 1.11.6
- [x] F-Legal-2.2 (export data) — commit `c823659`, bump 1.11.7
- [x] F-Legal-2.3 (delete account) — commit `4307888`, bump 1.11.8
- [x] F-Legal-2.4 (UI mis derechos) — bump 1.11.9

**F-Legal-2 cerrada completa** (2026-05-07).

---

## FASE 3 — Operacional (futuro)

### F-Legal-3.1 — Runbook breach response

- `docs/runbooks/incident-data-breach.md` análogo a los 3 runbooks existentes (auth/db/HF).
- Pasos para cumplir notificación 72h:
  - Detección y triage (cómo se confirma un breach)
  - Comunicación interna (escalar a equipo legal/admin)
  - Reporte a la APDP (formato + canal)
  - Comunicación a afectados (mail template + criterios)
  - Documentación post-mortem
- Lista de contactos clave (APDP, abogado, hosting providers, hosting sec teams).

### F-Legal-3.2 — Retention policy + cron de purga

- `docs/data-retention-policy.md` con plazos por tipo de dato.
- Decisión: cuentas inactivas tras X meses (¿24?) → notificación email → purga si no responde.
- Cron job (Vercel Cron) que corre diariamente y aplica las reglas.

### F-Legal-3.3 — Validación edad mínima

- Campo `birthDate: DateTime?` en `User` o checkbox "tengo +18 años o autorización de tutor".
- Validación en form de registro estudiante.
- Schema Zod backend valida.

### F-Legal-3.4 — Audit log forense

- Tabla `AuditLog` con (`id`, `userId`, `action`, `target`, `timestamp`, `requestId`).
- Middleware o decorator que logea mutaciones sensibles (creación/edición/borrado de PII).
- Export desde panel admin con filtros por user/fecha/acción.

---

## FASE 4 — Legal puro (externalizado a abogado)

**No es código.** Trabajo paralelo con asesoría legal especializada.

| Item                                                         | Quién                                     | Cuándo                   |
| ------------------------------------------------------------ | ----------------------------------------- | ------------------------ |
| Texto legal final de `/privacidad` y `/terminos` revisado    | Abogado                                   | Antes de 2026-12-01      |
| DPA con Supabase                                             | Abogado + Supabase                        | Antes de 2026-12-01      |
| DPA con Vercel                                               | Abogado + Vercel                          | Antes de 2026-12-01      |
| DPA con HuggingFace                                          | Abogado + HF                              | Antes de 2026-12-01      |
| DPA con Brevo                                                | Abogado + Brevo                           | Antes de 2026-12-01      |
| DPA con Sentry                                               | Abogado + Sentry                          | Antes de 2026-12-01      |
| Standard Contractual Clauses si aplica                       | Abogado                                   | Antes de 2026-12-01      |
| Designación de DPO o evaluación de no-aplicabilidad          | Abogado                                   | Antes de 2026-12-01      |
| Registro formal de actividades de tratamiento (formato APDP) | Abogado + equipo técnico (data desde acá) | Antes de 2026-12-01      |
| Inscripción ante APDP si requerida                           | Abogado                                   | Cuando APDP defina canal |

---

## NFRs / criterios de cierre del compliance

- ✅ Headers de seguridad estrictos (Fase 3 OWASP — ya cumple).
- ✅ Cookies auth con HttpOnly + Secure + SameSite (ya cumple).
- ✅ Sentry sin PII (cumple desde 1.11.1).
- ✅ Páginas legales accesibles (cumple desde 1.11.2).
- ✅ Consentimiento previo expreso (cumple desde 1.11.3 + 1.11.4).
- 🔲 Derechos ARCO+ implementados (F-Legal-2).
- 🔲 Política de retención + purga automática (F-Legal-3).
- 🔲 Runbook breach 72h (F-Legal-3).
- 🔲 Validación edad (F-Legal-3).
- 🔲 DPAs firmados (F-Legal-4 — externo).
- 🔲 Texto legal validado por abogado (F-Legal-4 — externo).
- 🔲 (Si aplica) DPO designado (F-Legal-4 — externo).

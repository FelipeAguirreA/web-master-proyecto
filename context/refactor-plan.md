# Plan de refactor PractiX

> Generado tras auditoría del repo en 2026-04-23.
> Orden definitivo acordado con el equipo.
> Regla rectora: **Boy Scout Rule + una fase por PR + tests antes de tocar**.

---

## Auditoría de estado actual

### Lo que YA está bien resuelto

| Área               | Estado                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Clean Architecture | Capas bien separadas: `server/services` puro, `server/lib` infra, `app/api` delivery                              |
| Env validation     | `src/lib/env.ts` con Zod, falla al arrancar si falta algo                                                         |
| Sentry             | Instalado + `instrumentation.ts` + `global-error.tsx` + sourcemaps en build                                       |
| Security headers   | `next.config.ts` con HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP base |
| Husky              | pre-commit (lint-staged) + commit-msg (commitlint conventional)                                                   |
| CI/CD              | GitHub Actions: lint, type-check, test, build, `pnpm audit --audit-level=high`                                    |
| Dependabot         | Configurado                                                                                                       |
| Tests instalados   | Vitest + Testing Library + Playwright, coverage thresholds definidos                                              |
| Auth               | NextAuth (Google OAuth + Credentials con bcrypt)                                                                  |
| Rate limiting      | Existe (`server/lib/rate-limit.ts`) — ver gap #2                                                                  |
| SDD specs          | `docs/specs/` para users, internships, applications, matching                                                     |

### Gaps detectados

| #   | Área                 | Problema                                                                                                                                                                                                                                                                | Severidad |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Auth/JWT             | `session.maxAge = 24h`. Consigna pide 15min + refresh token. Sin refresh token hoy                                                                                                                                                                                      | Alta      |
| 2   | Rate limit           | In-memory (`Map`). En Vercel multi-instancia NO funciona                                                                                                                                                                                                                | Alta      |
| 3   | CSP                  | `script-src 'unsafe-eval' 'unsafe-inline'` — demasiado laxo                                                                                                                                                                                                             | Media     |
| 4   | ~~Middleware~~       | ~~Se llama `src/proxy.ts` y no `src/middleware.ts`~~ — **FALSO POSITIVO**. Next.js 16 renombró la convención: `middleware.ts` → `proxy.ts` y función `middleware` → `proxy`. El archivo actual está correcto (validado con `curl -I` → header `x-request-id` presente). | Resuelto  |
| 5   | Coverage             | Thresholds: 80% func / 70% lines. Consigna pide 100% func / 80% lines                                                                                                                                                                                                   | Media     |
| 6   | Tests faltantes      | Sin tests: `chat.service`, `interviews.service`, `ats/scoring-engine`, scorers individuales, mayoría de componentes                                                                                                                                                     | Alta      |
| 7   | E2E                  | Directorio `e2e/` configurado pero sin specs reales                                                                                                                                                                                                                     | Alta      |
| 8   | ADRs                 | Cero ADRs                                                                                                                                                                                                                                                               | Media     |
| 9   | Logging              | `console.error` / `console.log` crudo. Sin logger estructurado                                                                                                                                                                                                          | Media     |
| 10  | Playbooks / runbooks | No hay `docs/runbooks/`                                                                                                                                                                                                                                                 | Baja      |
| 11  | Sentry alerts        | Instalado pero sin alertas/thresholds en el dashboard                                                                                                                                                                                                                   | Media     |
| 12  | Dead code            | Sin pasar por `ts-prune` / `knip` / imports huérfanos                                                                                                                                                                                                                   | Media     |
| 13  | Audit level          | CI usa `--audit-level=high` → vulnerabilidades `moderate` pasan                                                                                                                                                                                                         | Media     |
| 14  | Organización `lib/`  | Mezcla código de cliente, server y compartido                                                                                                                                                                                                                           | Baja      |

---

## Orden de ejecución (acordado)

0. Sanity check middleware
1. ADRs
2. Testing (ex-Fase 4)
3. Seguridad (ex-Fase 2)
4. Limpieza dead code y reorganización (ex-Fase 3)
5. Patrones de diseño
6. Observabilidad y performance

Cada fase termina con: commit conventional + CHANGELOG + bump semver + CI verde.

---

## FASE 0 — Sanity check middleware ✅ RESUELTA

**Resultado**: el middleware corre correctamente. En Next.js 16 la convención es `proxy.ts` (no `middleware.ts`) — el archivo actual `src/proxy.ts` con `export async function proxy(...)` está bien. Validado con `curl -I http://localhost:3000/` que muestra `x-request-id`.

**Output de esta fase**:

- `e2e/middleware.spec.ts` con dos tests de regresión: (a) header `x-request-id` presente, (b) `/registro` redirige a `/login` sin sesión.
- Este plan corregido para sacar el falso gap y documentar la convención de Next.js 16.

**Lección metodológica**: verificar versión del framework antes de afirmar que una convención está rota. Hacer `curl` al dev server es la prueba más barata.

---

## FASE 1 — ADRs (documentación fundacional) ✅ CERRADA

**Resultado**: 6 ADRs creados en `docs/adr/` con formato `Contexto / Decisión / Consecuencias / Alternativas consideradas` + README índice. Commit principal `a325ea9` (2026-04-23, bump 1.4.0 → 1.4.1). Cierre formal con fix de hechos en ADR 006 (commit posterior, bump 1.5.0 → 1.5.1).

| #   | ADR                                                                                                           | Status                                        |
| --- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 001 | [Monolito modular + Clean Architecture](../docs/adr/001-monolito-modular-clean-architecture.md)               | Aceptado                                      |
| 002 | [Autenticación con NextAuth + JWT rotativo](../docs/adr/002-auth-nextauth-jwt-rotativo.md)                    | Propuesto (impl en Fase 3)                    |
| 003 | [Rate limiting con Upstash Redis](../docs/adr/003-rate-limiting-upstash.md)                                   | Propuesto (impl en Fase 3)                    |
| 004 | [Testing strategy — pirámide](../docs/adr/004-testing-strategy-piramide.md)                                   | Aceptado parcial (cerrado en Fase 2)          |
| 005 | [Observabilidad con Sentry + logger estructurado](../docs/adr/005-observabilidad-sentry-logger.md)            | Aceptado parcial (logger + alertas en Fase 6) |
| 006 | [Matching con embeddings HuggingFace + cosine similarity](../docs/adr/006-matching-embeddings-huggingface.md) | Aceptado, implementado                        |

**Output de esta fase**:

- `docs/adr/001..006-*.md` (6 archivos) + `docs/adr/README.md` con índice y convenciones
- ADR 006 lleva apéndice "Notas de implementación" documentando el cambio de modelo de `sentence-transformers/all-MiniLM-L6-v2` → `BAAI/bge-small-en-v1.5` (ambos 384 dims; el primero queda ruteado al `SentenceSimilarityPipeline` por HuggingFace en el free tier y no permite obtener embeddings individuales). La decisión de stack (HF Inference API + 384 dims + cosine similarity + `Float[]` de Prisma) se mantiene.

**Lección metodológica**: cuando el código diverge del ADR aceptado por una restricción operativa (no por cambio de decisión), la convención del repo permite editarlo agregando un apéndice "Notas de implementación" con fecha. NO se reescribe el cuerpo aceptado; se anexa la realidad debajo.

---

## FASE 2 — Testing (subir coverage + tests faltantes) ✅ CERRADA

**Progreso**:

- ✅ Paso 1: spec chat + spec auth-guard (commit 98922fa)
- ✅ Paso 2a: Mock Prisma extendido + setup env (commit dea6963)
- ✅ Paso 2b: Bug soft delete arreglado (commit 341d125, versión 1.4.2)
- ✅ Paso 3: chat.service.test.ts con 31 tests (commit 98922fa)
- ✅ Paso 4: auth-guard.test.ts con 16 tests (commit 2f55740)
- ✅ Paso 5: rate-limit spec + 15 tests (commit 3e510f9)
- ✅ Paso 6: interviews.service spec + 45 tests (commit aa60005)
- ✅ Paso 7: ats-scoring spec + scoring-engine + 5 scorers (78 tests)
- ✅ Paso 8: cv-parser spec + 20 tests
- ✅ Paso 9: component tests base (MessageBubble 10, ModuleCard 11, CandidateCard 22, PublicNav 19) + InternshipCard legacy arreglado (16)
- ✅ Paso 9b: component tests extendidos (MessageInput 19, ConversationItem 23, ConversationList 13, InterviewMessageCard 11, ATSToggle 14, ModuleEditModal 23) — 103 tests nuevos
- ✅ Paso 10: E2E suite completa (4 specs nuevos + arreglos de 3 specs pre-existentes desfasados con UI rediseñada). Seed parchado con `passwordHash` para empresas (Test1234!) y reparación de linkage huérfano
- ✅ Paso 11: thresholds 100% func / 80% lines-branches-statements en `vitest.config.ts`. Suite final: **287/287 funcs cubiertas (100%)**, lines 99.71%, statements 98.81%, branches 94.15%. Tests adicionales: `auth.test.ts` (24), `cv-extractor.test.ts` (34), extensiones de los 4 service tests (services al 100% func) y de 4 component tests (ModuleEditModal EDUCATION/LANGUAGES/PORTFOLIO + default; ChatWindow handler realtime + scroll on new msg; MessageInput auto-resize; PublicNav links del drawer).
- ✅ Paso 12: cierre Fase 2 con bump 1.4.2 → **1.5.0** + entrada CHANGELOG.

**Login empresa con credentials para E2E**: `techcorp@example.com` / `Test1234!` (seed)

### 2.1 Unit tests

- [x] `chat.service.test.ts` (commit 98922fa, 31 tests)
- [x] `auth-guard.test.ts` (commit 2f55740, 16 tests)
- [x] `rate-limit.test.ts` (commit 3e510f9, 15 tests)
- [x] `interviews.service.test.ts` (commit aa60005, 45 tests)
- [x] `ats/scoring-engine.test.ts` (Paso 7, 14 tests)
- [x] `ats/scorers/experience.scorer.test.ts` (+ education, portfolio, languages, skills — Paso 7, 64 tests en total de scorers)
- [x] `server/lib/cv-parser.test.ts` (Paso 8, 20 tests — mockea pdf-parse y mammoth vía Module.prototype.require)

**Estado suite al 2026-04-24 (post Paso 9b)**: 422/422 unit+component en verde (15 archivos unit + 11 archivos components).
**Estado suite E2E (post Paso 10)**: 53 tests pasando, 3 skipped (Google OAuth no automatizable), 8 archivos de specs.

### 2.2 Component tests

- [x] `CandidateCard.test.tsx` (Paso 9, 22 tests)
- [x] `ModuleCard.test.tsx` (Paso 9, 11 tests)
- [x] `MessageBubble.test.tsx` (Paso 9, 10 tests)
- [x] `PublicNav.test.tsx` con drawer mobile (Paso 9, 19 tests)
- [x] `InternshipCard.test.tsx` pre-existente arreglado (Paso 9, 16 tests)
- [x] `MessageInput.test.tsx` (Paso 9b, 19 tests)
- [x] `ConversationItem.test.tsx` (Paso 9b, 23 tests)
- [x] `ConversationList.test.tsx` (Paso 9b, 13 tests — mockea useSession + fetch)
- [x] `InterviewMessageCard.test.tsx` (Paso 9b, 11 tests)
- [x] `ATSToggle.test.tsx` (Paso 9b, 14 tests — mockea window.confirm)
- [x] `ModuleEditModal.test.tsx` (Paso 9b, 23 tests)
- [ ] Dashboard pages críticas (deferido a E2E del Paso 10)

### 2.3 E2E (Playwright) — 53 tests en verde, 3 skipped (Google OAuth no automatizable)

**Cobertura conseguida**:

- [x] Login empresa con credentials (5 tests — `auth-credentials.spec.ts`)
- [x] Forgot-password / reset-password (13 tests — `forgot-reset-password.spec.ts`, anti-enumeration verificado)
- [x] Registro empresa (10 tests de validaciones — `registro-empresa.spec.ts`)
- [x] Dashboard empresa autenticado (7 tests — `dashboard-empresa.spec.ts`, modal detalle, ATS, cookies)
- [x] Guard sin sesión (3 tests — `auth.spec.ts`)
- [x] Listado público de prácticas (7 tests — `internships.spec.ts`)
- [x] Landing pública (5 tests — `landing.spec.ts`)
- [x] Middleware (2 tests — `middleware.spec.ts`)

**Cobertura diferida** (requiere fixture de sesión NextAuth — Google OAuth):

- [ ] Postulación estudiante (necesita login Google)
- [ ] Ranking ATS desde sesión empresa con applications reales (cubierto parcialmente; falta el flujo de aprobar candidato)

**Infraestructura agregada**:

- `e2e/helpers/auth.ts` con `loginAsCompany()` que usa el flow real de credentials login UI
- `prisma/seed.ts` parchado con `passwordHash` bcrypt en empresas TechCorp/StartupX (`Test1234!`) + reparación de linkage de internships en cada run

### 2.4 Update coverage thresholds

```ts
thresholds: {
  functions: 100,
  lines: 80,
  branches: 80,
  statements: 80,
}
```

---

## FASE 3 — Seguridad (OWASP Top 10 aplicado)

| Prioridad | Tarea                                                                                         | Estado | Valida con                                  |
| --------- | --------------------------------------------------------------------------------------------- | ------ | ------------------------------------------- |
| P0        | JWT a 15min + refresh token rotation                                                          | ✅     | Cerrado en commit `040f1e8` (1.8.0)         |
| P0        | Rate limit → Upstash/Vercel KV (distribuido)                                                  | ✅     | Cerrado en commits `f256259` + `7026f2c`    |
| P1.1      | CSP: sacar `unsafe-eval`, usar nonces para scripts Next.js                                    | ✅     | Cerrado en commit de bump 1.10.0 (paso 3.3) |
| P1.2      | CI: `pnpm audit --audit-level=moderate`                                                       | ⏳     | Job verde                                   |
| P2        | Audit endpoints `/api/*`: cada uno usa `requireAuth`, valida Zod, no expone datos ajenos      | ⏳     | Checklist en PR                             |
| P2        | Login attempts logueados a Sentry con breadcrumbs                                             | ⏳     | Disparar failed login → ver en Sentry       |
| P2        | Headers: `X-Permitted-Cross-Domain-Policies: none`, `Cross-Origin-Opener-Policy: same-origin` | ⏳     | Network tab                                 |

**Cierre P1.1 (paso 3.3)**: CSP movido de `next.config.ts` a `src/proxy.ts` con nonces dinámicos por request. Producción 100% locked (`script-src` solo `'self' 'nonce-X' 'strict-dynamic' sentry.io`). Dev agrega `'unsafe-eval'` solo porque React 19 lo necesita para callstacks de devtools. Sumadas directivas `base-uri`, `form-action`, `object-src`. `style-src` mantiene `'unsafe-inline'` a propósito (Tailwind/Radix/next-font). Spec en `docs/specs/csp.spec.md`. Tests: 22 unit (`csp.test.ts`) + 6 E2E (`csp.spec.ts`). 869/869 tests verde.

---

## FASE 4 — Limpieza dead code y reorganización

- [ ] `knip` como devDep → listar dead exports/archivos
- [ ] ESLint `no-unused-vars` con auto-fix
- [ ] Reorganizar `src/lib/`:
  - `src/lib/env.ts` → queda
  - `src/lib/auth.ts` → `src/server/lib/auth.ts`
  - `src/lib/constants.ts` → queda
  - `src/lib/supabase/realtime-client.ts` → `src/lib/client/supabase.ts`
- [ ] Renombrar `src/proxy.ts` → `src/middleware.ts` (si no se hizo en Fase 0)
- [ ] Revisar `src/types/index.ts` — sacar tipos muertos

---

## FASE 5 — Patrones de diseño donde aporten

**Regla**: no aplicar patrones "para verse pro". Solo donde resuelven problema real.

| Candidato                          | Patrón                  | Por qué                                                                      |
| ---------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `server/services/notifications/*`  | Observer                | Evento `applicationCreated` → dispara email + notificación + log sin acoplar |
| `server/lib/ats/scorers/*`         | Strategy (ya implícito) | Formalizar: interfaz `IScorer`, registry                                     |
| `server/lib/ats/scoring-engine.ts` | Composite               | Combina scores de múltiples scorers                                          |
| Acciones ATS (mover candidato)     | Command                 | Habilita audit trail + undo                                                  |

---

## FASE 6 — Observabilidad y performance

### 6.1 Logger estructurado

- [ ] Reemplazar `console.*` por logger (`pino`)
- [ ] Correlation ID por request (propagar `x-request-id`)

### 6.2 Sentry de verdad

- [ ] Alertas: error rate >1%, P95 >200ms, failed logins >10/min
- [ ] Performance monitoring activo
- [ ] Releases ligados a commits

### 6.3 Runbooks

- [ ] `docs/runbooks/incident-auth-down.md`
- [ ] `docs/runbooks/incident-db-slow.md`
- [ ] `docs/runbooks/incident-huggingface-down.md`

### 6.4 NFR <200ms

- [ ] Medir P95 actual de endpoints críticos
- [ ] Si no cumple: cache, índices, CDN
- [ ] Validar con `k6` o `autocannon`

### 6.5 Performance percibida

- [ ] Skeletons en listing prácticas y ranking ATS
- [ ] Optimistic updates en postular, aprobar/rechazar, marcar leída
- [ ] Lazy load imágenes `next/image`
- [ ] Prefetch en hover para `<Link>` del dashboard

---

## NFRs globales del proyecto

- Latencia inicial: P95 <200ms en endpoints críticos
- Disponibilidad: 99.9%
- Coverage: 100% functions / 80% lines-branches
- OWASP Top 10 cubierto
- CI verde en todo PR a `master`

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

## FASE 1 — ADRs (documentación fundacional)

Crear `docs/adr/` con:

| #   | ADR                                                     | Contenido                                                                           |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 001 | Monolito modular + Clean Architecture                   | Por qué Next.js full-stack, separación por capas, regla "services no importan next" |
| 002 | Autenticación con NextAuth + JWT rotativo               | Decisión JWT 15min + refresh, tradeoffs vs sesiones largas                          |
| 003 | Rate limiting con Upstash/Vercel KV                     | Por qué no in-memory, límite multi-instancia                                        |
| 004 | Testing strategy (pirámide)                             | 70% unit / 20% integration / 10% E2E, coverage 100% func / 80% lines                |
| 005 | Observabilidad con Sentry + logger estructurado         | Qué se captura, qué thresholds                                                      |
| 006 | Matching con embeddings HuggingFace + cosine similarity | Por qué embeddings vs keywords, modelo 384-dim                                      |

Formato por ADR: `Contexto / Decisión / Consecuencias / Alternativas consideradas`.

---

## FASE 2 — Testing (subir coverage + tests faltantes) — EN CURSO

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
- ✅ Paso 9: component tests base (MessageBubble 10, ModuleCard 11, CandidateCard 22, PublicNav 19) + InternshipCard legacy arreglado (16) — NUEVO
- ⏳ Paso 9b: component tests de dashboards críticos (pendiente, si se considera necesario)
- ⏳ Paso 10: E2E flows (postulación estudiante, ranking ATS, login/forgot/reset, guard sin sesión)
- ⏳ Paso 11: Subir thresholds en `vitest.config.ts` a 100% func / 80% lines-branches-statements
- ⏳ Paso 12: cierre Fase 2 con commit + bump + CHANGELOG

### 2.1 Unit tests

- [x] `chat.service.test.ts` (commit 98922fa, 31 tests)
- [x] `auth-guard.test.ts` (commit 2f55740, 16 tests)
- [x] `rate-limit.test.ts` (commit 3e510f9, 15 tests)
- [x] `interviews.service.test.ts` (commit aa60005, 45 tests)
- [x] `ats/scoring-engine.test.ts` (Paso 7, 14 tests)
- [x] `ats/scorers/experience.scorer.test.ts` (+ education, portfolio, languages, skills — Paso 7, 64 tests en total de scorers)
- [x] `server/lib/cv-parser.test.ts` (Paso 8, 20 tests — mockea pdf-parse y mammoth vía Module.prototype.require)

**Estado suite al 2026-04-24**: 319/319 en verde (15 archivos unit + 5 archivos components).

### 2.2 Component tests

- [x] `CandidateCard.test.tsx` (Paso 9, 22 tests)
- [x] `ModuleCard.test.tsx` (Paso 9, 11 tests)
- [x] `MessageBubble.test.tsx` (Paso 9, 10 tests)
- [x] `PublicNav.test.tsx` con drawer mobile (Paso 9, 19 tests)
- [x] `InternshipCard.test.tsx` pre-existente arreglado (Paso 9, 16 tests)
- [ ] Dashboard pages críticas

### 2.3 E2E (Playwright)

- [ ] Registro estudiante → subir CV → ver recomendaciones → postularse
- [ ] Registro empresa → crear práctica → ver ranking ATS → aprobar candidato
- [ ] Login / forgot-password / reset-password
- [ ] Guard: acceder a dashboard sin sesión → redirect a login

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

| Prioridad | Tarea                                                                                         | Valida con                                     |
| --------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| P0        | JWT a 15min + refresh token rotation                                                          | Test unit de jwt callback + E2E de expiración  |
| P0        | Rate limit → Upstash/Vercel KV (distribuido)                                                  | Test de integración con 2 instancias simuladas |
| P1        | CSP: sacar `unsafe-eval`, usar nonces para scripts Next.js                                    | DevTools console sin errores CSP               |
| P1        | CI: `pnpm audit --audit-level=moderate`                                                       | Job verde                                      |
| P2        | Audit endpoints `/api/*`: cada uno usa `requireAuth`, valida Zod, no expone datos ajenos      | Checklist en PR                                |
| P2        | Login attempts logueados a Sentry con breadcrumbs                                             | Disparar failed login → ver en Sentry          |
| P2        | Headers: `X-Permitted-Cross-Domain-Policies: none`, `Cross-Origin-Opener-Policy: same-origin` | Network tab                                    |

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

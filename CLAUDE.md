# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project: PractiX

Portal de prácticas laborales con matching inteligente.  
Full-stack unificado en **Next.js 16 (App Router)** + React 19 — un solo deploy en Vercel.

---

## Commands

```bash
pnpm dev                                    # Dev server → http://localhost:3000
pnpm lint                                   # ESLint
pnpm test                                   # Vitest unit tests (watch mode)
pnpm test:coverage                          # Coverage con umbral: 80% funciones, 70% líneas/branches
pnpm test:e2e                               # Playwright E2E
pnpm prisma migrate dev --name <descripcion> # Cambio de schema: genera migration SQL versionada + la aplica local
pnpm prisma migrate status                  # Ver migrations pendientes/aplicadas en la DB activa
pnpm db:generate                            # Regenerar Prisma Client (no toca DB)
pnpm db:studio                              # GUI para inspeccionar datos
pnpm db:seed                                # Seed de datos de ejemplo (tsx prisma/seed.ts)
pnpm db:push                                # ⚠ EMERGENCIA SOLO: sync schema sin migration. NO usar para cambios reales — pasa por encima del histórico de migrations y aplica directo a DATABASE_URL/DIRECT_URL (puede tocar prod)
docker compose up                           # PostgreSQL local para desarrollo (puerto 5433)
```

Para correr un test específico:

```bash
pnpm vitest run src/test/unit/internships.service.test.ts
```

---

## Architecture

Clean Architecture dentro de Next.js:

```
app/api/*           → Capa HTTP: recibe request, valida con Zod, llama al service, retorna NextResponse
server/services/*   → Lógica de negocio PURA (nunca importa nada de next.js)
server/lib/*        → Infraestructura: db.ts (Prisma), storage.ts (Supabase), embeddings.ts (HuggingFace), mail.ts (Brevo)
server/validators/  → Schemas Zod para validar inputs de cada endpoint
lib/auth.ts         → authOptions de NextAuth (shared entre pages y API routes)
types/index.ts      → Tipos TypeScript compartidos front+back
```

**Regla clave**: `server/services/` no puede importar nada de `next` ni de `next/server`. Si mañana migrás el backend a Express, copiás `server/` y funciona sin cambios.

Las llamadas fetch del frontend siempre usan URL relativa (`fetch('/api/...')`) — mismo servidor, sin CORS.

---

## Data Models (Prisma)

5 modelos: `User`, `StudentProfile`, `CompanyProfile`, `Internship`, `Application`

- `Application` tiene `@@unique([studentId, internshipId])` — un estudiante no puede postularse dos veces
- Prácticas usan **soft delete** (campo `isActive: Boolean`)
- Embeddings almacenados como `Float[]` en `StudentProfile` e `Internship` (384 dimensiones, modelo `BAAI/bge-small-en-v1.5`). Decisión y migración desde `sentence-transformers/all-MiniLM-L6-v2` documentadas en ADR 006.
- Prisma Client singleton en `src/server/lib/db.ts` (patrón `globalThis` para dev)

### Schema migrations workflow (desde 1.10.37)

- Cambios de schema viven en `prisma/migrations/<timestamp>_<nombre>/migration.sql` (versionados en git).
- Local: `pnpm prisma migrate dev --name <descripcion>` genera el archivo + aplica a la DB local + regenera el client.
- Producción: Vercel ejecuta `prisma migrate deploy` automáticamente en el build (ver `vercel-build` script en `package.json`). Cero acción manual.
- Baseline `20260507100000_init` captura el estado pre-workflow + los 6 índices de F6.4.
- `pnpm db:push` queda **deprecado** para cambios reales — pasa por encima del histórico de migrations y aplica directo a la DB del `DIRECT_URL`/`DATABASE_URL` activo (puede impactar prod sin trace en git).

---

## Auth

- NextAuth.js con Google OAuth
- Sesión expone: `session.user.id`, `session.user.role` (`STUDENT` | `COMPANY`), `session.user.email`
- Protección de API routes via `requireAuth(role?)` en `src/server/lib/auth-guard.ts`
- Dashboard protegido por `(dashboard)/layout.tsx` con `useSession`

---

## AI Matching

- CV parser: `pdf-parse` para PDF, `mammoth` para DOCX
- Embeddings: HuggingFace Inference API, modelo `BAAI/bge-small-en-v1.5` (384 dims, feature-extraction nativa)
- Similitud: cosine similarity, score normalizado 0–100
- El embedding de una práctica se genera al crearla (`internships.service.ts → createInternship`)
- CVs almacenados en Supabase Storage, bucket `documents`

---

## Development Methodology: SDD + TDD

Para cada service nuevo, el orden es **siempre**:

1. **Spec SDD** — definir qué hace la función, inputs, outputs y errores posibles
2. **Tests TDD** — escribir tests en `src/test/unit/{nombre}.service.test.ts` **antes** de implementar (van a fallar, está bien)
3. **Implementar** — hasta que los tests estén en verde
4. **E2E** — solo en Módulo 13, cuando la app está completa

Los unit tests van en el mismo módulo que el service. **Nunca al final.**

Mock de Prisma disponible en `src/test/mocks/prisma.ts`.

---

## Environment Variables

Variables de entorno accedidas **siempre** via `src/lib/env.ts` (validado con Zod al arrancar).  
Nunca acceder `process.env` directamente en el código de la aplicación.

Ver `.env.example` para la lista completa.  
Para desarrollo local con Docker: `DATABASE_URL="postgresql://practix:practix@localhost:5433/practix"` (puerto 5433 — el contenedor `db` mapea `5433:5432` para no chocar con un Postgres del SO host)

---

## Git Conventions

Conventional commits obligatorio: `feat|fix|chore|docs|test|refactor`  
Cada commit que modifica código debe actualizar `package.json` (semver) y agregar entrada en `CHANGELOG.md`.

---

## Module Roadmap

> Estado al 2026-05-06: 14 módulos originales + 7 extensiones + refactor-plan completo (Fases 0–6 core) cerrados. Solo F6.4 (NFR <200ms) y F6.5 (UX optimistic + skeletons) quedan opcionales.

### Módulos originales (14/14 ✅)

| #   | Módulo            | Resultado                                        |
| --- | ----------------- | ------------------------------------------------ |
| 1   | Setup             | Next.js + Tailwind + Prisma + Docker + Husky     |
| 2   | Database          | 5 modelos Prisma + Supabase conectado            |
| 3   | Auth              | NextAuth Google OAuth + middleware               |
| 4   | Users API         | Perfiles estudiante/empresa                      |
| 5   | Internships API   | CRUD con filtros y paginación                    |
| 6   | Applications API  | Estados: PENDING → REVIEWED → ACCEPTED/REJECTED  |
| 7   | Landing + Layout  | UI pública con navegación                        |
| 8   | Listing           | Listado con filtros, búsqueda, paginación        |
| 9   | Student Dashboard | Perfil, subir CV, postulaciones, recomendaciones |
| 10  | Company Dashboard | Crear prácticas, ver postulantes rankeados       |
| 11  | AI Matching       | CV parsing + embeddings + cosine similarity      |
| 12  | Deploy            | Emails + Sentry + GitHub Actions + Vercel        |
| 13  | Testing           | Vitest unit + Playwright E2E                     |
| 14  | Security          | Rate limiting + headers + OWASP                  |

### Extensiones (7/7 ✅)

| Módulo                      | Resultado                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Mejoras estudiante          | Registro guiado + perfil unificado                                                        |
| Admin panel                 | Aprobación de empresas (`(admin)/admin/empresas`)                                         |
| Rediseño Stitch (Warm Tech) | Públicas + auth + dashboards (3 oleadas) + admin                                          |
| ATS para empresas           | Pipeline kanban + scoring engine 5 scorers + ScoreBreakdownModal                          |
| Chat tiempo real            | Supabase Realtime + conversaciones + mensajes (ver `CHAT_MODULE.md` para setup histórico) |
| Calendario entrevistas      | CRUD interviews + send-to-chat                                                            |
| Notificaciones              | Bell + panel + DELETE real + read-all                                                     |

### Refactor + hardening (Fases 0–6 ✅, ver `context/refactor-plan.md`)

| Fase | Resultado                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------- |
| 0    | Sanity check middleware (Next.js 16: `proxy.ts` no `middleware.ts`)                                     |
| 1    | 6 ADRs en `docs/adr/`                                                                                   |
| 2    | Coverage 100% func / 80% lines + 1097 unit/component + 53 E2E                                           |
| 3    | OWASP Top 10 + audit `/api/*` (12 áreas, 31 findings 🛑 + 14 ⚠️ documentados)                           |
| 4    | knip + reorganización `src/lib/`                                                                        |
| 5    | Strategy/Registry para scorers ATS (1 patrón aplicado, 3 descartados conscientemente)                   |
| 6    | Logger pino + correlation ID + Sentry alerts + runbooks + tracesSampleRate + releases ligados a commits |

Ver `promps/PROMP/` para los prompts detallados de cada módulo original.
Ver `context/project-state.md` para el estado actual del proyecto.
Ver `context/refactor-plan.md` para el detalle de Fases 0–6.

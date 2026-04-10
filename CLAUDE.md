# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project: PractiX

Portal de prácticas laborales con matching inteligente.  
Full-stack unificado en **Next.js 14 (App Router)** — un solo deploy en Vercel.

---

## Commands

```bash
pnpm dev                  # Dev server → http://localhost:3000
pnpm lint                 # ESLint
pnpm test                 # Vitest unit tests (watch mode)
pnpm test:coverage        # Coverage con umbral: 80% funciones, 70% líneas/branches
pnpm test:e2e             # Playwright E2E
pnpm db:push              # Sincronizar schema.prisma con la DB
pnpm db:generate          # Regenerar Prisma Client
pnpm db:studio            # GUI para inspeccionar datos
pnpm db:seed              # Seed de datos de ejemplo (tsx prisma/seed.ts)
docker compose up         # PostgreSQL local para desarrollo
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
- Embeddings almacenados como `Float[]` en `StudentProfile` e `Internship` (384 dimensiones, modelo `sentence-transformers/all-MiniLM-L6-v2`)
- Prisma Client singleton en `src/server/lib/db.ts` (patrón `globalThis` para dev)

---

## Auth

- NextAuth.js con Google OAuth
- Sesión expone: `session.user.id`, `session.user.role` (`STUDENT` | `COMPANY`), `session.user.email`
- Protección de API routes via `requireAuth(role?)` en `src/server/lib/auth-guard.ts`
- Dashboard protegido por `(dashboard)/layout.tsx` con `useSession`

---

## AI Matching

- CV parser: `pdf-parse` para PDF, `mammoth` para DOCX
- Embeddings: HuggingFace Inference API, modelo `sentence-transformers/all-MiniLM-L6-v2` (384 dims)
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
Para desarrollo local con Docker: `DATABASE_URL="postgresql://practix:practix@localhost:5432/practix"`

---

## Git Conventions

Conventional commits obligatorio: `feat|fix|chore|docs|test|refactor`  
Cada commit que modifica código debe actualizar `package.json` (semver) y agregar entrada en `CHANGELOG.md`.

---

## Module Roadmap

| # | Módulo | Resultado |
|---|--------|-----------|
| 1 | Setup | Next.js + Tailwind + Prisma + Docker + Husky |
| 2 | Database | 5 modelos Prisma + Supabase conectado |
| 3 | Auth | NextAuth Google OAuth + middleware |
| 4 | Users API | Perfiles estudiante/empresa |
| 5 | Internships API | CRUD con filtros y paginación |
| 6 | Applications API | Estados: PENDING → REVIEWED → ACCEPTED/REJECTED |
| 7 | Landing + Layout | UI pública con navegación |
| 8 | Listing | Listado con filtros, búsqueda, paginación |
| 9 | Student Dashboard | Perfil, subir CV, postulaciones, recomendaciones |
| 10 | Company Dashboard | Crear prácticas, ver postulantes rankeados |
| 11 | AI Matching | CV parsing + embeddings + cosine similarity |
| 12 | Deploy | Emails + Sentry + GitHub Actions + Vercel |
| 13 | Testing | Vitest unit + Playwright E2E |
| 14 | Security | Rate limiting + headers + OWASP |

Ver `promps/PROMP/` para los prompts detallados de cada módulo.  
Ver `context/project-state.md` para el estado actual del proyecto (módulo en curso).

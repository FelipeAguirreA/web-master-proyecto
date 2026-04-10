# PractiX - Plataforma de Prácticas Laborales con IA

## Resumen

**Duración total**: 12 módulos
**Proyecto final**: PractiX - Portal de prácticas laborales con matching inteligente
**Stack**: Next.js 14 (full-stack) + Prisma + Supabase + TailwindCSS + HuggingFace
**Metodología**: SDD (Spec-Driven Development) + TDD (Test-Driven Development)

---

## Metodología: SDD + TDD

Este proyecto usa dos metodologías complementarias que trabajan juntas:

### SDD — Spec-Driven Development
Antes de escribir código, se define la especificación de cada feature: qué hace, qué recibe, qué retorna, y qué errores maneja. Esto evita implementar sobre suposiciones.

### TDD — Test-Driven Development
Dentro de cada módulo, los tests se escriben ANTES de la implementación:

```
SDD → Especificación del service
  ↓
TDD → Escribir tests (fallan, está bien — no hay código aún)
  ↓
Implementar hasta que los tests pasen
  ↓
Playwright E2E al cerrar el módulo completo
```

### Cuándo aplica cada uno

| Qué | Cuándo |
|-----|--------|
| Specs SDD | Antes de cada service nuevo |
| Unit tests (Vitest) | Junto al service, en el mismo módulo |
| E2E tests (Playwright) | Módulo 13, cuando la app está completa |

> Los tests de unit NO van al módulo 13. Cada módulo que agrega un service incluye sus propios tests.

---

## Estructura de Módulos

| #   | Módulo                                                       | Resultado                                        |
| --- | ------------------------------------------------------------ | ------------------------------------------------ |
| 1   | [Setup del Proyecto](./modulo-01-setup.md)                   | Next.js + Tailwind + Prisma + Docker + Husky     |
| 2   | [Base de Datos](./modulo-02-database.md)                     | 5 modelos Prisma + Supabase conectado            |
| 3   | [Autenticación](./modulo-03-auth.md)                         | NextAuth con Google OAuth + middleware            |
| 4   | [API - Usuarios y Perfiles](./modulo-04-users.md)            | Endpoints de perfiles estudiante/empresa          |
| 5   | [API - Prácticas CRUD](./modulo-05-internships.md)           | CRUD completo con filtros y paginación            |
| 6   | [API - Postulaciones](./modulo-06-applications.md)           | Sistema de postulaciones con estados              |
| 7   | [Landing Page + Layout](./modulo-07-landing.md)              | Landing atractiva + layout con navegación         |
| 8   | [Listado de Prácticas](./modulo-08-listing.md)               | Listado con filtros, búsqueda y paginación        |
| 9   | [Dashboard Estudiante](./modulo-09-student.md)               | Perfil, subir CV, postulaciones, recomendaciones  |
| 10  | [Dashboard Empresa](./modulo-10-company.md)                  | Crear prácticas, ver postulantes                  |
| 11  | [Matching IA](./modulo-11-matching.md)                       | CV parsing + embeddings + similitud de coseno     |
| 12  | [Notificaciones + Deploy](./modulo-12-deploy.md)             | Emails + Sentry + Docker prod + CI/CD + Vercel   |
| 13  | [Testing](./modulo-13-testing.md)                            | Vitest + Testing Library + Playwright E2E        |
| 14  | [Seguridad](./modulo-14-security.md)                         | Rate limiting + headers + OWASP checklist        |

---

## Arquitectura (Full-Stack Unificado)

```
practix/
├── prisma/
│   └── schema.prisma              # Modelos de datos
│
├── src/
│   ├── app/                        # 🖥️ PRESENTACIÓN (páginas + API routes)
│   │   ├── page.tsx                # Landing
│   │   ├── layout.tsx              # Root layout
│   │   ├── (auth)/
│   │   │   └── login/page.tsx      # Login OAuth
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Layout protegido
│   │   │   ├── estudiante/page.tsx
│   │   │   └── empresa/page.tsx
│   │   ├── practicas/
│   │   │   ├── page.tsx            # Listado
│   │   │   └── [id]/page.tsx       # Detalle
│   │   └── api/                    # ← BACKEND (route handlers)
│   │       ├── auth/[...nextauth]/
│   │       ├── users/
│   │       ├── internships/
│   │       ├── applications/
│   │       └── matching/
│   │
│   ├── server/                     # 🧠 LÓGICA DE NEGOCIO (clean architecture)
│   │   ├── services/               # Lógica pura, NO depende de Next.js
│   │   │   ├── users.service.ts
│   │   │   ├── internships.service.ts
│   │   │   ├── applications.service.ts
│   │   │   └── matching.service.ts
│   │   ├── lib/
│   │   │   ├── db.ts               # Prisma Client singleton
│   │   │   ├── storage.ts          # Supabase Storage
│   │   │   ├── embeddings.ts       # HuggingFace API
│   │   │   ├── cv-parser.ts        # Extracción de texto
│   │   │   └── mail.ts             # Brevo emails
│   │   └── validators/             # Schemas Zod
│   │       └── index.ts
│   │
│   ├── lib/                        # 🔧 COMPARTIDO
│   │   └── auth.ts                 # Config NextAuth
│   │
│   ├── components/                 # 🎨 UI
│   │   ├── ui/                     # Componentes reutilizables
│   │   └── providers.tsx           # Session provider
│   │
│   └── types/                      # 📝 TIPOS
│       └── index.ts
│
├── .env.local
├── next.config.js
├── tailwind.config.ts
└── package.json
```

### Principio de Clean Architecture Aplicado

```
app/api/*        →  Solo recibe request, valida, llama al service, retorna response
server/services/ →  Lógica de negocio pura (no sabe que existe Next.js)
server/lib/      →  Infraestructura (DB, storage, IA, email)
```

> Si mañana quieres migrar el backend a Express, copias `server/` y funciona.

---

## Reglas de Negocio

```
ROLES:
├── STUDENT: Busca prácticas, sube CV, se postula
└── COMPANY: Publica prácticas, ve postulantes

MATCHING IA:
├── Estudiante sube CV (PDF/Word)
├── Se extrae texto y se genera embedding (HuggingFace)
├── Se compara con embeddings de prácticas (similitud de coseno)
└── Se muestra ranking de afinidad (score 0-100%)

POSTULACIONES:
├── Estados: PENDING → REVIEWED → ACCEPTED / REJECTED
└── Un estudiante solo puede postularse una vez por práctica
```

---

## Stack Tecnológico (todo gratuito, un solo deploy)

| Capa            | Tecnología                  | Servicio           |
| --------------- | --------------------------- | ------------------ |
| Full-stack      | Next.js 14 (App Router)     | Vercel (free)      |
| Estilos         | TailwindCSS                 | —                  |
| DB              | PostgreSQL + Prisma         | Supabase (free)    |
| Auth            | NextAuth.js (Google OAuth)  | —                  |
| Storage         | Supabase Storage            | Supabase (free)    |
| IA              | HuggingFace Inference API   | HuggingFace (free) |
| Email           | Brevo (ex Sendinblue)       | Brevo (free)       |
| Monitoreo       | Sentry                      | Sentry (free)      |
| Dev environment | Docker + Docker Compose     | Local              |
| Testing         | Vitest + Testing Library    | —                  |
| E2E             | Playwright                  | —                  |
| CI/CD           | GitHub Actions              | GitHub (free)      |
| Git hooks       | Husky + lint-staged         | —                  |

**Un solo deploy. Cero CORS. Tipos compartidos.**

---

## Comandos Frecuentes

```bash
pnpm dev                    # App completa en http://localhost:3000
pnpm build                  # Build de producción
pnpm lint                   # ESLint
pnpm db:push                # Sincronizar schema con DB
pnpm db:generate            # Regenerar Prisma Client
pnpm db:studio              # GUI para ver datos
pnpm db:seed                # Seed de datos de ejemplo
pnpm test                   # Vitest unit tests
pnpm test:e2e               # Playwright E2E
pnpm test:coverage          # Coverage report
docker compose up           # Dev local con PostgreSQL
```

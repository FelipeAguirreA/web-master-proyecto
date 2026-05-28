# Módulo 1: Setup del Proyecto

## Resultado Final

Proyecto Next.js 16 (App Router) full-stack con:

- **Framework**: Next.js 16 + React 19 + TypeScript estricto
- **Estilos**: Tailwind v4 (config via CSS `@theme`, sin `tailwind.config.ts`)
- **DB**: Prisma 7 con `prisma.config.ts` (Prisma 7 sacó la URL del schema)
- **Package manager**: pnpm
- **Testing**: Vitest unit + Playwright E2E (instalados desde el día 1, los tests van en cada módulo)
- **Git hooks**: Husky + lint-staged + commitlint (conventional commits)
- **Dev local**: Docker Compose con PostgreSQL
- **Validación env**: Zod (falla al arrancar si falta o está mal una env var)
- **Reglas IA**: `CLAUDE.md` (Anthropic Claude Code) + `AGENTS.md` (estándar industria, auto-generado por Next.js 16)

---

## Paso 1: Crear Proyecto

```bash
pnpm create next-app@latest practix --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd practix
```

`pnpm create next-app@latest` baja Next.js 16 + React 19 + Tailwind v4 + ESLint flat config. Next.js 16 también genera automáticamente `AGENTS.md` con marcadores `<!-- BEGIN:nextjs-agent-rules -->` (no lo borres, lo leen Cursor/Copilot/Aider).

---

## Paso 2: Instalar Dependencias

```bash
# Auth
pnpm add next-auth bcryptjs
pnpm add -D @types/bcryptjs

# Base de datos
pnpm add prisma @prisma/client @prisma/adapter-pg
pnpm add @supabase/supabase-js
pnpm add pg
pnpm add -D @types/pg

# UI
pnpm add lucide-react

# Validación
pnpm add zod

# Procesamiento de CVs
pnpm add pdf-parse mammoth
pnpm add -D @types/pdf-parse

# Rate limiting (distribuido — Fase 3 del refactor)
pnpm add @upstash/ratelimit @upstash/redis

# Logger estructurado (Fase 6.1 del refactor)
pnpm add pino
pnpm add -D pino-pretty

# Monitoreo de errores
pnpm add @sentry/nextjs

# Email
# (se usará fetch directo a la API de Brevo, no necesita SDK)

# Dev tools
pnpm add -D tsx dotenv
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm add -D prettier

# Testing (se instala en setup — los tests van en cada módulo, no al final)
pnpm add -D vitest @vitejs/plugin-react @vitest/coverage-v8 jsdom
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @playwright/test

# Dead code detector (Fase 4 del refactor)
pnpm add -D knip
```

---

## Paso 3: Configurar Husky + lint-staged + commitlint

**Prompt para la IA:**

```
Configura Husky, lint-staged y commitlint para PractiX.

1. Inicializar Husky:
   npx husky init

2. Sobreescribir .husky/pre-commit con una sola línea:
   npx lint-staged

3. Crear .husky/commit-msg con una sola línea:
   npx --no -- commitlint --edit $1

4. En package.json agregar la sección lint-staged:
   - Para "*.{ts,tsx}": correr eslint --fix y prettier --write
   - Para "*.{json,md,css}": correr solo prettier --write

5. Crear commitlint.config.js en la raíz (formato CommonJS, NO .ts):
   - module.exports = { extends: ['@commitlint/config-conventional'] }

6. Agregar el script "prepare": "husky" en package.json
   para que husky se reinstale solo después de cada pnpm install.

Formato de commits aceptados (conventional commits):
  feat: nueva funcionalidad
  fix: corrección de bug
  chore: mantenimiento
  docs: documentación
  test: tests
  refactor: refactor sin cambio funcional
```

---

## Paso 4: Configurar Tailwind v4

> **Importante**: Tailwind v4 cambió la convención. **NO se usa `tailwind.config.ts`**. La config va dentro de CSS con la directiva `@theme`. Si tu IA insiste con `tailwind.config.ts`, recordale que está usando training data de Tailwind v3.

**Prompt para la IA:**

```
Configura Tailwind v4 para PractiX usando la convención CSS-first.

NO crear tailwind.config.ts — Tailwind v4 lo eliminó.

En src/app/globals.css:

1. Importar Tailwind con:
   @import "tailwindcss";

2. Definir un bloque @theme con tokens del design system:
   - Tipografía: --font-sans referenciando var(--font-outfit)
   - Paleta brand (azul, escala 50→950, 600 como primario):
     50:#eef7ff 100:#d9edff 200:#bce0ff 300:#8ecdff 400:#59b0ff
     500:#338bfc 600:#1d6cf1 700:#1555de 800:#1846b4 900:#193e8d 950:#142756
   - Paleta accent (naranja):
     400:#fb923c 500:#f97316 600:#ea580c

3. Definir body con font-family: var(--font-sans), Arial, sans-serif

4. En src/app/layout.tsx cargar la fuente Outfit usando next/font/google,
   exponiendo la variable CSS --font-outfit en el body.

NOTA: en producción se sumó después una segunda paleta "Warm Tech"
(warm grays + gradient #FF6A3D → #FF9B6A) para el rediseño visual.
La paleta brand/accent definida acá sigue siendo la base. Ver
context/responsive-plan.md para los detalles del rediseño.
```

---

## Paso 5: Estructura de Carpetas

**Prompt para la IA:**

```
Crea la estructura de carpetas completa para PractiX siguiendo Clean Architecture.

El proyecto ya existe (Next.js 16 con App Router + src/), solo necesito
crear las carpetas y archivos placeholder vacíos.

Regla rectora de Clean Architecture:
- server/services/* es lógica de negocio PURA: NUNCA importa de "next" ni "next/server"
- app/api/* es la capa HTTP: recibe request, valida con Zod, llama al service, retorna NextResponse
- server/lib/* es infraestructura: DB (Prisma), storage (Supabase), embeddings (HuggingFace), mail (Brevo), logger (pino)

Estructura dentro de src/:

src/
├── app/
│   ├── (auth)/                   # Group: login, registro, forgot-password, reset-password
│   ├── (dashboard)/              # Group protegido: estudiante, empresa, perfil, inbox, calendar, ats
│   ├── (admin)/                  # Group admin: aprobación de empresas
│   ├── practicas/                # Listado público + detalle [id]
│   └── api/                      # Routes agrupadas por área:
│       ├── auth/                 # NextAuth + refresh + logout + forgot-password + reset-password + empresa/register
│       ├── users/                # me, registro, profile/student, profile/company
│       ├── perfil/               # Perfil unificado + avatar
│       ├── internships/          # CRUD prácticas
│       ├── company/internships/  # Mis prácticas (empresa)
│       ├── applications/         # CRUD postulaciones
│       ├── matching/             # upload-cv, recommendations
│       ├── ats/                  # config, pipeline, score
│       ├── chat/                 # conversations + messages + read
│       ├── interviews/           # CRUD + send-to-chat + available-candidates
│       ├── notifications/        # listar, delete, read-all
│       ├── admin/empresas/       # Aprobar/rechazar empresas
│       └── health/               # Health check + ping DB
│
├── server/                       # Lógica de negocio (clean architecture)
│   ├── services/                 # Servicios PUROS (sin imports de Next.js)
│   ├── lib/                      # Infraestructura: db, storage, embeddings, mail, logger, auth, rate-limit, ats/*
│   └── validators/               # Schemas Zod por endpoint
│
├── lib/                          # Compartido frontend + util cross-runtime
│   ├── client/                   # Solo cliente (Supabase Realtime, etc.)
│   └── (env.ts y constants.ts irán acá en pasos siguientes)
│
├── components/                   # UI
│   ├── ui/                       # Atómicos
│   ├── layout/                   # PublicNav, etc.
│   ├── ats/                      # ModuleCard, ScoreBreakdownModal
│   └── chat/                     # MessageBubble, MessageInput, ConversationList
│
├── hooks/                        # useNotifications, etc.
└── types/                        # Tipos TypeScript compartidos

Archivos especiales en la raíz de src/:
- src/proxy.ts → middleware de Next.js 16 (placeholder con función `proxy()`,
  NO `middleware()` — Next.js 16 renombró la convención)
- src/instrumentation.ts → carga sentry.{server,edge}.config.ts (vacío al inicio)
- src/instrumentation-client.ts → carga sentry.client.config.ts (vacío al inicio)

También crear en la raíz del proyecto:
- docs/                       → Documentación para humanos (ADRs, runbooks, specs SDD)
- context/                    → Contexto para la IA
  - project-state.md          → Estado actual del proyecto (módulo en curso)
- CHANGELOG.md                → Historial de cambios (semver)

NO crear AGENT.md (singular) — fue eliminado del proyecto. Se reemplaza por:
- CLAUDE.md (Anthropic Claude Code) — se crea en el Paso 11
- AGENTS.md (plural) — ya lo generó automáticamente create-next-app@latest, no tocarlo

NO crear los route.ts ni page.tsx todavía — solo la estructura de carpetas
con .gitkeep donde haga falta.
```

---

## Paso 6: Variables de Entorno

**Prompt para la IA:**

```
Crea un archivo .env.example para PractiX con todas las variables que la app necesita.

Variables necesarias (con comentarios descriptivos):

# Base de datos
DATABASE_URL → connection string de PostgreSQL usado por Prisma Client en runtime
DIRECT_URL → conexión directa para migraciones (Prisma 7 CLI). En Supabase apunta
             al puerto 5432 directo (sin pgBouncer). Opcional en dev local.

# Supabase
NEXT_PUBLIC_SUPABASE_URL → URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY → Anon key pública (usada por el cliente Supabase Realtime)
SUPABASE_SERVICE_KEY → Service role key (usada en el server para Storage)

# NextAuth
NEXTAUTH_URL → URL base de la app (http://localhost:3000 en dev, URL de Vercel en prod)
NEXTAUTH_SECRET → secreto de mínimo 32 chars (generar con: openssl rand -base64 32)

# Google OAuth
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# HuggingFace (opcional — si falta, matching usa embedding vacío gracefulmente)
HUGGINGFACE_API_KEY → token con prefijo hf_

# Brevo (opcional — emails transaccionales)
BREVO_API_KEY
BREVO_SENDER_EMAIL

# Sentry (opcional pero recomendado en prod)
NEXT_PUBLIC_SENTRY_DSN
# SENTRY_AUTH_TOKEN va en Vercel y GitHub Actions secrets, NO en .env.local
# Es un Org Auth Token con scope `org:ci` que sube sourcemaps en build.

# Upstash Redis (opcional en dev — sin esto el rate limit cae a in-memory Map)
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

Para dev local con Docker, agregar al final del archivo (comentadas) las URLs alternativas:
# DATABASE_URL="postgresql://practix:practix@localhost:5433/practix"
# DIRECT_URL="postgresql://practix:practix@localhost:5433/practix"

Verifica que .gitignore excluya .env.local, .env y .env.*.local
```

---

## Paso 7: Validación de Variables de Entorno con Zod

**Prompt para la IA:**

```
Crea un validador de variables de entorno para PractiX usando Zod.

Ubicación: src/lib/env.ts

Requisitos:
- Importar z de "zod"
- Definir un schema con todas las variables del .env.example, marcando como
  optional() las que sean opcionales según el comentario del .env.example:
  - DATABASE_URL: url, requerida
  - DIRECT_URL: url, opcional
  - NEXT_PUBLIC_SUPABASE_URL: url, requerida
  - NEXT_PUBLIC_SUPABASE_ANON_KEY: string min 1, requerida
  - SUPABASE_SERVICE_KEY: string min 1, requerida
  - NEXTAUTH_URL: url, requerida
  - NEXTAUTH_SECRET: string min 32, requerida
  - GOOGLE_CLIENT_ID: string min 1, requerida
  - GOOGLE_CLIENT_SECRET: string min 1, requerida
  - HUGGINGFACE_API_KEY: string que empiece con "hf_", opcional
  - BREVO_API_KEY: string min 1, opcional
  - BREVO_SENDER_EMAIL: email, opcional
  - NEXT_PUBLIC_SENTRY_DSN: url, opcional
  - UPSTASH_REDIS_REST_URL: url, opcional
  - UPSTASH_REDIS_REST_TOKEN: string min 1, opcional

- Usar safeParse(process.env)
- Si la validación falla, throw new Error con mensaje listando los path
  de las variables faltantes o inválidas (i.path.join(".") en cada issue)
- Exportar el objeto validado como `env`

REGLA CRÍTICA: nunca acceder process.env directamente en el resto del código.
Siempre via `env` de este archivo.

Gotcha real: este throw se ejecuta durante "Collecting page data" del next build,
porque algún route.ts importa env. Eso significa que en Vercel TODAS las env vars
requeridas deben estar configuradas en Project Settings antes del primer deploy.
Si falta una, el build falla con un mensaje genérico de "Collecting page data"
sin pista del culpable. Por eso en CI usamos placeholders dummy (ver Paso 13)
que solo satisfacen Zod — los valores reales viven solo en Vercel.
```

---

## Paso 8: Docker para Desarrollo Local

**Prompt para la IA:**

```
Crea la configuración de Docker para el entorno de desarrollo de PractiX.

1. docker-compose.yml en la raíz:
   - Servicio "db": PostgreSQL 15 Alpine
     - Variables: POSTGRES_USER=practix, POSTGRES_PASSWORD=practix, POSTGRES_DB=practix
     - Puerto: 5433:5432 (5433 en el host, NO 5432 — evita choque con
       postgres local del host si lo hay)
     - Volume named: postgres_data para persistencia
   - Servicio "app": la aplicación Next.js
     - Build desde Dockerfile.dev
     - Depends_on: db
     - Ports: 3000:3000
     - Volumes: .:/app y named volume /app/node_modules (para no pisar
       node_modules del host con el bind mount)
     - env_file: .env.local
   - Volumes section: postgres_data

2. Dockerfile.dev en la raíz:
   - FROM node:20-alpine
   - Habilitar pnpm via corepack:
     RUN corepack enable && corepack prepare pnpm@latest --activate
   - WORKDIR /app
   - COPY package.json pnpm-lock.yaml ./
   - COPY prisma ./prisma   ← importante: copiar prisma/ ANTES de pnpm install
                              para que el postinstall hook (prisma generate)
                              encuentre el schema
   - RUN pnpm install
   - COPY . .
   - EXPOSE 3000
   - CMD ["pnpm", "dev"]

3. .dockerignore en la raíz:
   - node_modules, .next, .env, .env.local, .git, coverage

NOTA: con Docker se desarrolla con PostgreSQL local en puerto 5433. El
DATABASE_URL en .env.local debe apuntar a localhost:5433 (no 5432).
Supabase queda solo para producción. Ambos modos deben funcionar
cambiando solo DATABASE_URL/DIRECT_URL en .env.local.
```

---

## Paso 9: Configurar Vitest y Playwright

**Prompt para la IA:**

```
Configura Vitest y Playwright para PractiX (Next.js 16 + TypeScript).

1. Crear vitest.config.ts en la raíz:
   - Plugin de React (@vitejs/plugin-react)
   - resolve.alias: "@" → path.resolve(__dirname, "./src")
   - test.environment: "jsdom"
   - test.globals: true (para describe/it/expect sin imports)
   - test.setupFiles: ["./src/test/setup.ts"]
   - test.exclude: ["e2e/**", "node_modules", ".next", "src/test/integration/**"]
   - coverage.provider: "v8"
   - coverage.include: ["src/**/*.{ts,tsx}"]
   - coverage.exclude (TODO lo que es Next.js boilerplate o config):
     - "src/app/api/**"
     - "src/app/**/{page,layout,loading,error,not-found,template}.tsx"
     - "src/app/**/route.ts"
     - "src/app/global-error.tsx"
     - "src/proxy.ts"
     - "src/middleware.ts"
     - "src/instrumentation.ts"
     - "src/instrumentation-client.ts"
     - "src/server/lib/db.ts" (singleton Prisma — no se testea)
     - "src/lib/env.ts" (validación de env — no se testea)
     - "src/lib/constants.ts"
     - "src/lib/supabase/realtime-client.ts"
     - "src/components/providers.tsx"
     - "src/types/**"
     - "src/test/**"
     - "**/*.config.{ts,js,mjs}"
     - "**/*.d.ts"
   - coverage.thresholds: functions 100, lines 80, branches 80, statements 80
     (NB: thresholds más exigentes que el default — vienen de Fase 2 del refactor)

2. Crear src/test/setup.ts:
   - import "@testing-library/jest-dom"

3. Crear src/test/mocks/prisma.ts:
   Mock del Prisma Client para aislar unit tests. Exportar prismaMock con
   todos los modelos del proyecto. Cada modelo debe tener métodos mockeados
   con vi.fn():
     findUnique, findMany, findFirst, create, update, updateMany,
     delete, deleteMany, upsert, count, aggregate
   Modelos a mockear (conforme se vayan agregando en módulos siguientes):
     user, studentProfile, companyProfile, internship, application,
     conversation, message, interview, notification, passwordResetToken,
     aTSConfig
   En el setup inicial solo se necesitan los 5 primeros — el resto se va
   agregando en sus módulos respectivos.

4. Agregar en tsconfig.json (compilerOptions.types):
   - "vitest/globals"

5. Crear playwright.config.ts en la raíz:
   - testDir: "./e2e"
   - fullyParallel: true
   - use:
     - baseURL: "http://localhost:3000"
     - trace: "on-first-retry"
     - screenshot: "only-on-failure"
   - webServer:
     - command: "pnpm dev"
     - port: 3000
     - reuseExistingServer: !process.env.CI
   - projects: [{ name: "chromium" }]

6. Crear e2e/.gitkeep para que git trackee la carpeta vacía
```

---

## Paso 10: Inicializar Prisma 7

**Prompt para la IA:**

```
Inicializa Prisma 7 para PractiX.

1. Ejecutar:
   pnpm exec prisma init

2. Crear prisma.config.ts en la raíz (NO existe en Prisma 6 — es nuevo de v7):

   Importar defineConfig de "prisma/config" y config de "dotenv".
   Cargar .env.local con dotenv al inicio.
   Exportar default defineConfig con:
   - datasource.url: process.env.DIRECT_URL ?? process.env.DATABASE_URL

   Por qué: en Prisma 7 el `url` de este config es el que usa la CLI para
   migraciones (db push, migrate). El cliente runtime NO lo usa — lee
   DATABASE_URL del env directo.

   Supabase: DATABASE_URL apunta al pooler pgBouncer (puerto 6543) que no
   soporta todas las queries de prisma migrate. DIRECT_URL es la conexión
   directa (puerto 5432). Por eso priorizamos DIRECT_URL si existe, y caemos
   a DATABASE_URL como fallback (Docker local sólo expone una conexión directa).

   Prisma 6 tenía datasource.directUrl en el schema; Prisma 7.0 lo eliminó
   y lo movió a este config file.

3. En prisma/schema.prisma dejar SOLO el generator y el datasource. Los modelos
   se agregan en el Módulo 2.

4. Limpiar el datasource del schema.prisma — eliminar el campo `url` del bloque
   datasource. En Prisma 7 ese campo ya no se declara en el schema, está en
   prisma.config.ts.
```

---

## Paso 11: Reglas para agentes IA — `CLAUDE.md` (NO crear `AGENT.md`)

> **El histórico `AGENT.md` (singular) fue eliminado del repo el 2026-05-06**. No es estándar y no es leído por ningún agente IA moderno. La función la cubren dos archivos: `CLAUDE.md` (Anthropic Claude Code) y `AGENTS.md` (estándar industria, lo genera Next.js automáticamente).

**Prompt para la IA:**

```
Crea un archivo CLAUDE.md en la raíz del proyecto.

Este archivo define las reglas que Claude Code (y por convención cualquier
otro agente que lo lea) debe respetar al trabajar en el proyecto.

Contenido a incluir:

## Project: PractiX
Portal de prácticas laborales con matching inteligente.
Full-stack unificado en Next.js 16 (App Router) — un solo deploy en Vercel.

## Commands
Listar los comandos clave del package.json: pnpm dev, pnpm lint, pnpm test,
pnpm test:coverage, pnpm test:e2e, pnpm db:push, pnpm db:generate,
pnpm db:studio, pnpm db:seed, docker compose up

## Architecture
Documentar la regla rectora: server/services/* NO puede importar nada de
"next" ni "next/server". Si mañana migrás el backend a Express, copiás
server/ y funciona sin cambios.

Listar las capas:
- app/api/* → HTTP (recibe, valida con Zod, llama service, retorna NextResponse)
- server/services/* → lógica de negocio pura
- server/lib/* → infraestructura (db, storage, embeddings, mail, logger)
- server/validators/* → schemas Zod por endpoint
- src/lib/env.ts → variables de entorno validadas con Zod
- types/index.ts → tipos compartidos

## Auth
NextAuth.js con Google OAuth + credentials. Sesión expone session.user.id,
session.user.role (STUDENT | COMPANY), session.user.email. Protección de API
routes via requireAuth(role?) en src/server/lib/auth-guard.ts.

## AI Matching
- CV parser: pdf-parse (PDF), mammoth (DOCX)
- Embeddings: HuggingFace Inference API, modelo BAAI/bge-small-en-v1.5
  (384 dims, feature-extraction nativa)
- Similitud: cosine similarity, score 0-100
- CVs en Supabase Storage, bucket "documents"

## Methodology: SDD + TDD
Para cada service nuevo, el orden es SIEMPRE:
1. Spec SDD: definir qué hace, inputs, outputs, errores
2. Tests TDD: escribir tests ANTES de implementar (van a fallar, está bien)
3. Implementar hasta que estén en verde
4. E2E al final del proyecto, no en cada módulo

Mock de Prisma disponible en src/test/mocks/prisma.ts.

## Environment Variables
Acceder SIEMPRE via src/lib/env.ts. Nunca process.env directo en código de la app.

## Git Conventions
Conventional commits obligatorio: feat|fix|chore|docs|test|refactor.
Cada commit que modifica código debe actualizar package.json (semver) y
agregar entrada en CHANGELOG.md.

## Module Roadmap
Tabla de los módulos del proyecto (1: Setup, 2: Database, 3: Auth, ...,
14: Security) y referencia a context/project-state.md para el estado actual.

NO crear AGENT.md (singular). El archivo AGENTS.md (plural) ya fue generado
automáticamente por create-next-app@latest — no tocarlo, lo regenera Next.js.
```

---

## Paso 12: Scripts en `package.json`

**Prompt para la IA:**

```
Agrega los siguientes scripts a package.json:

"postinstall": "prisma generate"   ← se ejecuta tras cada pnpm install,
                                     regenera Prisma Client
"dev": "next dev"
"build": "next build"
"start": "next start"
"lint": "eslint"
"knip": "knip"                      ← dead code detector (Fase 4 del refactor)
"prepare": "husky"                  ← reinstala husky tras pnpm install
"db:push": "prisma db push"
"db:generate": "prisma generate"
"db:studio": "prisma studio"
"db:seed": "tsx prisma/seed.ts"
"test": "vitest"
"test:e2e": "playwright test"
"test:coverage": "vitest run --coverage"
"test:integration": "vitest run --config vitest.integration.config.ts"
"docker:dev": "docker compose up"

Verificar que tsx está instalado como devDependency (lo necesita el seed).
```

---

## Paso 13: Workflow de CI (GitHub Actions)

**Prompt para la IA:**

```
Crea .github/workflows/ci.yml para correr lint + type-check + tests + build
en cada push a main/master y cada PR a main/master.

Job "ci":
1. Checkout
2. Setup pnpm via corepack: corepack enable && corepack prepare pnpm@latest --activate
3. Setup Node 20 con cache de pnpm
4. pnpm install --frozen-lockfile
5. pnpm lint
6. pnpm exec tsc --noEmit
7. pnpm exec vitest run
8. pnpm build con env vars placeholders dummy:
     DATABASE_URL: postgresql://placeholder:placeholder@localhost:5432/placeholder
     NEXTAUTH_SECRET: placeholder-secret-min-32-chars-for-zod-validation
     NEXTAUTH_URL: http://localhost:3000
     NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
     SUPABASE_SERVICE_KEY: placeholder-service-key
     GOOGLE_CLIENT_ID: placeholder-google-client-id
     GOOGLE_CLIENT_SECRET: placeholder-google-client-secret

Job "security" (depends_on: ci):
1. pnpm install
2. pnpm audit --audit-level=moderate

Razón de los placeholders en el Build step:
- src/lib/env.ts valida process.env con Zod a module-load time
- Esa validación corre durante "Collecting page data" del next build
- Los runs de Dependabot PRs NO tienen acceso a repo secrets por GitHub
  security policy — si usas ${{ secrets.* }}, los PRs de Dependabot fallan
- Los placeholders solo satisfacen Zod, los valores reales viven en
  Vercel project settings — el build de CI nunca conecta a infra real

Configurar también .github/dependabot.yml con groups para que packages
acoplados (react/react-dom, @sentry/*, @prisma/*, vitest/@vitest/@testing-library/@playwright)
se bumpean juntos. Sin esto, Dependabot abre 1 PR por package y los tests fallan
por versiones desincronizadas (ej: react@x.y.z+1 sin react-dom igualado).
```

---

## Paso 14: Verificación

```bash
cp .env.example .env.local
# Editar .env.local con valores reales (los opcionales pueden quedar vacíos en dev)

docker compose up -d            # Levanta PostgreSQL local en 5433
pnpm db:push                    # Schema vacío al inicio — los modelos van en módulo 2
pnpm dev                        # http://localhost:3000 muestra la página default
```

Validación de tooling:

```bash
pnpm lint                       # ESLint flat config
pnpm exec tsc --noEmit          # TypeScript estricto
pnpm test                       # Vitest watch mode
pnpm knip                       # Dead code detector — debe dar 0 findings al inicio
```

---

## Checkpoint

Al final del módulo tienes:

- ✅ Next.js 16 + React 19 + TypeScript + Tailwind v4 (config CSS `@theme`, sin `tailwind.config.ts`)
- ✅ Todas las dependencias instaladas (incluyendo testing, rate limit, logger desde día 1)
- ✅ Estructura de carpetas Clean Architecture (`server/services` puro, `server/lib` infra, `app/api` delivery)
- ✅ Prisma 7 con `prisma.config.ts` (URL fuera del schema)
- ✅ Variables de entorno documentadas + validadas con Zod (falla al arrancar si falta algo)
- ✅ Husky + lint-staged + commitlint (conventional commits forzados)
- ✅ Docker Compose con PostgreSQL local en puerto 5433
- ✅ Vitest configurado con jsdom + mock de Prisma + thresholds 100% func / 80% lines-branches
- ✅ Playwright configurado para E2E
- ✅ `CLAUDE.md` para reglas de Claude Code (sin `AGENT.md` viejo); `AGENTS.md` generado por Next.js 16
- ✅ GitHub Actions CI con placeholders dummy compatibles con Dependabot
- ✅ `docs/` + `context/` + `CHANGELOG.md` creados
- ✅ App corriendo en `localhost:3000`

**Próximo módulo**: Módulo 2 — definir los 11 modelos Prisma (User, StudentProfile, CompanyProfile, Internship, Application, Conversation, Message, Interview, Notification, PasswordResetToken, ATSConfig) y conectar con Supabase.

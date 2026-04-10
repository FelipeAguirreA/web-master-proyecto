# Módulo 1: Setup del Proyecto

## Resultado Final
Proyecto Next.js 14 full-stack con Tailwind, Prisma, Docker para dev local, Husky para git hooks, validación de variables de entorno y estructura de carpetas lista para producción.

---

## Paso 1: Crear Proyecto

```bash
npx create-next-app@latest practix --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd practix
```

---

## Paso 2: Instalar Dependencias

```bash
# Auth
pnpm add next-auth

# Base de datos
pnpm add prisma @prisma/client
pnpm add @supabase/supabase-js

# UI
pnpm add lucide-react

# Validación
pnpm add zod

# Procesamiento de CVs
pnpm add pdf-parse mammoth

# Monitoreo de errores
pnpm add @sentry/nextjs

# Email
# (se usará fetch directo a la API de Brevo, no necesita SDK)

# Tipos
pnpm add -D @types/pdf-parse

# Dev tools
pnpm add -D tsx husky lint-staged @commitlint/cli @commitlint/config-conventional

# Testing (se instala en setup — los tests van en cada módulo, no al final)
pnpm add -D vitest @vitejs/plugin-react jsdom
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @playwright/test
```

---

## Paso 3: Configurar Husky + lint-staged + commitlint

**Prompt para la IA:**
```
Configura Husky, lint-staged y commitlint para PractiX.

1. Inicializar Husky:
   npx husky init

2. Crear .husky/pre-commit con:
   npx lint-staged

3. Crear .husky/commit-msg con:
   npx --no -- commitlint --edit $1

4. En package.json agregar:
   "lint-staged": {
     "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
     "*.{json,md,css}": ["prettier --write"]
   }

5. Crear commitlint.config.js en la raíz:
   module.exports = { extends: ['@commitlint/config-conventional'] }

Formato de commits aceptados (conventional commits):
  feat: nueva funcionalidad
  fix: corrección de bug
  chore: mantenimiento
  docs: documentación
  test: tests
  refactor: refactor sin cambio funcional
```

---

## Paso 4: Configurar Tailwind

**Prompt para la IA:**
```
Configura TailwindCSS para PractiX.

Requisitos para tailwind.config.ts:
- Content apuntando a src/**/*.{js,ts,jsx,tsx,mdx}
- Colores custom:
  - brand: paleta azul (50 a 950) con 600 como primario
    Usar: 50:#eef7ff 100:#d9edff 200:#bce0ff 300:#8ecdff 400:#59b0ff 
    500:#338bfc 600:#1d6cf1 700:#1555de 800:#1846b4 900:#193e8d 950:#142756
  - accent: paleta naranja (400:#fb923c 500:#f97316 600:#ea580c)
- Font family: usar Google Font "Outfit" como sans-serif principal
  con variable CSS --font-outfit

Para src/app/globals.css:
- Mantener imports de Tailwind
- Importar Google Font "Outfit" (pesos 300-800)
- Definir variable --font-outfit
- Body: font-family, antialiasing
```

---

## Paso 5: Estructura de Carpetas

**Prompt para la IA:**
```
Crea la estructura de carpetas completa para PractiX siguiendo clean architecture.

El proyecto ya existe (Next.js con App Router), solo necesito crear 
las carpetas y archivos vacíos (placeholder).

Estructura dentro de src/:

src/
├── app/                          # Páginas + API routes
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── estudiante/
│   │   └── empresa/
│   ├── practicas/
│   │   └── [id]/
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── health/               # Health check endpoint
│       ├── users/
│       │   ├── me/
│       │   └── profile/
│       │       ├── student/
│       │       └── company/
│       ├── internships/
│       │   └── [id]/
│       ├── applications/
│       │   ├── my/
│       │   └── internship/[id]/
│       └── matching/
│           ├── upload-cv/
│           └── recommendations/
│
├── server/                       # Lógica de negocio (clean architecture)
│   ├── services/                 # Servicios puros (no dependen de Next.js)
│   ├── lib/                      # Infraestructura (DB, storage, IA)
│   └── validators/               # Schemas Zod
│
├── lib/                          # Compartido frontend
│
├── components/                   # UI
│   └── ui/
│
└── types/                        # Tipos TypeScript

También crear en la raíz del proyecto:
├── docs/                         # Documentación para humanos (estos MDs)
├── context/                      # Contexto para la IA (estado del proyecto)
│   └── project-state.md          # Estado actual: módulo en curso, últimos cambios
├── AGENT.md                      # Reglas para el agente IA
└── CHANGELOG.md                  # Historial de cambios (semver)

Crea archivos placeholder vacíos donde corresponda.
NO crear los route.ts ni page.tsx todavía, solo la estructura de carpetas.
```

---

## Paso 6: Variables de Entorno

**Prompt para la IA:**
```
Crea un archivo .env.example para PractiX (proyecto Next.js unificado).

Variables necesarias:
# Base de datos (Supabase)
DATABASE_URL="postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres"

# Supabase (Storage)
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_KEY="your-supabase-service-key"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-min-32-chars"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# HuggingFace (Matching IA)
HUGGINGFACE_API_KEY="hf_xxxxxxxxxxxx"

# Brevo (Emails)
BREVO_API_KEY="xkeysib-xxxxxxxxxxxx"
BREVO_SENDER_EMAIL="noreply@practix.com"

# Sentry (Monitoreo de errores)
NEXT_PUBLIC_SENTRY_DSN="https://xxxx@xxxx.ingest.sentry.io/xxxx"
SENTRY_ORG="tu-org"
SENTRY_PROJECT="practix"

Incluye comentarios descriptivos.
También verifica que .gitignore excluya .env.local y .env
```

---

## Paso 7: Validación de Variables de Entorno con Zod

**Prompt para la IA:**
```
Crea un validador de variables de entorno para PractiX usando Zod.

Ubicación: src/lib/env.ts

Requisitos:
- Importar z de "zod"
- Definir schema con todas las variables del .env:
  - DATABASE_URL: z.string().url()
  - NEXT_PUBLIC_SUPABASE_URL: z.string().url()
  - SUPABASE_SERVICE_KEY: z.string().min(1)
  - NEXTAUTH_URL: z.string().url()
  - NEXTAUTH_SECRET: z.string().min(32)
  - GOOGLE_CLIENT_ID: z.string().min(1)
  - GOOGLE_CLIENT_SECRET: z.string().min(1)
  - HUGGINGFACE_API_KEY: z.string().startsWith("hf_")
  - BREVO_API_KEY: z.string().min(1)
  - BREVO_SENDER_EMAIL: z.string().email()
  - NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional()
- Parsear process.env con el schema
- Si la validación falla: lanzar error descriptivo listando qué variables faltan
- Exportar el objeto validado como "env"

Importar este archivo en src/server/lib/db.ts para que la validación
corra al arrancar el servidor, no en runtime.
```

---

## Paso 8: Docker para Desarrollo Local

**Prompt para la IA:**
```
Crea la configuración de Docker para el entorno de desarrollo de PractiX.

1. docker-compose.yml en la raíz:
   - Servicio "db": PostgreSQL 15 Alpine
     - Variables: POSTGRES_USER=practix, POSTGRES_PASSWORD=practix, POSTGRES_DB=practix
     - Puerto: 5432:5432
     - Volume: postgres_data para persistencia
   - Servicio "app": la aplicación Next.js
     - Build desde Dockerfile.dev
     - Depends_on: db
     - Ports: 3000:3000
     - Volumes: .:/app y /app/node_modules (para hot reload)
     - Env_file: .env.local
   - Volume: postgres_data

2. Dockerfile.dev en la raíz:
   - FROM node:20-alpine
   - Instalar pnpm con corepack
   - WORKDIR /app
   - Copiar package.json y pnpm-lock.yaml
   - RUN pnpm install
   - EXPOSE 3000
   - CMD ["pnpm", "dev"]

3. .dockerignore en la raíz:
   - node_modules, .next, .env, .env.local, .git, coverage

4. Actualizar .env.example agregando la URL local para cuando se usa Docker:
   # Para Docker local (alternativa a Supabase en dev)
   # DATABASE_URL="postgresql://practix:practix@localhost:5432/practix"

NOTA: Con Docker se puede desarrollar con PostgreSQL local y 
usar Supabase solo en producción. Ambos modos deben funcionar
cambiando solo DATABASE_URL en .env.local
```

---

## Paso 9: Configurar Vitest

**Prompt para la IA:**
```
Configura Vitest para PractiX (Next.js 14 + TypeScript).

1. Crear vitest.config.ts en la raíz:
   - Usar plugin de React (@vitejs/plugin-react)
   - environment: "jsdom"
   - globals: true (para describe/it/expect sin imports)
   - setupFiles: ["./src/test/setup.ts"]
   - Exclude: ["e2e/**", "node_modules", ".next"]
   - coverage provider: "v8"
   - coverage thresholds: functions: 80, lines: 70, branches: 70

2. Crear src/test/setup.ts:
   - import "@testing-library/jest-dom"

3. Crear src/test/mocks/prisma.ts:
   Mock del Prisma Client usando vi.mock() para aislar unit tests:
   - Exportar prismaMock con modelos: user, studentProfile, companyProfile,
     internship, application
   - Cada modelo con métodos: findUnique, findMany, create, update, delete,
     upsert como vi.fn()

4. Agregar en tsconfig.json (compilerOptions.types):
   - "vitest/globals"

5. Crear playwright.config.ts en la raíz:
   - testDir: "./e2e"
   - baseURL: "http://localhost:3000"
   - use: { trace: "on-first-retry", screenshot: "only-on-failure" }
   - webServer: { command: "pnpm dev", port: 3000, reuseExistingServer: true }
   - projects: solo chromium

6. Crear e2e/ carpeta vacía con .gitkeep
```

---

## Paso 10: AGENT.md

**Prompt para la IA:**
```
Crea un archivo AGENT.md en la raíz del proyecto.

Este archivo define las reglas para cualquier agente IA que trabaje en el proyecto.

Contenido:

# PractiX — Reglas del Agente

## Proyecto
Portal de prácticas laborales con matching inteligente.
Next.js 14 full-stack (App Router) + Prisma + Supabase + HuggingFace.

## Arquitectura
- app/api/*         → Capa HTTP (recibe, valida, delega, responde)
- server/services/* → Lógica de negocio pura (sin dependencias de Next.js)
- server/lib/*      → Infraestructura (DB, storage, IA, email)
- server/validators/→ Schemas Zod para requests

## Metodología: SDD + TDD
Para cada service nuevo, el orden es SIEMPRE:
1. Spec SDD: definir qué hace la función, inputs, outputs y errores
2. Tests TDD: escribir los tests ANTES de implementar (vitest)
3. Implementar hasta que los tests estén en verde
4. Los unit tests van en src/test/unit/{nombre}.service.test.ts

NUNCA escribir implementación antes de tener los tests.

## Reglas de Código
- TypeScript estricto en todo el proyecto
- Validación con Zod en TODOS los endpoints
- Nunca importar desde Next.js en server/services/*
- Manejo de errores consistente con NextResponse
- Variables de entorno accedidas siempre via src/lib/env.ts

## Reglas de Git
- Conventional commits OBLIGATORIO: feat|fix|chore|docs|test|refactor
- Ejemplo: "feat: agregar filtro por categoría en listado de prácticas"
- Cada commit que modifica código debe:
  1. Actualizar la versión en package.json (semver: patch/minor/major)
  2. Agregar entrada en CHANGELOG.md siguiendo https://keepachangelog.com/es

## Contexto del Proyecto
Ver context/project-state.md para el estado actual.
```

---

## Paso 11: Inicializar Prisma

```bash
pnpm exec prisma init
```

---

## Paso 12: Scripts en package.json

**Prompt para la IA:**
```
Agrega estos scripts a package.json:

"db:push": "prisma db push",
"db:generate": "prisma generate",
"db:studio": "prisma studio",
"db:seed": "tsx prisma/seed.ts",
"test": "vitest",
"test:e2e": "playwright test",
"test:coverage": "vitest run --coverage",
"docker:dev": "docker compose up"
```

```bash
pnpm add -D tsx
```

---

## Paso 13: Verificación

```bash
cp .env.example .env.local
pnpm dev
# http://localhost:3000 debe mostrar la página default de Next.js
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ Next.js 14 + TypeScript + TailwindCSS configurado
- ✅ Todas las dependencias instaladas (incluyendo testing desde el día 1)
- ✅ Estructura de carpetas clean architecture
- ✅ Prisma inicializado
- ✅ Variables de entorno documentadas y validadas con Zod
- ✅ Husky + lint-staged + commitlint configurados
- ✅ Docker Compose para dev local
- ✅ Vitest configurado con jsdom + mock de Prisma listo
- ✅ Playwright configurado para E2E
- ✅ AGENT.md con reglas del proyecto (incluye SDD + TDD)
- ✅ docs/ + context/ + CHANGELOG.md creados
- ✅ App corriendo en localhost:3000

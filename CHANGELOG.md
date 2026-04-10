# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-10

### Added

- Notificaciones por email transaccional con Brevo (nueva postulación, cambio de estado)
- Health check endpoint en `/api/health` con verificación de base de datos
- Security headers de producción (HSTS, CSP, X-Frame-Options, etc.)
- Dockerfile multi-stage optimizado para producción (imagen < 300MB)
- Pipeline CI/CD con GitHub Actions: lint, type-check, tests, build y audit de dependencias
- Script `postinstall` para generar Prisma Client automáticamente en Vercel

---

## [0.1.0] - 2026-04-09

### Added

- Setup inicial del proyecto: Next.js 16 + React 19 + TypeScript + Tailwind v4
- Estructura clean architecture: app/api → server/services → server/lib
- Dependencias: NextAuth, Prisma, Supabase, Zod, HuggingFace, Sentry, Brevo
- Husky + lint-staged + commitlint (conventional commits)
- Vitest + Testing Library + Playwright configurados
- Docker Compose con PostgreSQL 15 para desarrollo local
- Validación de variables de entorno con Zod (src/lib/env.ts)
- Prisma inicializado con datasource postgresql
- Colores brand/accent y tipografía Outfit

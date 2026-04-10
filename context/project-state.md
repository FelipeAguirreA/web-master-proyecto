# Estado del Proyecto — PractiX

## Módulo actual

**Módulo 3 — Autenticación**

## Próximo paso

NextAuth con Google OAuth + middleware de protección de rutas.

## Módulos completados

| #   | Módulo             | Estado      |
| --- | ------------------ | ----------- |
| 1   | Setup del Proyecto | ✅ Completo |
| 2   | Base de Datos      | ✅ Completo |

## Stack confirmado

- Next.js 16.2.3 + React 19 (no Next.js 14 como dice el spec original)
- pnpm como package manager
- Tailwind v4 (config vía CSS @theme, no tailwind.config.ts)
- Prisma 7 (URL en prisma.config.ts, no en schema.prisma)
- Supabase Session Pooler puerto 6543 para CLI (puerto 5432 bloqueado en red local)

## Últimos archivos creados

- prisma/schema.prisma — 5 modelos + 3 enums
- prisma.config.ts — config Prisma 7 con dotenv para .env.local
- src/server/lib/db.ts — Prisma Client singleton
- src/server/lib/storage.ts — Supabase Storage client
- src/server/validators/index.ts — 7 schemas Zod

# PractiX — Reglas del Agente

## Proyecto

Portal de prácticas laborales con matching inteligente.
Next.js 16 full-stack (App Router) + Prisma + Supabase + HuggingFace.

## Arquitectura

- app/api/\* → Capa HTTP (recibe, valida, delega, responde)
- server/services/\* → Lógica de negocio pura (sin dependencias de Next.js)
- server/lib/\* → Infraestructura (DB, storage, IA, email)
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
- Nunca importar desde Next.js en server/services/\*
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

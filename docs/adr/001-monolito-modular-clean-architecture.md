# ADR 001 — Monolito modular + Clean Architecture

- **Status**: Aceptado
- **Fecha**: 2026-04-23
- **Decisores**: equipo core

## Contexto

PractiX es un portal de prácticas laborales con matching semántico por embeddings. El equipo es chico (1 dev activo), el deploy es único en Vercel, y no hay necesidad hoy de escalar frontend y backend de forma independiente.

Al mismo tiempo, existe el riesgo de mezclar responsabilidades del framework con la lógica de dominio. Si mañana crece el producto y el backend necesita correr en otro runtime (Express, Fastify, Hono), un acoplamiento fuerte con Next.js hace esa migración muy costosa.

OWASP A04 (Insecure Design) remarca la importancia de separar responsabilidades desde el inicio para evitar decisiones apresuradas que degraden la seguridad.

## Decisión

**Monolito Next.js 16 App Router, un solo deploy en Vercel, con Clean Architecture interna estricta.**

Estructura de capas:

```
app/api/*           → HTTP delivery (parse request, Zod validation, service call, NextResponse)
server/services/*   → Lógica de negocio PURA (cero imports de next / next/server)
server/lib/*        → Infraestructura (Prisma, Supabase, HuggingFace, mail, logger)
server/validators/* → Schemas Zod centralizados
lib/*               → Compartido front+back (env validation, constants, types compartidos)
```

**Regla invariante**: `server/services/*` no puede importar de `next` ni `next/server`. Si mañana se migra el backend, se copia la carpeta `server/` a otro runtime y funciona sin cambios.

## Consecuencias

### Positivas

- Deploy simple (un único artefacto en Vercel)
- Type safety compartido entre front y back sin bundlers separados
- Cero CORS (mismo servidor)
- Un solo stream de logs / métricas / traces
- Lógica de negocio testeable de forma aislada (mock de Prisma en `src/test/mocks/prisma.ts`)
- Migración futura a otro runtime de backend es mecánica

### Negativas / riesgos

- El frontend y el backend escalan juntos — si el matching satura CPU, la UI también se degrada
- Requiere disciplina manual del equipo para no filtrar imports de `next` dentro de `server/services/*`
- Un deploy roto tira ambos (mitigable con preview deployments y CI estricto)

## Alternativas consideradas

- **Backend separado en Express/Fastify + frontend Next**: descartado por complejidad operacional (2 repos, CORS, 2 deploys, pérdida de type sharing) sin beneficio real al scale actual.
- **Dejar lógica directamente en `app/api/*`**: descartado, rompe testeabilidad y la posibilidad de migrar el backend.
- **NestJS dentro del monorepo**: overkill para un equipo chico, introduce decorators y DI que no necesitamos hoy.
- **tRPC** para compartir tipos: evaluado, pero `fetch('/api/...')` con tipos compartidos nos alcanza sin agregar dependencia.

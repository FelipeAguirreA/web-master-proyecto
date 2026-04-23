# ADR 004 — Testing strategy: pirámide

- **Status**: Aceptado (parcialmente implementado; completa cobertura en Fase 2)
- **Fecha**: 2026-04-23
- **Decisores**: equipo core

## Contexto

El proyecto ya tiene Vitest + Testing Library + Playwright instalados. Coverage thresholds actuales: 80% functions, 70% lines/branches. El NFR acordado es **100% functions, 80% lines/branches**.

Existen unit tests para `users`, `internships`, `applications`, `matching`. Faltan: `chat.service`, `interviews.service`, `ats/scoring-engine`, scorers individuales, `rate-limit`, `cv-parser`, y la mayoría de componentes.

El E2E directory (`e2e/`) tiene specs para auth guards, landing e internships, y ahora middleware. Falta cubrir flujos completos: postulación estudiante, ranking ATS empresa, reset password.

Riesgos conocidos a evitar:

- Tests que mockean tanto que no reflejan comportamiento real (ej. mock que oculta un N+1 query que falla en prod bajo carga)
- Tests de implementación (assert sobre class names, state interno, estructura HTML no semántica) que se rompen en refactors benignos
- Coverage inflado con tests triviales (`expect(fn).toBeDefined()`) que no validan comportamiento

## Decisión

**Aplicar la pirámide de testing con disciplina, enforcement en CI, y validación de comportamiento sobre implementación.**

### Distribución target

- **70% unit**: `server/services/*` y `server/lib/*`. Prisma mockeado vía `src/test/mocks/prisma.ts`. Ejecución < 10s todo el suite.
- **20% integration**: services contra Prisma real (DB efímera con Docker o PGlite). Valida queries reales, migraciones, relaciones.
- **10% E2E**: flujos críticos de usuario real, Playwright + Chromium. Ejecución < 2min todo el suite.

### Reglas

1. **Component tests** (Testing Library): testear roles ARIA y text visible — nunca class names ni estructura interna del DOM. `getByRole`, `getByText`, `getByLabelText`. Evitar `container.querySelector` salvo casos extremos.
2. **Service tests**: un test por código feliz + un test por cada branch de error + edge cases conocidos. Cero fixtures gigantes — armar el state mínimo necesario.
3. **No mockear lo que querés validar**. Si el test es sobre "los embeddings se generan al crear internship", no mockear `generateEmbedding` — mockear la API externa.
4. **TDD donde tenga sentido**: servicios nuevos siempre con spec SDD → test → impl (como dice `CLAUDE.md`). Refactors de código existente: primero test de regresión, después refactor.
5. **Coverage enforcement en CI**:

   ```ts
   // vitest.config.ts
   coverage: {
     thresholds: {
       functions: 100,
       lines: 80,
       branches: 80,
       statements: 80,
     },
   }
   ```

6. **Boy Scout**: al tocar un archivo que no tiene tests, agregarlos antes o junto al cambio.

## Consecuencias

### Positivas

- Feedback rápido: unit tests permiten refactorizar sin miedo
- Coverage meaningful (tests validan comportamiento, no detalles)
- E2E detecta regresiones de flujos antes de prod
- Subida gradual de thresholds permite migrar sin romper CI de un día para otro

### Negativas / riesgos

- Subir thresholds puede dejar CI en rojo mientras se agregan tests — mitigar subiendo en pasos (85% → 90% → 100% functions)
- Integration tests con DB real son más lentos — correr en job separado en CI si hace falta
- Disciplina requerida para no crear "tests de implementación"

## Alternativas consideradas

- **Invertir pirámide (más E2E, menos unit)**: descartado, E2E es lento, flaky, y el feedback cycle de 5 minutos destruye productividad.
- **Sin thresholds en coverage**: descartado, coverage decae con el tiempo sin enforcement.
- **Playwright Component Testing**: evaluado, por ahora Testing Library + jsdom es más que suficiente.
- **100% lines coverage**: descartado, genera tests triviales para código defensivo (early returns, guards) que no aportan valor.

# Módulo 13: Tests E2E con Playwright

## Resultado Final

Suite de tests E2E con Playwright cubriendo los flujos principales de la aplicación.

> **Nota sobre unit tests**: Los unit tests de cada service ya fueron escritos en sus respectivos módulos (4, 5, 6 y 11) siguiendo TDD. Este módulo cubre exclusivamente los tests E2E que requieren la app corriendo completa.

---

## Estado de Tests al llegar a este módulo

A esta altura ya tenés:

- ✅ `src/test/unit/users.service.test.ts` (módulo 4)
- ✅ `src/test/unit/internships.service.test.ts` (módulo 5)
- ✅ `src/test/unit/applications.service.test.ts` (módulo 6)
- ✅ `src/test/unit/matching.service.test.ts` (módulo 11)

Lo que falta son los tests E2E que verifican los flujos completos desde el browser.

---

## Estrategia de Testing

```
Pirámide de tests para PractiX:

        /\
       /E2E\         Playwright — flujos principales (este módulo)
      /------\
     /  Unit   \     Vitest — services (hecho en cada módulo)
    /------------\
```

**Regla**: los E2E testean COMPORTAMIENTO visible al usuario, no implementación.

---

## Paso 1: Tests E2E — Landing y Navegación

**Prompt para la IA:**

```
Crea los tests E2E de landing para PractiX con Playwright.

Archivo: e2e/landing.spec.ts

Tests a implementar:

describe("Landing Page"):
- "muestra el título principal de PractiX"
- "el botón CTA redirige a la página de login"
- "el listado de prácticas es visible sin estar logueado"
- "el header muestra los links de navegación correctos"
```

---

## Paso 2: Tests E2E — Autenticación

**Prompt para la IA:**

```
Crea los tests E2E de autenticación para PractiX con Playwright.

Archivo: e2e/auth.spec.ts

Tests a implementar:

describe("Autenticación"):
- "redirige a /login al intentar acceder a /dashboard sin sesión"
- "redirige a /login al intentar acceder a /dashboard/empresa sin sesión"
- "la página de login muestra el botón de Google OAuth"

NOTA importante: el flujo completo de Google OAuth no se puede automatizar
en E2E sin un mock de Google. Documentar los casos de post-login como
test.skip con comentario explicativo.
```

---

## Paso 3: Tests E2E — Listado de Prácticas

**Prompt para la IA:**

```
Crea los tests E2E para el listado de prácticas de PractiX con Playwright.

Archivo: e2e/internships.spec.ts

Prerequisito: la app debe tener datos (correr pnpm db:seed antes).

Tests a implementar:

describe("Listado de Prácticas"):
- "el listado carga y muestra prácticas"
- "el filtro por título funciona — escribe 'React' y filtra los resultados"
- "el filtro por modalidad funciona"
- "la paginación funciona (página siguiente carga más resultados)"
- "hacer click en una práctica navega a la página de detalle"
- "la página de detalle muestra título, empresa y descripción"

Usar page.goto(), page.getByText(), page.getByRole(), page.fill(),
expect(page).toHaveURL(), page.waitForLoadState().
```

---

## Paso 4: Tests E2E — Componente InternshipCard

**Prompt para la IA:**

```
Crea tests de componente para InternshipCard de PractiX.

Archivo: src/test/components/InternshipCard.test.tsx

El componente InternshipCard recibe una práctica y la renderiza.

Tests a implementar:

describe("InternshipCard"):
- "renderiza el título de la práctica"
- "renderiza el nombre de la empresa"
- "muestra el matchScore cuando se provee y es mayor a 0"
- "muestra el score redondeado al entero más cercano"
- "no muestra el matchScore cuando es undefined"
- "no muestra el matchScore cuando es null"
- "no muestra el matchScore cuando es 0"
- "aplica color verde para score >= 70"
- "aplica color amarillo para score entre 40 y 69"
- "aplica color rojo para score menor a 40"
- "renderiza las skills de la práctica"
- "muestra la etiqueta de modalidad correcta (Remoto / Presencial / Híbrido)"

Para testear las clases del badge usar: screen.getByText("70%").closest("span")
No usar .parentElement — sube un nivel de más al div contenedor.

Usar Testing Library: render(), screen.getByText(), screen.getByRole(),
expect(...).toBeInTheDocument().
```

---

## Paso 5: Correr la Suite Completa

```bash
# Unit tests (rápidos, sin app corriendo)
pnpm test

# Unit tests con coverage — verificar que supera los thresholds
pnpm test:coverage

# E2E (requiere la app corriendo)
pnpm dev &
pnpm test:e2e

# Ver reporte de Playwright
npx playwright show-report
```

---

## Checkpoint

Al final del módulo tienes:

- ✅ E2E: landing y navegación
- ✅ E2E: auth redirect (sin sesión → login)
- ✅ E2E: listado de prácticas con filtros y paginación
- ✅ Tests de componente: InternshipCard
- ✅ Coverage de unit tests por encima de los thresholds
- ✅ Toda la pirámide de tests cubierta

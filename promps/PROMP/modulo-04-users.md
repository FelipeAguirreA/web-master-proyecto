# Módulo 4: API - Usuarios y Perfiles

## Resultado Final
Services y API routes para obtener y actualizar perfiles de usuario.

---

## Paso 0: Correcciones previas al entorno de tests

Antes de escribir cualquier test, verificar y corregir dos problemas del setup inicial:

**1. Bug en el mock de Prisma**

En `src/test/mocks/prisma.ts`, el `vi.mock` exporta `db` en lugar de `prisma`.
Como `src/server/lib/db.ts` exporta `prisma`, todos los tests fallan si no se corrige.
Cambiar:
```
vi.mock("@/server/lib/db", () => ({ db: prismaMock }))
            →
vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }))
```

**2. Alias `@` faltante en vitest.config.ts**

Vitest no lee el `tsconfig.json` para resolver paths. Sin el alias, cualquier import
`@/...` en los tests falla con "Failed to resolve import".

**Prompt para la IA:**
```
Actualizá vitest.config.ts para agregar el alias @ que resuelva a ./src.
Importar path de node y usar resolve.alias: { "@": path.resolve(__dirname, "./src") }
```

---

## Paso 1: Especificación SDD — Users Service

**Prompt para la IA:**
```
Crea la especificación SDD para el users service de PractiX.

Ubicación: docs/specs/users.service.spec.md

Para cada función documenta:
- Propósito (una línea)
- Parámetros con tipos
- Retorno con tipo
- Casos de error (qué lanza y cuándo)
- Casos borde a considerar

Funciones a especificar:
1. getUserWithProfile(userId: string)
2. updateStudentProfile(userId: string, data: StudentProfileInput)
3. updateCompanyProfile(userId: string, data: CompanyProfileInput)

No escribas código de implementación, solo la especificación en markdown.
```

---

## Paso 2: Tests TDD — Users Service

> Escribí los tests ANTES de implementar el service. Van a fallar hasta que implementes.

**Prompt para la IA:**
```
Crea los unit tests para el users service de PractiX siguiendo TDD.
Basate en la spec de docs/specs/users.service.spec.md.

Archivo: src/test/unit/users.service.test.ts

Usar vi.mock() para "@/server/lib/db" → prismaMock de src/test/mocks/prisma.ts

Tests a implementar:

describe("getUserWithProfile"):
- "retorna el usuario con sus perfiles cuando existe"
- "retorna null cuando el usuario no existe"
- "incluye studentProfile y companyProfile en la respuesta"

describe("updateStudentProfile"):
- "actualiza y retorna el perfil del estudiante"
- "solo actualiza el perfil del userId provisto"

describe("updateCompanyProfile"):
- "actualiza y retorna el perfil de la empresa"
- "solo actualiza el perfil del userId provisto"

IMPORTANTE: los tests van a fallar (el archivo del service no existe aún).
Ese es el comportamiento correcto en TDD — rojo primero.
```

```bash
pnpm test  # deben fallar — está bien
```

---

## Paso 3: Users Service

**Prompt para la IA:**
```
Crea el servicio de usuarios para PractiX.

Ubicación: src/server/services/users.service.ts

Este servicio contiene la lógica de negocio PURA.
NO importa nada de Next.js. Solo usa prisma y tipos.

Funciones:

1. getUserWithProfile(userId: string):
   - Buscar usuario por id
   - Include: studentProfile y companyProfile
   - Retorna el usuario completo o null

2. updateStudentProfile(userId: string, data):
   - data validado con studentProfileSchema (pero no validar aquí, 
     validar en el route handler)
   - Actualizar StudentProfile donde userId = userId
   - Retornar perfil actualizado

3. updateCompanyProfile(userId: string, data):
   - Igual que el anterior pero con CompanyProfile
   - Retornar perfil actualizado

Importar prisma desde '../lib/db'.
Exportar todas las funciones.
```

---

```bash
pnpm test  # ahora deben pasar
```

---

## Paso 4: API Route - GET /api/users/me

**Prompt para la IA:**
```
Crea el route handler para obtener el perfil del usuario actual.

Ubicación: src/app/api/users/me/route.ts

Endpoint: GET /api/users/me

Lógica:
- Llamar requireAuth() (sin rol específico, cualquier usuario autenticado)
- Si no autenticado → retornar error
- Llamar getUserWithProfile(user.id)
- Si no existe → 404
- Retornar el usuario con NextResponse.json

Importar:
- requireAuth desde '@/server/lib/auth-guard'
- getUserWithProfile desde '@/server/services/users.service'
- NextResponse desde 'next/server'

Envolver en try/catch. En caso de error → 500.
```

---

## Paso 5: API Route - PUT /api/users/profile/student

**Prompt para la IA:**
```
Crea el route handler para actualizar perfil de estudiante.

Ubicación: src/app/api/users/profile/student/route.ts

Endpoint: PUT /api/users/profile/student

Lógica:
- requireAuth('STUDENT')
- Parsear body con request.json()
- Validar con studentProfileSchema.parse(body)
- Llamar updateStudentProfile(user.id, validatedData)
- Retornar perfil actualizado

Manejo de errores:
- Si ZodError → 400 con detalles de validación
- Si otro error → 500
```

---

## Paso 6: API Route - PUT /api/users/profile/company

**Prompt para la IA:**
```
Crea el route handler para actualizar perfil de empresa.

Ubicación: src/app/api/users/profile/company/route.ts

Endpoint: PUT /api/users/profile/company

Misma lógica que el anterior pero:
- requireAuth('COMPANY')
- Validar con companyProfileSchema
- Llamar updateCompanyProfile
```

---

## Paso 7: Verificación

```bash
pnpm dev

# Primero hacer login con Google en el browser para crear sesión

# Verificar en Prisma Studio que el usuario existe
pnpm db:studio

# Probar API routes desde el browser (ya tienes cookie de sesión):
# GET http://localhost:3000/api/users/me
# Debe retornar tu usuario con studentProfile
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ Spec SDD de users.service documentada
- ✅ Unit tests escritos y en verde
- ✅ users.service.ts con lógica de negocio pura
- ✅ GET /api/users/me (perfil actual)
- ✅ PUT /api/users/profile/student (actualizar perfil estudiante)
- ✅ PUT /api/users/profile/company (actualizar perfil empresa)
- ✅ Validación Zod en todos los endpoints
- ✅ Protección por rol con requireAuth

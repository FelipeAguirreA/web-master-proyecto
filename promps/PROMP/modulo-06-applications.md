# Módulo 6: API - Postulaciones

## Resultado Final
Sistema de postulaciones con estados, verificación de duplicados y ownership.

---

## Paso 0: Especificación SDD — Applications Service

**Prompt para la IA:**
```
Crea la especificación SDD para el applications service de PractiX.

Ubicación: docs/specs/applications.service.spec.md

Para cada función documenta:
- Propósito (una línea)
- Parámetros con tipos
- Retorno con tipo
- Casos de error (qué lanza y cuándo)
- Reglas de negocio (duplicados, ownership, estados válidos)

Funciones a especificar:
1. applyToInternship(studentUserId, internshipId, coverLetter?)
2. getMyApplications(studentUserId)
3. getApplicantsByInternship(internshipId, companyUserId)
4. updateApplicationStatus(applicationId, status)

No escribas código de implementación, solo la especificación en markdown.
```

---

## Paso 1: Tests TDD — Applications Service

> Este service tiene las reglas de negocio más críticas del sistema (duplicados, ownership). Los tests aquí son especialmente importantes.

**Prompt para la IA:**
```
Crea los unit tests para el applications service de PractiX siguiendo TDD.
Basate en la spec de docs/specs/applications.service.spec.md.

Archivo: src/test/unit/applications.service.test.ts

Mockear solo "@/server/lib/db" → prismaMock de src/test/mocks/prisma.ts

NOTA: NO mockear "@/server/lib/mail" — ese módulo se implementa en Módulo 12.
El service deja un TODO comment para ese punto.

Tests a implementar:

describe("applyToInternship"):
- "lanza error si la práctica no existe"
- "lanza error si la práctica está inactiva"
- "lanza error si el estudiante ya está postulado"
- "crea la postulación correctamente cuando todo es válido"

Para simular duplicado de Prisma:
prismaMock.application.create.mockRejectedValue(
  Object.assign(new Error(), { code: "P2002" })
)

describe("getApplicantsByInternship"):
- "lanza error si el usuario no es dueño de la práctica"
- "retorna postulantes ordenados por matchScore descendente"

describe("updateApplicationStatus"):
- "lanza error si la postulación no existe"
- "actualiza el estado correctamente"
```

```bash
pnpm test  # deben fallar — está bien
```

---

## Paso 2: Applications Service

**Prompt para la IA:**
```
Crea el servicio de postulaciones para PractiX.

Ubicación: src/server/services/applications.service.ts

Lógica de negocio PURA. No importa nada de Next.js.

Funciones:

1. applyToInternship(studentUserId: string, internshipId: string, coverLetter?: string):
   - Buscar práctica con findUnique por id
   - Si no existe → lanzar Error('Internship not found')
   - Si isActive es false → lanzar Error('Internship is not active')
   - Intentar crear application con studentId, internshipId, coverLetter, matchScore: null
   - Si Prisma lanza P2002 (unique constraint) → lanzar Error('Already applied')
   - NOTA: matchScore se calculará en módulo 11. Por ahora guardar como null
     Dejar comentario: // TODO: calcular matchScore con embeddings (módulo 11)
   - Retornar la application creada

   NOTA: No se usa findUnique previo para verificar duplicado — se deja que la
   constraint de BD lo capture (P2002) para evitar race conditions.

2. getMyApplications(studentUserId: string):
   - findMany donde studentId = studentUserId
   - Include: internship con company (companyName, logo)
   - OrderBy: createdAt desc
   - Retornar array

3. getApplicantsByInternship(internshipId: string, companyUserId: string):
   - Buscar CompanyProfile del usuario (findUnique por userId)
   - Si no existe → lanzar Error('Not found or not authorized')
   - Buscar Internship con findFirst donde id AND companyId coincidan
   - Si no existe → lanzar Error('Not found or not authorized')
   - findMany applications de esa práctica
   - Include: student con name, email, image, studentProfile
   - OrderBy: matchScore desc
   - Retornar array

4. updateApplicationStatus(applicationId: string, status: string):
   - Buscar application con findUnique por id
   - Si no existe → lanzar Error('Application not found')
   - Actualizar con el nuevo status
   - Retornar application actualizada

Importar prisma desde '../lib/db'.
Agregar al inicio: // TODO: importar mail functions desde @/server/lib/mail (módulo 12)
```

---

```bash
pnpm test  # ahora deben pasar
```

---

## Paso 3: API Route - POST y GET /api/applications

**Prompt para la IA:**
```
Crea el route handler para postulaciones.

Ubicación: src/app/api/applications/route.ts

POST /api/applications:
- requireAuth('STUDENT')
- Validar body con applySchema
- Llamar applyToInternship(user.id, data.internshipId, data.coverLetter)
- Retornar 201
- Catch: si "Already applied" → 409, si otro → 500
```

---

## Paso 4: API Route - GET /api/applications/my

**Prompt para la IA:**
```
Crea el route handler para obtener mis postulaciones.

Ubicación: src/app/api/applications/my/route.ts

GET /api/applications/my:
- requireAuth('STUDENT')
- Llamar getMyApplications(user.id)
- Retornar array
```

---

## Paso 5: API Route - GET /api/applications/internship/[id]

**Prompt para la IA:**
```
Crea el route handler para ver postulantes de una práctica.

Ubicación: src/app/api/applications/internship/[id]/route.ts

GET /api/applications/internship/[id]:
- requireAuth('COMPANY')
- Extraer id de params (async, igual que módulo 5)
- Llamar getApplicantsByInternship(id, user.id)
- Retornar array
- Catch: si error instanceof Error → 404 con el mensaje

Usar type RouteParams = { params: Promise<{ id: string }> }
```

---

## Paso 6: API Route - PATCH estado

**Prompt para la IA:**
```
Crea el route handler para cambiar estado de una postulación.

Ubicación: src/app/api/applications/[id]/route.ts

PATCH /api/applications/[id]:
- requireAuth('COMPANY')
- Extraer id de params (async, igual que módulo 5)
- Validar body con updateStatusSchema
- Llamar updateApplicationStatus(id, data.status)
- Retornar application actualizada
- Catch: ZodError → 400, Error → 404, otro → 500

Usar type RouteParams = { params: Promise<{ id: string }> }
```

---

## Paso 7: Verificación

```bash
pnpm dev

# Hacer login como estudiante en el browser
# Usar las cookies de sesión para probar

# O verificar con Prisma Studio:
pnpm db:studio
# Crear una application manualmente y verificar los queries
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ Spec SDD de applications.service documentada
- ✅ Unit tests escritos y en verde (duplicados, ownership)
- ✅ applications.service.ts con lógica de negocio pura
- ✅ POST /api/applications (postularse, sin duplicados)
- ✅ GET /api/applications/my (mis postulaciones)
- ✅ GET /api/applications/internship/:id (ver postulantes)
- ✅ PATCH /api/applications/:id (cambiar estado)
- ✅ Validación de ownership en endpoints de empresa
- ✅ **API BACKEND COMPLETO** (falta matching IA en módulo 11) 🎉

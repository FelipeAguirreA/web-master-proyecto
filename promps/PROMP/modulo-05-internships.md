# Módulo 5: API - Prácticas CRUD

## Resultado Final
CRUD completo de prácticas con filtros, búsqueda y paginación.

---

## Paso 0: Actualizar el mock de Prisma

Antes de escribir los tests, agregar `findFirst` y `count` al mock base.
Sin estos métodos los tests de `listInternships` y `deleteInternship` fallan.

**Prompt para la IA:**
```
En src/test/mocks/prisma.ts, agregá findFirst y count a la función createModelMock().
```

---

## Paso 1: Especificación SDD — Internships Service

**Prompt para la IA:**
```
Crea la especificación SDD para el internships service de PractiX.

Ubicación: docs/specs/internships.service.spec.md

Para cada función documenta:
- Propósito (una línea)
- Parámetros con tipos
- Retorno con tipo y estructura exacta
- Casos de error (qué lanza y cuándo)
- Reglas de negocio (ownership, soft delete, etc.)

Funciones a especificar:
1. listInternships(filters)
2. getInternshipById(id)
3. createInternship(companyUserId, data)
4. updateInternship(internshipId, companyUserId, data)
5. deleteInternship(internshipId, companyUserId)

No escribas código de implementación, solo la especificación en markdown.
```

---

## Paso 2: Tests TDD — Internships Service

> Escribí los tests ANTES de implementar el service.

**Prompt para la IA:**
```
Crea los unit tests para el internships service de PractiX siguiendo TDD.
Basate en la spec de docs/specs/internships.service.spec.md.

Archivo: src/test/unit/internships.service.test.ts

Mockear "@/server/lib/db" con prismaMock de src/test/mocks/prisma.ts.

Tests a implementar:

describe("listInternships"):
- "retorna prácticas paginadas con total y totalPages"
- "filtra por area cuando se provee"
- "filtra por search en título y descripción"
- "solo retorna prácticas activas (isActive: true)"

describe("getInternshipById"):
- "retorna la práctica con datos de la empresa cuando existe"
- "retorna null cuando no existe"

describe("createInternship"):
- "lanza error si el usuario no tiene CompanyProfile"
- "crea y retorna la práctica con companyId correcto"

describe("deleteInternship"):
- "lanza error si el usuario no es dueño de la práctica"
- "hace soft delete (isActive: false) en lugar de borrar"
```

```bash
pnpm test  # deben fallar — está bien
```

---

## Paso 3: Internships Service

**Prompt para la IA:**
```
Crea el servicio de prácticas laborales para PractiX.

Ubicación: src/server/services/internships.service.ts

Lógica de negocio PURA. No importa nada de Next.js.

Funciones:

1. listInternships(filters: { area?, location?, modality?, search?, page, limit }):
   - Construir objeto where:
     - isActive: true siempre
     - Si area → area: exacto
     - Si location → location: { contains, mode: 'insensitive' }
     - Si modality → modality: exacto
     - Si search → OR: [title contains insensitive, description contains insensitive]
   - Ejecutar findMany con:
     - where, include company (companyName, logo)
     - orderBy createdAt desc
     - skip: (page-1) * limit, take: limit
   - Ejecutar count con mismo where (en paralelo con Promise.all)
   - Retornar { internships, total, page, totalPages: Math.ceil(total/limit) }

2. getInternshipById(id: string):
   - findUnique con include company (companyName, logo, industry, website)
   - Retornar internship o null

3. createInternship(companyUserId: string, data):
   - Buscar CompanyProfile donde userId = companyUserId
   - Si no existe → lanzar Error('Company profile required')
   - Crear internship con companyId = company.id
   - Por ahora embedding como array vacío [] (se agrega en módulo 11)
     Dejar comentario: // TODO: generateEmbedding en módulo 11
   - Retornar internship creada

4. updateInternship(internshipId: string, companyUserId: string, data):
   - Buscar CompanyProfile del usuario
   - Buscar internship donde id = internshipId AND companyId = company.id
   - Si no existe → lanzar Error('Not found or not authorized')
   - Actualizar y retornar

5. deleteInternship(internshipId: string, companyUserId: string):
   - Misma verificación de ownership
   - Soft delete: update isActive = false
   - Retornar { success: true }

Importar prisma desde '../lib/db'.
```

---

```bash
pnpm test  # ahora deben pasar
```

---

## Paso 4: API Route - GET /api/internships

**Prompt para la IA:**
```
Crea el route handler para listar prácticas con filtros.

Ubicación: src/app/api/internships/route.ts

Endpoints: GET y POST

GET /api/internships:
- Público (NO requiere auth)
- Extraer query params de request.nextUrl.searchParams
- Validar con filterInternshipSchema.parse()
- Llamar listInternships(validatedFilters)
- Retornar resultado

POST /api/internships:
- requireAuth('COMPANY')
- Parsear y validar body con createInternshipSchema
- Llamar createInternship(user.id, validatedData)
- Retornar 201 con la práctica

Manejo de errores en ambos:
- ZodError → 400
- Error con mensaje → 400 con el mensaje
- Otro → 500
```

---

## Paso 5: API Route - GET/PUT/DELETE /api/internships/[id]

**Prompt para la IA:**
```
Crea el route handler para operaciones sobre una práctica específica.

Ubicación: src/app/api/internships/[id]/route.ts

GET /api/internships/[id]:
- Público
- Extraer id de params
- Llamar getInternshipById(id)
- Si no existe → 404
- Retornar internship

PUT /api/internships/[id]:
- requireAuth('COMPANY')
- Validar body con createInternshipSchema.partial()
- Llamar updateInternship(id, user.id, data)
- Retornar actualizada (catch error → 404 o 500)

DELETE /api/internships/[id]:
- requireAuth('COMPANY')
- Llamar deleteInternship(id, user.id)
- Retornar { success: true }

En Next.js 15+ los params son async (Promise). Usar esta firma en todos los handlers:
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  ...
}

Definir un tipo auxiliar al inicio del archivo para no repetir:
type RouteParams = { params: Promise<{ id: string }> }
```

---

## Paso 6: Seed de Datos

**Prompt para la IA:**
```
Crea un script de seed para popular la base de datos con datos de ejemplo.

Ubicación: prisma/seed.ts

Datos:

1. Usuario empresa "TechCorp" (COMPANY) con CompanyProfile:
   - industry: "Tecnología", website: "https://techcorp.cl"

2. Usuario empresa "StartupX" (COMPANY) con CompanyProfile:
   - industry: "Fintech", website: "https://startupx.cl"

3. Usuario estudiante "María García" (STUDENT) con StudentProfile:
   - university: "Universidad de Chile", career: "Ing. Informática"
   - skills: ["React", "TypeScript", "Node.js", "Python"]

4. 6 prácticas variadas (3 por empresa):
   - "Practicante Desarrollo Web Frontend" (Ingeniería, Remoto, Santiago)
     skills: ["React", "TypeScript", "TailwindCSS"]
   - "Practicante Data Science" (Datos, Híbrido, Santiago)
     skills: ["Python", "SQL", "Pandas", "Machine Learning"]
   - "Practicante UX/UI Design" (Diseño, Presencial, Valparaíso)
     skills: ["Figma", "Adobe XD", "Prototyping"]
   - "Practicante Marketing Digital" (Marketing, Remoto, Santiago)
     skills: ["Google Ads", "Meta Ads", "Analytics", "SEO"]
   - "Practicante Backend Engineer" (Ingeniería, Remoto, Concepción)
     skills: ["Node.js", "PostgreSQL", "Docker", "APIs REST"]
   - "Practicante Finanzas" (Finanzas, Presencial, Santiago)
     skills: ["Excel avanzado", "Python", "Análisis financiero"]

Cada práctica con: descripción realista (2-3 oraciones), duration "3 meses" o "6 meses",
requirements (2-3 strings), embedding vacío [].

Usar upsert para evitar duplicados (con IDs fijos como "seed-int-1", etc.).
NO usar $transaction — PgBouncer en modo transacción tiene restricciones.
Mostrar console.log de lo creado.

IMPORTANTE: El seed crea su propio PrismaClient con el adapter directamente
(igual que db.ts), ya que el alias @/ no funciona en tsx fuera de Next.js.
Cargar dotenv al inicio: config({ path: ".env.local" })
```

```bash
pnpm db:seed
```

---

## Paso 7: Verificación

```bash
pnpm dev

# Listar prácticas (público)
curl http://localhost:3000/api/internships
# → { internships: [...], total: 6, page: 1, totalPages: 1 }

# Filtrar
curl "http://localhost:3000/api/internships?area=Ingeniería"
curl "http://localhost:3000/api/internships?search=react"
curl "http://localhost:3000/api/internships?modality=REMOTE"

# Detalle
curl http://localhost:3000/api/internships/<id>

# Verificar en Prisma Studio
pnpm db:studio
```

---

## Checkpoint

Al final del módulo tienes:
- ✅ Spec SDD de internships.service documentada
- ✅ Unit tests escritos y en verde
- ✅ internships.service.ts con lógica de negocio pura
- ✅ GET /api/internships (público, con filtros y paginación)
- ✅ GET /api/internships/:id (público)
- ✅ POST /api/internships (solo empresa)
- ✅ PUT /api/internships/:id (solo dueño)
- ✅ DELETE /api/internships/:id (soft delete, solo dueño)
- ✅ Seed con 6 prácticas de ejemplo

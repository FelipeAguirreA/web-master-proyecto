# Spec: Internships Service

## listInternships(filters)

**Propósito**: Listar prácticas activas con filtros opcionales y paginación.

**Parámetros**:
- `filters.area?: string` — filtro exacto por área
- `filters.location?: string` — filtro parcial insensible a mayúsculas
- `filters.modality?: "REMOTE" | "ONSITE" | "HYBRID"` — filtro exacto
- `filters.search?: string` — busca en título y descripción (OR, insensible)
- `filters.page: number` — página actual (mínimo 1)
- `filters.limit: number` — resultados por página (máximo 50)

**Retorno**: `{ internships: Internship[], total: number, page: number, totalPages: number }`

**Reglas de negocio**:
- Solo retorna prácticas con `isActive: true`
- Incluye datos de la empresa (`companyName`, `logo`)
- Ordenado por `createdAt` descendente
- `total` y `internships` se obtienen en paralelo con `Promise.all`

**Casos borde**:
- Sin filtros → retorna todas las activas paginadas
- `totalPages = Math.ceil(total / limit)`

---

## getInternshipById(id: string)

**Propósito**: Obtener el detalle de una práctica por ID.

**Parámetros**:
- `id: string` — ID de la práctica

**Retorno**: `Internship & { company: CompanyProfile }` | `null`

**Reglas de negocio**:
- Incluye datos completos de la empresa (`companyName`, `logo`, `industry`, `website`)

**Casos borde**:
- Si no existe → retorna `null`

---

## createInternship(companyUserId: string, data)

**Propósito**: Crear una nueva práctica para la empresa del usuario autenticado.

**Parámetros**:
- `companyUserId: string` — ID del usuario con rol COMPANY
- `data` — campos validados por `createInternshipSchema`

**Retorno**: `Internship` recién creada

**Casos de error**:
- Si el usuario no tiene `CompanyProfile` → lanza `Error('Company profile required')`

**Reglas de negocio**:
- `companyId` se resuelve a partir del `CompanyProfile` del usuario
- `embedding` se inicializa como `[]` (se genera en Módulo 11)

---

## updateInternship(internshipId: string, companyUserId: string, data)

**Propósito**: Actualizar una práctica verificando que el usuario sea el dueño.

**Parámetros**:
- `internshipId: string` — ID de la práctica a actualizar
- `companyUserId: string` — ID del usuario que intenta actualizar
- `data` — campos parciales validados

**Retorno**: `Internship` actualizada

**Casos de error**:
- Si la práctica no existe o el usuario no es dueño → lanza `Error('Not found or not authorized')`

**Reglas de negocio**:
- La verificación de ownership compara `companyId` de la práctica con el `id` del `CompanyProfile` del usuario

---

## deleteInternship(internshipId: string, companyUserId: string)

**Propósito**: Eliminar (soft delete) una práctica verificando ownership.

**Parámetros**:
- `internshipId: string` — ID de la práctica
- `companyUserId: string` — ID del usuario que intenta eliminar

**Retorno**: `{ success: true }`

**Casos de error**:
- Si la práctica no existe o el usuario no es dueño → lanza `Error('Not found or not authorized')`

**Reglas de negocio**:
- No elimina el registro — hace soft delete: `isActive = false`
- Un registro con `isActive: false` no aparece en `listInternships`

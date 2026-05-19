# Spec: Internships Service

## Regla transversal: dos estados ortogonales (desde 1.13.0)

`Internship` tiene dos flags que NO colapsan:

- **`isActive: Boolean`** — flag de "gestión". `true` = reclutando; `false` = "Finalizada" (la empresa cerró el reclutamiento, sigue visible para auditoría/histórico).
- **`deletedAt: DateTime?`** — soft delete real. `null` = viva; `not null` = "Eliminada" por la empresa (no aparece en listados públicos; el owner sí la ve en tab "Eliminadas" del dashboard).

Listados públicos filtran AMBOS: `isActive: true` + `deletedAt: null`. Acciones destructivas (`update`, `apply`, `score`) filtran `deletedAt: null` para evitar mutar archivos.

---

## listInternships(filters)

**Propósito**: Listar prácticas públicas (vivas, activas, de empresas aprobadas) con filtros opcionales y paginación.

**Parámetros**:

- `filters.area?: string` — filtro exacto por área
- `filters.location?: string` — filtro parcial insensible a mayúsculas
- `filters.modality?: "REMOTE" | "ONSITE" | "HYBRID"` — filtro exacto
- `filters.search?: string` — busca en título y descripción (OR, insensible)
- `filters.page: number` — página actual (mínimo 1)
- `filters.limit: number` — resultados por página (máximo 50)

**Retorno**: `{ internships: Internship[], total: number, page: number, totalPages: number }`

**Reglas de negocio**:

- Solo retorna prácticas con `isActive: true` + `deletedAt: null` + `company.companyStatus: "APPROVED"`
- Incluye datos de la empresa (`companyName`, `logo`)
- Ordenado por `createdAt` descendente
- `total` y `internships` se obtienen en paralelo con `Promise.all`

**Casos borde**:

- Sin filtros → retorna todas las activas paginadas
- `totalPages = Math.ceil(total / limit)`

---

## getInternshipById(id: string, ownerUserId?: string)

**Propósito**: Obtener el detalle de una práctica por ID. Visibilidad pública vs visibilidad del owner se resuelven en una sola query.

**Parámetros**:

- `id: string` — ID de la práctica
- `ownerUserId?: string` — opcional. Si se pasa, además del público se considera visible cualquier práctica del owner (incluidas eliminadas / empresa PENDING).

**Retorno**: `Internship & { company: CompanyProfile }` | `null`

**Reglas de negocio**:

- **Sin `ownerUserId`** (visitante / estudiante): solo visible si `isActive: true` + `deletedAt: null` + `company.companyStatus: "APPROVED"`. Espejo del filtro del listado: una práctica soft-deleted o de empresa PENDING/REJECTED debe ser invisible incluso accediendo por URL directa.
- **Con `ownerUserId`** (empresa entrando a su propio ATS): la query usa `OR: [publicVisible, ownedByMe]`. Permite a la empresa entrar al detalle/ATS de prácticas borradas o aún no aprobadas (archivo histórico de postulantes + embedding).
- Incluye datos completos de la empresa (`companyName`, `logo`, `industry`, `website`, `description`).

**Casos borde**:

- Si no existe → retorna `null`
- Owner accede a práctica de otra empresa → no matchea `ownedByMe`, cae en filtro público

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
- `embedding` se genera con `generateEmbedding(title + description + skills.join(" "))` y se persiste junto con el create

---

## updateInternship(internshipId: string, companyUserId: string, data)

**Propósito**: Actualizar una práctica viva del owner, con un gate de fairness para postulantes y regeneración inteligente del embedding.

**Parámetros**:

- `internshipId: string` — ID de la práctica a actualizar
- `companyUserId: string` — ID del usuario que intenta actualizar
- `data` — campos parciales validados

**Retorno**: `Internship` actualizada

**Casos de error**:

- Si la práctica no existe, no es del owner, o está soft-deleted → lanza `Error('Not found or not authorized')`
- Si hay >=1 `Application` y el edit toca cualquier campo distinto de `isActive` → lanza `Error(APPLICATIONS_EXIST_MESSAGE)` (exportado del módulo). La route mapea ese mensaje a `409 APPLICATIONS_EXIST`.

**Reglas de negocio**:

- **Ownership**: la verificación compara `companyId` de la práctica con el `id` del `CompanyProfile` del usuario.
- **Gate de fairness** (desde 1.13.0): se prohíbe editar contenido si hay >=1 postulante. Razón: los postulantes ya fueron scoreados contra el embedding actual y leyeron descripción/skills actuales — cambiarlas sería injusto.
- **Excepción al gate**: si el `data` solo contiene `isActive` (toggle finalizar/reactivar), el gate NO aplica. Finalizar/reactivar es acción de gestión, no edit de contenido.
- **Regen embedding inteligente**: si cambiaron `title`, `description` o `skills`, se regenera el embedding antes del `update`. Diff REAL contra `existing` (no `!== undefined`) porque el form manda todos los campos en cada PUT. Para `skills` se usa `JSON.stringify` (reorder cuenta — afecta el texto `skills.join(" ")` del embedding).
- Filtra `deletedAt: null` en el `findFirst` para impedir editar archivos.

---

## deleteInternship(internshipId: string, companyUserId: string)

**Propósito**: Marcar una práctica como eliminada (soft delete real con timestamp) verificando ownership.

**Parámetros**:

- `internshipId: string` — ID de la práctica
- `companyUserId: string` — ID del usuario que intenta eliminar

**Retorno**: `{ success: true }`

**Casos de error**:

- Si la práctica no existe, no es del owner, o ya fue soft-deleted → lanza `Error('Not found or not authorized')`

**Reglas de negocio**:

- **Soft delete real** (desde 1.13.0): setea `deletedAt = new Date()`. NO modifica `isActive` — los dos campos son ortogonales.
- La práctica eliminada desaparece de `listInternships` (filtro público), pero sigue accesible al owner via `getInternshipById(id, ownerUserId)` y vía `GET /api/company/internships?includeDeleted=1` (tab "Eliminadas").
- Cascadas FK intactas: postulantes, mensajes, entrevistas, scores quedan asociados al archivo histórico. Purge físico futuro queda como cron opcional (`deleteMany` sobre `deletedAt < now() - 90d`).

---

## getCompanyInternships(companyUserId: string, opts?: { includeDeleted?: boolean })

**Propósito**: Listar prácticas de la empresa del owner para su dashboard, con opt-in para incluir las soft-deleted.

**Parámetros**:

- `companyUserId: string` — ID del usuario con rol COMPANY
- `opts.includeDeleted?: boolean = false` — si true, incluye `deletedAt != null` para alimentar la tab "Eliminadas"

**Retorno**: `Internship[]`

**Reglas de negocio**:

- Resuelve `companyId` desde `CompanyProfile`.
- Por defecto filtra `deletedAt: null` (tab "Activas" / "Finalizadas").
- Con `includeDeleted: true` retorna también las soft-deleted ordenadas por `deletedAt` desc (tab "Eliminadas" del dashboard).

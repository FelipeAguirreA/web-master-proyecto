# Spec: Applications Service

## applyToInternship(studentUserId, internshipId, coverLetter?)

**Propósito**: Postular un estudiante a una práctica laboral.

**Parámetros**:
- `studentUserId: string` — ID del usuario con rol STUDENT
- `internshipId: string` — ID de la práctica
- `coverLetter?: string` — carta de presentación opcional

**Retorno**: `Application` recién creada

**Casos de error**:
- Si la práctica no existe → lanza `Error('Internship not found')`
- Si la práctica está inactiva (`isActive: false`) → lanza `Error('Internship is not active')`
- Si ya existe una postulación del mismo estudiante a la misma práctica (P2002) → lanza `Error('Already applied')`

**Reglas de negocio**:
- `matchScore` se inicializa como `null` (se calcula en Módulo 11 con embeddings)
- La unicidad `@@unique([studentId, internshipId])` la garantiza Prisma (P2002)

---

## getMyApplications(studentUserId: string)

**Propósito**: Obtener todas las postulaciones de un estudiante.

**Parámetros**:
- `studentUserId: string` — ID del usuario estudiante

**Retorno**: `Application[]` con práctica e info de empresa incluidas

**Reglas de negocio**:
- Include: internship con company (`companyName`, `logo`)
- Ordenado por `createdAt` descendente

---

## getApplicantsByInternship(internshipId, companyUserId)

**Propósito**: Obtener todos los postulantes a una práctica, verificando que el usuario sea dueño.

**Parámetros**:
- `internshipId: string` — ID de la práctica
- `companyUserId: string` — ID del usuario con rol COMPANY

**Retorno**: `Application[]` con datos del estudiante incluidos

**Casos de error**:
- Si la práctica no existe o el usuario no es dueño → lanza `Error('Not found or not authorized')`

**Reglas de negocio**:
- Include: student con `name`, `email`, `image`, `studentProfile`
- Ordenado por `matchScore` descendente (nulls al final)

---

## updateApplicationStatus(applicationId, status)

**Propósito**: Cambiar el estado de una postulación.

**Parámetros**:
- `applicationId: string` — ID de la postulación
- `status: "REVIEWED" | "ACCEPTED" | "REJECTED"` — nuevo estado

**Retorno**: `Application` actualizada

**Casos de error**:
- Si la postulación no existe → lanza `Error('Application not found')`

**Reglas de negocio**:
- Estados válidos: `PENDING → REVIEWED → ACCEPTED | REJECTED`
- La validación de estado la hace el schema Zod antes de llegar al service

# Spec: Users Service

## getUserWithProfile(userId: string)

**Propósito**: Obtener el usuario con sus perfiles asociados (studentProfile y companyProfile).

**Parámetros**:
- `userId: string` — ID del usuario a buscar

**Retorno**: `User & { studentProfile: StudentProfile | null, companyProfile: CompanyProfile | null } | null`

**Casos de error**:
- Si `userId` no existe en DB → retorna `null` (no lanza excepción)

**Casos borde**:
- Un usuario STUDENT tiene `studentProfile` y `companyProfile: null`
- Un usuario COMPANY tiene `companyProfile` y `studentProfile: null`

---

## updateStudentProfile(userId: string, data: StudentProfileInput)

**Propósito**: Actualizar los campos del perfil de estudiante asociado al userId.

**Parámetros**:
- `userId: string` — ID del usuario dueño del perfil
- `data: StudentProfileInput` — campos validados por `studentProfileSchema` (todos opcionales)
  - `university?: string`
  - `career?: string`
  - `semester?: number`
  - `skills?: string[]`
  - `bio?: string`

**Retorno**: `StudentProfile` — perfil actualizado

**Casos de error**:
- Si no existe un StudentProfile para ese `userId` → Prisma lanza `P2025` (record not found)

**Casos borde**:
- Solo se actualizan los campos provistos (Prisma no pisa campos omitidos)
- `skills` reemplaza el array completo, no lo concatena

---

## updateCompanyProfile(userId: string, data: CompanyProfileInput)

**Propósito**: Actualizar los campos del perfil de empresa asociado al userId.

**Parámetros**:
- `userId: string` — ID del usuario dueño del perfil
- `data: CompanyProfileInput` — campos validados por `companyProfileSchema`
  - `companyName: string` (requerido, mínimo 2 caracteres)
  - `industry?: string`
  - `website?: string`
  - `description?: string`

**Retorno**: `CompanyProfile` — perfil actualizado

**Casos de error**:
- Si no existe un CompanyProfile para ese `userId` → Prisma lanza `P2025` (record not found)

**Casos borde**:
- `companyName` es el único campo requerido en el schema

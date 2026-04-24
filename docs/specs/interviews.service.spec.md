# Spec: Interviews Service

Servicio de agendamiento de entrevistas. Vive en `src/server/services/interviews.service.ts` y expone 7 funciones públicas. Consumido por el dashboard de empresa (`/api/interviews/*`).

## Reglas transversales

- **Autorización a nivel de recurso**: cada función recibe `companyUserId` y valida que la entrevista/application/internship pertenece a esa empresa. La capa HTTP (API route) ya validó rol con `requireAuth("COMPANY")`.
- **Una entrevista SCHEDULED por application**: el modelo tiene `applicationId @unique` en `Interview`. El código chequea explícitamente con `findUnique`/`findFirst` antes de crear o reasignar para dar error de negocio más claro (`INTERVIEW_ALREADY_EXISTS`) en vez de un Prisma error crudo.
- **`sentToChat` marca el "punto de no retorno" suave**: mientras `sentToChat === false` la entrevista es invisible al candidato. Una vez mandada al chat, cualquier cambio importante (reasignación, borrado) debe notificar al candidato vía mensaje en la conversación.
- **Status por default**: `Interview.status` es `"SCHEDULED"` al crear; los campos `COMPLETED` / `CANCELLED` los setea flujo externo (no cubierto acá).
- **Formato de fechas**: todas las fechas visibles al usuario se formatean con `Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago" })` y primera letra capitalizada.

---

## createInterview(companyUserId, data)

**Propósito**: Crear una nueva entrevista para un candidato que ya está en pipeline `INTERVIEW`.

**Parámetros**:

- `companyUserId: string` — `User.id` de la empresa.
- `data: { internshipId, applicationId, conversationId, title, scheduledAt, durationMins?, meetingLink?, notes? }`

**Retorno**: `Interview` (row de Prisma) con `sentToChat: false` y `status: "SCHEDULED"` por default del schema.

**Casos de error**:

- Application no existe → `Error("Application not found")`
- Application no pertenece a una práctica de esta empresa → `Error("Not authorized")`
- `data.internshipId` no coincide con `application.internshipId` → `Error("Application does not belong to this internship")`
- Ya existe una entrevista para esta application → `Error & { code: "INTERVIEW_ALREADY_EXISTS" }` con mensaje "Este candidato ya tiene una entrevista agendada. Puedes editarla."

**Reglas de negocio**:

- `durationMins` default: `60`.
- `meetingLink` y `notes` default: `null` (no `undefined`).
- `sentToChat` arranca en `false` — el usuario decide luego cuándo mandarla al chat.

---

## getInterviewsByCompany(companyUserId, filters?)

**Propósito**: Listar todas las entrevistas de una empresa con filtros opcionales.

**Parámetros**:

- `companyUserId: string`
- `filters?: { from?, to?, internshipId?, status? }` (status: `"SCHEDULED" | "COMPLETED" | "CANCELLED"`)

**Retorno**: array de `Interview` incluyendo `student`, `internship` (id/title), `conversation` (id). Ordenado por `scheduledAt` ASC.

**Reglas de negocio**:

- `filters.from` y `filters.to` se combinan con AND (`gte` y `lte`) sobre `scheduledAt`.
- `filters.status` es opcional: si no se pasa, retorna todos los estados.
- Sin autorización especial: el filtro `companyId: companyUserId` ya aísla los datos.

---

## getInterviewById(interviewId, companyUserId)

**Propósito**: Obtener una entrevista específica por ID.

**Retorno**: `Interview` con `student` (id/name/image), `internship` (id/title + company.companyName), `conversation` (id).

**Casos de error**:

- No existe → `Error("Interview not found")`
- `interview.companyId !== companyUserId` → `Error("Not authorized")`

---

## updateInterview(interviewId, companyUserId, data)

**Propósito**: Actualizar una entrevista. Si se cambia `applicationId`, dispara un flujo complejo de **reasignación de candidato**.

**Parámetros**:

- `data: { title?, scheduledAt?, durationMins?, meetingLink?, notes?, applicationId? }`

**Retorno**: `Interview` actualizada.

**Casos de error**:

- Entrevista no existe → `Error("Interview not found")`
- No autorizada → `Error("Not authorized")`
- (Solo al cambiar candidato) Application nueva no existe → `Error("New application not found")`
- (Solo al cambiar candidato) Application nueva no pertenece a esta empresa → `Error("Not authorized for new application")`
- (Solo al cambiar candidato) Nuevo candidato ya tiene entrevista `SCHEDULED` → `Error & { code: "INTERVIEW_ALREADY_EXISTS" }`
- (Solo al cambiar candidato) Nuevo candidato no tiene conversación activa → `Error("El nuevo candidato no tiene una conversación activa. Iniciá el chat primero.")`

**Reglas de negocio — modo edición simple (sin cambio de candidato)**:

- Solo aplica los campos presentes en `data` (usa `...(data.x !== undefined ? { x: data.x } : {})`).
- No toca `sentToChat` ni `sentToChatAt` — el candidato actual ya vio la entrevista y ve los cambios al re-enviar si la empresa quiere.

**Reglas de negocio — modo reasignación (`data.applicationId` distinto del actual)**:

1. Valida la nueva application (existencia, autorización).
2. Verifica que el nuevo candidato NO tenga otra entrevista `SCHEDULED` (ignorando la actual por ID).
3. Si la entrevista original ya había sido enviada al chat (`sentToChat === true`), manda un mensaje automático al candidato anterior: `"❌ Esta entrevista ha sido reasignada y ya no aplica para ti."`
4. Obtiene la `Conversation` del nuevo candidato (por `applicationId`). Si no existe, aborta.
5. Actualiza la entrevista con: nueva `applicationId`, nuevo `studentId`, nuevo `conversationId`, **resetea** `sentToChat: false` y `sentToChatAt: null` (el nuevo candidato aún no sabe nada), más los otros campos pasados en `data`.

---

## deleteInterview(interviewId, companyUserId)

**Propósito**: Cancelar una entrevista (hard delete del row).

**Retorno**: `void`.

**Casos de error**:

- No existe → `Error("Interview not found")`
- No autorizada → `Error("Not authorized")`

**Reglas de negocio**:

- Si `interview.sentToChat === true`, manda un mensaje automático al candidato con formato: `"❌ Entrevista cancelada\nLa entrevista "<title>" programada para <fecha> ha sido cancelada.\nLa empresa se pondrá en contacto contigo para reagendar."`
- Hard delete — no soft delete (a diferencia de `Internship`, el borrado de entrevista es definitivo).
- Si `sentToChat === false`, solo borra sin avisar (el candidato nunca la vio).

---

## sendInterviewToChat(interviewId, companyUserId)

**Propósito**: Enviar la entrevista al chat del candidato como un mensaje de tipo `INTERVIEW` con `metadata`. Se puede llamar múltiples veces: la primera crea el mensaje inicial, las siguientes crean un mensaje de "actualización".

**Retorno**: `{ message, interview }` con el mensaje creado (incluye `sender`) y la entrevista actualizada (con `sentToChat: true`, `sentToChatAt: <ahora>`).

**Casos de error**:

- No existe → `Error("Interview not found")`
- No autorizada → `Error("Not authorized")`

**Reglas de negocio**:

- El título del mensaje cambia según `isUpdate = interview.sentToChat`: `"📅 Entrevista agendada"` la primera vez, `"📅 Entrevista actualizada"` en las siguientes.
- El mensaje incluye fecha formateada (es-CL, America/Santiago), duración, meeting link (o `"Link por confirmar"` si es null), y notas (si hay).
- **Atomicidad**: usa `prisma.$transaction([...])` para hacer las 3 operaciones en una sola transacción:
  1. `message.create` (tipo `INTERVIEW`, con `metadata: { interviewId, type: "INTERVIEW_SCHEDULED" }`)
  2. `interview.update` (`sentToChat: true, sentToChatAt: new Date()`)
  3. `conversation.update` (bump `updatedAt` para que aparezca arriba en la lista)

---

## getAvailableCandidates(internshipId, companyUserId)

**Propósito**: Listar candidatos elegibles para agendar una entrevista (están en pipeline `INTERVIEW` y NO tienen entrevista ya agendada).

**Retorno**: array de `{ applicationId, conversationId, student: { id, name, image, email } }`.

**Casos de error**:

- Internship no existe → `Error("Internship not found")`
- Internship no pertenece a esta empresa → `Error("Not authorized")`

**Reglas de negocio**:

- Filtro: `pipelineStatus === "INTERVIEW"` AND `interview === null` (usando `is: null` de Prisma).
- `conversationId` puede ser `null` si el candidato está en pipeline pero aún no arrancó el chat — caller debe manejar ese caso antes de permitir agendar.

---

## Casos NO cubiertos por este spec

- **Sincronización con Google Calendar**: no implementada hoy.
- **Recordatorios por email**: no implementados hoy.
- **Cambio de status a `COMPLETED` o `CANCELLED`**: cubierto por endpoints específicos (no este service).
- **Rate limiting** al crear entrevistas: ver ADR-003.

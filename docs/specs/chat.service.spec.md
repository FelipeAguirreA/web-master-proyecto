# Spec: Chat Service

Capa de negocio para el módulo de chat empresa↔estudiante. Vive en `src/server/services/chat.service.ts`. No importa nada de `next` (Clean Architecture).

Modelos involucrados (Prisma): `Conversation`, `Message`, `Application`, `User`, `CompanyProfile`, `Interview`.

## Reglas transversales

- **Habilitación**: el chat se habilita SOLO cuando la `Application` está en `pipelineStatus: "INTERVIEW"`. Antes de eso, no hay conversación.
- **Autorización por rol** (responsabilidad del caller, NO del service): cada función asume que la API route ya validó el rol con `requireAuth("COMPANY")` o `requireAuth("STUDENT")` según corresponda. El service solo valida pertenencia a la conversación (`userId === companyId | studentId`), no rol. Ver `docs/specs/auth-guard.spec.md` para el contrato de autorización (defense in depth: middleware + auth-guard + API route).
- **Identidad de la empresa**: `companyProfile` manda sobre `user` para `name` (`companyName`) e `image` (`logo`). Las empresas autenticadas con credentials no tienen `user.image` ni necesariamente `user.name`.

---

## getOrCreateConversation(companyUserId, applicationId)

**Propósito**: Obtener (o crear si no existe) la conversación asociada a una postulación. Punto de entrada exclusivo de la empresa para iniciar un chat.

**Parámetros**:

- `companyUserId: string` — ID del usuario con rol COMPANY
- `applicationId: string` — ID de la postulación

**Retorno**: `Conversation` (existente o recién creada)

**Casos de error**:

- Si la postulación no existe → lanza `Error('Application not found')`
- Si la postulación no está en `INTERVIEW` → lanza `Error('Chat only available for applications in INTERVIEW stage')`
- Si el usuario no es la empresa dueña de la práctica de esa postulación → lanza `Error('Not authorized')`

**Reglas de negocio**:

- Idempotente: si ya existe una `Conversation` con ese `applicationId` (campo único), la retorna sin crear otra.
- Al crear, persiste `companyId = companyUserId`, `studentId = application.studentId`, `applicationId`.
- La autorización se valida vía `application.internship.company.userId === companyUserId`.

---

## getConversationsByUser(userId, role)

**Propósito**: Listar todas las conversaciones de un usuario para alimentar el inbox.

**Parámetros**:

- `userId: string` — ID del usuario
- `role: "COMPANY" | "STUDENT"` — define por qué columna filtra (`companyId` o `studentId`)

**Retorno**: `Array<ConversationListItem>` ordenado por `updatedAt` descendente. Cada item:

```ts
{
  id, companyId, studentId,
  company: { id, name, contactName, image },
  student: { id, name, image },
  internship: { id, title },
  lastMessage: Message | null,
  unreadCount: number,
  hasPendingInterview: boolean,
  updatedAt, createdAt,
}
```

**Casos de error**: ninguno explícito (si el usuario no tiene conversaciones, retorna `[]`).

**Reglas de negocio**:

- `company.name` = `companyProfile.companyName ?? user.name` (las empresas autenticadas con credentials no tienen `user.image`/`user.name` — el `companyProfile` manda).
- `company.image` = `companyProfile.logo ?? user.image`.
- `company.contactName` = `[user.name, user.lastName].filter(Boolean).join(" ")` (nombre del contacto humano).
- `student.name` = `[user.name, user.lastName].filter(Boolean).join(" ")`.
- `lastMessage` = el mensaje más reciente (orderBy `createdAt: "desc"`, `take: 1`) o `null` si no hay.
- `unreadCount` = mensajes con `isRead: false` cuyo `senderId !== userId` (mensajes recibidos no leídos).
- `hasPendingInterview` = `true` solo si existe una `Interview` con `status: "SCHEDULED"` cuyo flag `sentToChat === false`.

---

## getConversationById(conversationId, userId)

**Propósito**: Obtener una conversación específica con datos enriquecidos para la pantalla de chat.

**Parámetros**:

- `conversationId: string` — ID de la conversación
- `userId: string` — ID del usuario que pide acceso (autorización)

**Retorno**: `Conversation` con `company`, `student`, `application.internship` (incluye `company.companyName`).

**Casos de error**:

- Si la conversación no existe → lanza `Error('Conversation not found')`
- Si el `userId` no es ni `companyId` ni `studentId` de la conversación → lanza `Error('Not authorized')`

**Reglas de negocio**:

- Mapeo de `company.name`, `contactName`, `image` y `student.name` idéntico a `getConversationsByUser` (mismo fallback `companyProfile → user`).

---

## getMessages(conversationId, userId, cursor?, limit?)

**Propósito**: Obtener mensajes de una conversación con paginación forward por cursor de timestamp. Marca como leídos los mensajes recibidos.

**Parámetros**:

- `conversationId: string`
- `userId: string` — autorización
- `cursor?: string` — ISO datetime; si está, retorna mensajes con `createdAt > cursor`
- `limit?: number = 50` — tamaño de página

**Retorno**: `{ messages: Message[], nextCursor: string | null }`

**Casos de error**:

- Si la conversación no existe → lanza `Error('Conversation not found')`
- Si el `userId` no pertenece a la conversación → lanza `Error('Not authorized')`

**Reglas de negocio**:

- `messages` ordenados por `createdAt` ascendente, incluyen `sender: { id, name, image, role }`.
- Side effect: tras leer, hace `updateMany` para marcar `isRead: true` los mensajes con `senderId !== userId` y `isRead: false`.
- `nextCursor` = `createdAt.toISOString()` del último mensaje SI `messages.length === limit`; de lo contrario `null`. (Trade-off conocido: si el total justo es `limit`, el siguiente request retorna vacío.)

---

## sendMessage(conversationId, senderId, content)

**Propósito**: Crear un mensaje en una conversación y bumpear `updatedAt` de la conversación.

**Parámetros**:

- `conversationId: string`
- `senderId: string` — ID del autor del mensaje
- `content: string` — texto del mensaje

**Retorno**: `Message` recién creado, incluye `sender: { id, name, image, role }`.

**Casos de error**:

- Si la conversación no existe → lanza `Error('Conversation not found')`
- Si el `senderId` no pertenece a la conversación → lanza `Error('Not authorized')`
- Si el sender es el estudiante Y la conversación no tiene mensajes previos → lanza `Error('La empresa debe iniciar la conversación')` con propiedad `code: "STUDENT_CANNOT_INITIATE"` para que la API la traduzca a un código HTTP específico.

**Reglas de negocio**:

- Regla de iniciación: SOLO la empresa puede mandar el primer mensaje de una conversación. El estudiante puede responder, pero no abrir.
- Persistencia atómica vía `prisma.$transaction([...])`: crea el `Message` (type `TEXT`) y actualiza `Conversation.updatedAt` en una sola transacción.
- El campo `type` se setea siempre en `"TEXT"` (otros tipos como `INTERVIEW_INVITE` se crean por otros services).

---

## markConversationRead(conversationId, userId)

**Propósito**: Marcar como leídos todos los mensajes recibidos en una conversación. Disparado al abrir el chat o al desfocusear notificaciones.

**Parámetros**:

- `conversationId: string`
- `userId: string` — autorización + filtro (solo marca los mensajes que el `userId` recibió)

**Retorno**: `void` (no retorna nada relevante).

**Casos de error**:

- Si la conversación no existe → lanza `Error('Conversation not found')`
- Si el `userId` no pertenece a la conversación → lanza `Error('Not authorized')`

**Reglas de negocio**:

- `updateMany` afecta solo mensajes con `isRead: false` y `senderId !== userId` (no marca como leídos los propios).

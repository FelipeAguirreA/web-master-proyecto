# Spec: Chat Service

Capa de negocio para el módulo de chat empresa↔estudiante. Vive en `src/server/services/chat.service.ts`. No importa nada de `next` (Clean Architecture).

Modelos involucrados (Prisma): `Conversation`, `Message`, `Application`, `User`, `CompanyProfile`, `Interview`, `Notification`.

## Reglas transversales

- **Habilitación**: el chat se habilita SOLO cuando la `Application` está en `pipelineStatus: "INTERVIEW"`. Antes de eso, no hay conversación.
- **Autorización por rol** (responsabilidad del caller, NO del service): cada función asume que la API route ya validó el rol con `requireAuth("COMPANY")` o `requireAuth("STUDENT")` según corresponda. El service solo valida pertenencia a la conversación (`userId === companyId | studentId`), no rol. Ver `docs/specs/auth-guard.spec.md` para el contrato de autorización (defense in depth: middleware + auth-guard + API route).
- **Identidad de la empresa**: `companyProfile` manda sobre `user` para `name` (`companyName`) e `image` (`logo`). Las empresas autenticadas con credentials no tienen `user.image` ni necesariamente `user.name`.
- **RLS en Postgres** (desde 1.13.0): las tablas `conversations`, `messages` y `notifications` tienen Row Level Security activado con SELECT policies basadas en `auth.jwt() ->> 'sub'`. El backend (Prisma con service role) bypasea RLS — los services siguen operando sin cambios. Las policies sólo limitan al cliente browser que conecta via Realtime: solo recibe pushes de filas donde es participante (companyId/studentId/userId). Ver `docs/adr/007-rls-realtime-jwt.md`.
- **Realtime auth** (desde 1.13.0): el cliente browser ANTES de `supabaseRealtime.channel(...).subscribe()` debe llamar `authenticateRealtime()` (`src/lib/client/supabase-auth.ts`). El helper fetchea un JWT HS256 firmado por `POST /api/auth/supabase-token` (claims: `sub`, `role: "authenticated"`, `aud: "authenticated"`, `exp: 4h`) y lo aplica via `realtime.setAuth(token)`. Sin esto, el JWT del WebSocket es el anon implícito y RLS bloquea todos los pushes.

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
- **Sincronía con campana** (desde 1.12.0): además del `updateMany` sobre `messages`, elimina TODAS las `Notification` con `type: "NEW_MESSAGE"` del `userId` que estén sin leer. Esto evita que la campana muestre "Tienes mensajes sin leer" si el user ya leyó todos los mensajes desde el inbox. Dedupe global UX tipo Slack/WhatsApp.

---

## getUnreadCount(userId, role) — `GET /api/chat/unread-count`

**Propósito**: Devolver `{ count: number }` con el total de mensajes no leídos para el `userId`. Endpoint optimizado para el badge del topbar.

**Parámetros**:

- `userId: string`
- `role: "COMPANY" | "STUDENT"` — define por qué columna de `conversation` participa

**Retorno**: `{ count: number }`

**Reglas de negocio**:

- Single `prisma.message.count` con filtros:
  - `isRead: false`
  - `senderId: { not: userId }` (no se cuenta lo que el user mismo escribió)
  - `conversation.companyId == userId` o `conversation.studentId == userId` según `role`
- Orden de magnitud más barato que reusar `getConversationsByUser` (que trae lista completa con joins de profile/internship/lastMessage). El badge lo necesita cada 30s — la diferencia es real bajo carga.
- Usado por el hook `useUnreadCount` (`src/hooks/useUnreadCount.ts`) con polling + **Page Visibility API**: cuando la pestaña no está visible, el intervalo se suspende; al volver el foco, hace un fetch inmediato y reanuda.

---

## Realtime auth + push (desde 1.13.0)

El cliente browser usa **Supabase Realtime** para recibir pushes instantáneos de nuevos mensajes dentro de una conversación abierta (`ConversationView.tsx`) y de notificaciones globales (`useNotifications.ts`). El flujo de auth es:

1. **Mount del effect** → `authenticateRealtime()` (`src/lib/client/supabase-auth.ts`).
2. **Helper fetchea** `POST /api/auth/supabase-token` (auth: requireAuth de NextAuth) → recibe JWT HS256 con claims `sub: userId` (CUID), `role: "authenticated"`, `aud: "authenticated"`, `exp: 4h`.
3. **Aplica** `supabaseRealtime.realtime.setAuth(token)`.
4. **Suscribe** al canal: `supabaseRealtime.channel(stableName + uniqueSuffix).on("postgres_changes", { event, schema, table, filter }, handler).subscribe()`.
5. **Cleanup del useEffect**: `supabaseRealtime.removeChannel(channel)` — sin esto, en StrictMode los dos mounts del effect crean dos suscripciones y el SDK explota con error de canal duplicado.

**Gotchas conocidos**:

- Si `SUPABASE_JWT_SECRET` falta en env, el endpoint responde 500 y el push degrada a fetch-only (la conversación se hidrata al mount pero no recibe nuevos mensajes hasta refresh manual).
- Las policies leen `auth.jwt() ->> 'sub'` — NO `auth.uid()` (que devuelve UUID y nuestros userIds son CUIDs).
- El token vive 4h; si el componente queda montado >4h, el WebSocket se desconecta al expirar — el SDK intenta reconnect y vuelve a hacer setAuth si el helper de re-auth está cableado.

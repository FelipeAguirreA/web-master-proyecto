# Chat + Calendario de Entrevistas — Instrucciones de Setup

## Paso 1: Variables de entorno

Agregá las siguientes variables a tu `.env.local` (o al panel de Vercel en producción):

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_publica
```

Encontrás la **Anon Key** en:
`Supabase Dashboard → Settings → API → anon (public)`

---

## Paso 2: Migración de base de datos

Ejecutar en orden:

```bash
npx prisma generate
```

Luego aplicar la migración en Supabase manualmente. Ir a:
`Supabase Dashboard → SQL Editor`

Pegar y ejecutar el siguiente SQL (podés dividirlo en dos ejecuciones si da timeout):

```sql
-- Enums nuevos
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'INTERVIEW');
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- Tabla conversations
CREATE TABLE "conversations" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversations_applicationId_key" UNIQUE ("applicationId")
);

CREATE INDEX "conversations_companyId_idx" ON "conversations"("companyId");
CREATE INDEX "conversations_studentId_idx" ON "conversations"("studentId");

-- Tabla messages
CREATE TABLE "messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "type" "MessageType" NOT NULL DEFAULT 'TEXT',
  "metadata" JSONB,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- Tabla interviews
CREATE TABLE "interviews" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "internshipId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMins" INTEGER NOT NULL DEFAULT 60,
  "meetingLink" TEXT,
  "notes" TEXT,
  "sentToChat" BOOLEAN NOT NULL DEFAULT false,
  "sentToChatAt" TIMESTAMP(3),
  "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "interviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "interviews_applicationId_key" UNIQUE ("applicationId")
);

CREATE INDEX "interviews_companyId_idx" ON "interviews"("companyId");
CREATE INDEX "interviews_scheduledAt_idx" ON "interviews"("scheduledAt");

-- Foreign keys conversations
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys messages
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys interviews
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_internshipId_fkey"
  FOREIGN KEY ("internshipId") REFERENCES "internships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

---

## Paso 3: Habilitar Supabase Realtime en la tabla messages

**OBLIGATORIO para que el chat funcione en tiempo real.**

1. Ir a `Supabase Dashboard`
2. En el menú lateral, hacer click en **Database**
3. Ir a **Replication** (o **Publications**)
4. Buscar la publicación `supabase_realtime`
5. Hacer click en ella y agregar la tabla `messages`
6. Guardar cambios

Sin este paso, el Realtime no va a recibir eventos de nuevos mensajes.

---

## Paso 4: Regenerar el cliente Prisma

Después de aplicar la migración SQL:

```bash
npx prisma generate
```

---

## Rutas nuevas

| Ruta                          | Descripción                     |
| ----------------------------- | ------------------------------- |
| `/dashboard/empresa/inbox`    | Inbox empresa — lista + chat    |
| `/dashboard/estudiante/inbox` | Inbox estudiante — lista + chat |
| `/dashboard/empresa/calendar` | Calendario de entrevistas       |

### API routes de chat

| Método  | Ruta                                    | Descripción                       |
| ------- | --------------------------------------- | --------------------------------- |
| `POST`  | `/api/chat/conversations`               | Crear conversación (solo COMPANY) |
| `GET`   | `/api/chat/conversations`               | Listar conversaciones             |
| `GET`   | `/api/chat/conversations/[id]`          | Metadata de conversación          |
| `GET`   | `/api/chat/conversations/[id]/messages` | Mensajes paginados                |
| `POST`  | `/api/chat/conversations/[id]/messages` | Enviar mensaje TEXT               |
| `PATCH` | `/api/chat/conversations/[id]/read`     | Marcar como leídos                |

### API routes de interviews

| Método   | Ruta                                           | Descripción                      |
| -------- | ---------------------------------------------- | -------------------------------- |
| `POST`   | `/api/interviews`                              | Crear entrevista (solo COMPANY)  |
| `GET`    | `/api/interviews`                              | Listar entrevistas de la empresa |
| `GET`    | `/api/interviews/[id]`                         | Obtener entrevista               |
| `PATCH`  | `/api/interviews/[id]`                         | Editar entrevista                |
| `DELETE` | `/api/interviews/[id]`                         | Eliminar entrevista              |
| `POST`   | `/api/interviews/[id]/send-to-chat`            | Enviar cita al chat              |
| `GET`    | `/api/interviews/available-candidates/[jobId]` | Candidatos disponibles           |

---

## Flujo de uso

1. Empresa va al ATS → mueve candidato a columna **INTERVIEW**
2. Empresa va a **Inbox** → inicia conversación (primer mensaje)
3. Estudiante puede responder
4. Empresa va al **Calendario** → crea entrevista, selecciona práctica y candidato
5. La entrevista queda guardada — el candidato **no sabe aún**
6. Empresa presiona **[Enviar al chat]** → el mensaje llega al candidato
7. Si hay cambios, editar y **[Reenviar]**

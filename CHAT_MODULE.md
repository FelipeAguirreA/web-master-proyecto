# Chat + Calendario de Entrevistas — Instrucciones de Setup

## Paso 1: Variables de entorno

Agregá las siguientes variables a tu `.env.local` (y al panel de Vercel en producción — **Preview + Production**):

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_publica
SUPABASE_JWT_SECRET=tu_legacy_jwt_secret
```

- **Anon Key**: `Supabase Dashboard → Settings → API → anon (public)`. Pública por diseño, la usa el cliente browser para abrir el WebSocket de Realtime. **No es secret**.
- **Legacy JWT Secret**: `Supabase Dashboard → Settings → API → JWT Keys → tab "Legacy JWT Secret" → Reveal`. La usa `/api/auth/supabase-token` para firmar JWTs HS256 que el browser pasa a `supabaseRealtime.realtime.setAuth(token)`. **Sin esta var, RLS rechaza todos los pushes y el chat/notif degradan a fetch-only sin updates en tiempo real**. Mínimo 32 chars (validado por Zod en `src/lib/env.ts`).

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

## Paso 3: Habilitar Supabase Realtime en las tablas necesarias

**OBLIGATORIO para que el chat y las notificaciones funcionen en tiempo real.**

1. Ir a `Supabase Dashboard`
2. En el menú lateral, hacer click en **Database**
3. Ir a **Replication** (o **Publications**)
4. Buscar la publicación `supabase_realtime`
5. Hacer click en ella y agregar las tablas:
   - `messages` — push de mensajes dentro de una conversación abierta
   - `notifications` — push de notificaciones globales (campana del topbar)
6. Guardar cambios

Sin estas tablas en la publication, el Realtime NO va a entregar pushes. La
app degrada al fetch inicial sin updates en tiempo real, lo que rompe el chat
en vivo y obliga a refrescar manualmente para ver notificaciones nuevas.

**Verificación rápida**: en el dashboard de Supabase, ir a **Database →
Replication → supabase_realtime**. Deberías ver `messages` y `notifications`
en la lista de tablas incluidas.

**Por qué no está en una migration**: la publication `supabase_realtime` es
infraestructura de Supabase, no schema de la app. Mantenerla fuera de las
migrations evita acoplar el versionado Prisma a un detalle del provider.

---

## Paso 4: Regenerar el cliente Prisma

Después de aplicar la migración SQL:

```bash
npx prisma generate
```

---

## Paso 5: Habilitar RLS + policies para Realtime (desde 1.13.0)

Las tablas que Realtime entrega al browser (`messages`, `notifications`, `conversations`) tienen RLS activado y necesitan SELECT policies para que el push llegue solo al participante correcto. Ya están aplicadas en producción vía MCP de Supabase, pero si estás levantando un proyecto desde cero, ejecutá esto en `SQL Editor`:

```sql
-- Habilitar RLS en todas las tablas de schema public (defense in depth)
-- Las tablas backend-only quedan SIN policies → Prisma (service role) bypasea,
-- la anon key del browser queda bloqueada por default-deny.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "internships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_internships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ats_config" ENABLE ROW LEVEL SECURITY;

-- Tablas con policies SELECT — las necesita Realtime para validar pushes
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

-- IMPORTANTE: leemos `auth.jwt() ->> 'sub'` (CUID en string), NO `auth.uid()`
-- (que devuelve UUID). Nuestros userIds son CUIDs generados por Prisma.

CREATE POLICY "conversations_select_participant"
  ON "conversations" FOR SELECT
  USING (auth.jwt() ->> 'sub' IN ("companyId", "studentId"));

CREATE POLICY "messages_select_participant"
  ON "messages" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "conversations" c
      WHERE c.id = "messages"."conversationId"
      AND auth.jwt() ->> 'sub' IN (c."companyId", c."studentId")
    )
  );

CREATE POLICY "notifications_select_owner"
  ON "notifications" FOR SELECT
  USING (auth.jwt() ->> 'sub' = "userId");
```

**Por qué no está en una Prisma migration**: RLS y policies son política del provider (Supabase), no schema de la app. Mantenerlos fuera evita acoplar versionado Prisma a un detalle de infra.

---

## Paso 6: Endpoint de firma JWT + cliente

Ya implementado en el repo. Resumen de la cadena de auth para Realtime:

1. **Backend** firma JWT HS256 en `POST /api/auth/supabase-token` (`src/app/api/auth/supabase-token/route.ts`) con `SUPABASE_JWT_SECRET`. Claims: `sub: userId`, `role: "authenticated"`, `aud: "authenticated"`, `exp: 4h`.
2. **Cliente browser** llama `authenticateRealtime()` (`src/lib/client/supabase-auth.ts`) antes de `.subscribe()` en cualquier canal sobre tablas con RLS. El helper fetchea el JWT y lo aplica via `supabaseRealtime.realtime.setAuth(token)`.
3. Los hooks `useNotifications` (`src/hooks/useNotifications.ts`) y los componentes `ConversationView` (`src/components/chat/ConversationView.tsx`) ya llaman `authenticateRealtime()` en el mount del effect.

**Decisión arquitectural**: el plan inicial era RS256 + JWKS + Third-Party Auth Provider en Supabase, pero el free tier no expone Generic OIDC en el dashboard. El legacy JWT secret sigue funcionando como verificador en proyectos migrados al nuevo sistema de keys. Ver ADR 007 para alternativas evaluadas y plan de migración a RS256 cuando upgradees a Pro.

---

## Paso 7: Realtime híbrido — Polling de unread count

Para el badge numérico del topbar (campana / chat) usamos **polling cada 30 segundos** al endpoint barato `GET /api/chat/unread-count` en lugar de Realtime sobre todas las conversaciones. Ya implementado en `src/hooks/useUnreadCount.ts`.

**Por qué híbrido**:

- **Push** (Realtime) para mensajes **dentro de una conversación abierta** y notificaciones globales → latencia instantánea cuando el user está mirando.
- **Polling 30s** para el badge agregado → muchísimo más barato que mantener WebSocket suscripto a todas las conversaciones del user. Pausa automáticamente con **Page Visibility API** cuando la pestaña no está visible y reanuda al volver el foco.
- Resultado: ~89% menos tráfico HTTP que polling cada 5s, sin degradar UX en el caso 99%.

Compatible con free tier de Supabase Realtime (límite de mensajes/mes).

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

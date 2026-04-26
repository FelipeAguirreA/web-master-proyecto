# Spec: Política de cascadas en FKs (`prisma/schema.prisma`)

Define la política `onDelete` para las 8 foreign keys que hoy quedan en el default de Postgres (`NO ACTION`, equivalente a `RESTRICT`). El default actual bloquea operaciones legítimas — particularmente el borrado en cascada de un `User` cuando existen entrevistas asociadas.

Vive en:

- `prisma/schema.prisma` — declaración de las relaciones
- Migración Prisma generada (`prisma/migrations/<ts>_add_fk_cascades/`)
- `src/test/integration/db-cascades.test.ts` — suite de integración con DB real (Docker)
- `src/server/services/chat.service.ts` — UI/lógica que tolera `Message.sender = null`
- Componentes de chat que muestran "[usuario eliminado]" cuando `sender` es null

## Contexto del problema

Schema actual (auditoría 2026-04-26):

- 11 relaciones tienen `onDelete: Cascade` declarado.
- 8 relaciones quedaron sin política → Postgres aplica `NO ACTION` y bloquea cualquier delete que tenga referencias.
- Consecuencia: borrar un `User` falla si el user tuvo entrevistas, mensajes en chats ajenos, o es company/student de una conversación. El admin panel para rechazar empresas y la baja por GDPR ("right to be forgotten") quedan rotos en producción.

## Reglas transversales

- **`Cascade` por default** cuando la entidad hija no tiene sentido sin el padre (entrevista sin práctica, conversación sin user).
- **`SetNull` solo en `Message.sender`** porque borrar mensajes de un user en chats de otros corrompería el historial de la otra parte.
- **NO se usa `Restrict` explícito**: si una FK debe bloquear, se documenta como decisión y se aplica `Restrict`. Hoy ninguna lo requiere.
- **Idempotencia**: la migración debe ser segura de re-correr en entornos donde algunas FKs ya tengan la política correcta (p.ej. si Prisma re-genera).
- **Sin pérdida de datos en producción**: cambiar `NO ACTION → Cascade` solo redefine la política para deletes futuros. Los registros existentes no se tocan.

## Política por FK

| #   | Modelo       | FK                            | Política  | Razón                                                                           |
| --- | ------------ | ----------------------------- | --------- | ------------------------------------------------------------------------------- |
| 1   | Conversation | `company → User`              | `Cascade` | Coherencia con `Conversation.application` que ya cascadea desde el lado student |
| 2   | Conversation | `student → User`              | `Cascade` | Idem                                                                            |
| 3   | Message      | `sender → User`               | `SetNull` | Preservar historial visible para la contraparte cuando se borra un user         |
| 4   | Interview    | `company → User`              | `Cascade` | La entrevista no tiene sentido sin el user company                              |
| 5   | Interview    | `student → User`              | `Cascade` | Idem para student                                                               |
| 6   | Interview    | `internship → Internship`     | `Cascade` | Sin práctica no hay entrevista                                                  |
| 7   | Interview    | `application → Application`   | `Cascade` | Sin postulación no hay entrevista                                               |
| 8   | Interview    | `conversation → Conversation` | `Cascade` | La entrevista vive dentro del chat — destruir el chat destruye la entrevista    |

## Cambio de schema requerido

`Message.senderId` pasa de `String` (NOT NULL) a `String?` (nullable) para soportar `SetNull`. Implica:

- Migración con `ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL`.
- Tipos TypeScript de Prisma se actualizan automáticamente — `Message.senderId` y `Message.sender` pasan a opcionales.
- Lugares del código que hoy asumen `sender` no-null deben ajustarse a `sender ?? { name: "Usuario eliminado", ... }` o equivalente en UI.

## Casos de uso a validar (tests de integración)

Cada test usa DB real (Docker) y verifica que la cascada se ejecute:

1. **Borrar User student con application + conversation + message + interview** → toda la cadena se borra, no falla.
2. **Borrar User company con companyProfile + internship + application + conversation + interview** → toda la cadena se borra, no falla.
3. **Borrar Internship con application + interview** → application, interview, atsConfig, atsModules se borran.
4. **Borrar Application con conversation + interview** → conversation, message e interview se borran.
5. **Borrar User que solo fue `sender` de mensajes en conversaciones ajenas** → los mensajes quedan con `senderId = NULL`, las conversaciones siguen vivas.
6. **Borrar User company en uso por un Interview** (caso pre-fix bloqueante) → ahora funciona.

## Comportamiento UI esperado

- `MessageBubble` debe tolerar `sender = null` y renderizar "Usuario eliminado" como nombre, avatar fallback genérico.
- `ConversationItem` y `ConversationList` no se ven afectados (operan sobre `Conversation`, no `Message.sender`).
- `chat.service` retorna mensajes con `sender` posiblemente null — los consumidores no rompen.

## Casos NO cubiertos por este spec

- **Soft delete de User**: hoy no existe. Si en el futuro se introduce, los cascades cambian de semántica — re-evaluar.
- **Auditoría de quién borró qué**: no hay tabla de audit log. Para GDPR cumple con borrar; no registra el evento.
- **Restore de mensajes con sender null**: imposible por diseño. Si se borra el user, el vínculo se pierde — el `User` no se reconstruye desde `Message`.
- **Notificaciones y RefreshTokens**: ya cascadean correctamente (líneas 101 y 293 del schema). Fuera de scope.

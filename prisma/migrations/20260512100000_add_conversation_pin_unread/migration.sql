-- Inbox redesign (F-Inbox). Permite a empresa y estudiante anclar (pin) y marcar como
-- no leído conversaciones de forma independiente, sin que el toggle de un lado afecte al otro.
-- 4 columnas en vez de tabla aparte: la cardinalidad es 1:1 con Conversation y son flags
-- visuales — no justifica una tabla con FK ni índices extra.

-- AlterTable
ALTER TABLE "conversations"
  ADD COLUMN "companyPinned"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "studentPinned"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "companyMarkedUnread" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "studentMarkedUnread" BOOLEAN NOT NULL DEFAULT false;

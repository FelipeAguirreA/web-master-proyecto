-- Migration: add_fk_cascades
-- Date: 2026-04-26
-- Spec: docs/specs/db-cascades.spec.md
-- Bump: 1.8.1 → 1.9.0
--
-- Define explicit ON DELETE policy for 8 FKs that defaulted to NO ACTION.
-- 7 of them become CASCADE; Message.sender becomes SET NULL (and senderId nullable).
--
-- Apply order: Docker local first (validate integration tests) → Supabase.
-- Reversible: see rollback section at the bottom.

BEGIN;

-- 1. Conversation.company → User : NO ACTION → CASCADE
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_companyId_fkey";
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Conversation.student → User : NO ACTION → CASCADE
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_studentId_fkey";
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Message.sender → User : NO ACTION → SET NULL (requires senderId nullable)
ALTER TABLE "messages" ALTER COLUMN "senderId" DROP NOT NULL;
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_senderId_fkey";
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Interview.company → User : NO ACTION → CASCADE
ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "interviews_companyId_fkey";
ALTER TABLE "interviews"
  ADD CONSTRAINT "interviews_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Interview.student → User : NO ACTION → CASCADE
ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "interviews_studentId_fkey";
ALTER TABLE "interviews"
  ADD CONSTRAINT "interviews_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Interview.internship → Internship : NO ACTION → CASCADE
ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "interviews_internshipId_fkey";
ALTER TABLE "interviews"
  ADD CONSTRAINT "interviews_internshipId_fkey"
  FOREIGN KEY ("internshipId") REFERENCES "internships"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Interview.application → Application : NO ACTION → CASCADE
ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "interviews_applicationId_fkey";
ALTER TABLE "interviews"
  ADD CONSTRAINT "interviews_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "applications"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Interview.conversation → Conversation : NO ACTION → CASCADE
ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "interviews_conversationId_fkey";
ALTER TABLE "interviews"
  ADD CONSTRAINT "interviews_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

-- =============================================================================
-- ROLLBACK (apply only if you need to revert)
-- =============================================================================
-- BEGIN;
--
-- ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_companyId_fkey";
-- ALTER TABLE "conversations"
--   ADD CONSTRAINT "conversations_companyId_fkey"
--   FOREIGN KEY ("companyId") REFERENCES "users"("id")
--   ON DELETE NO ACTION ON UPDATE CASCADE;
--
-- ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_studentId_fkey";
-- ALTER TABLE "conversations"
--   ADD CONSTRAINT "conversations_studentId_fkey"
--   FOREIGN KEY ("studentId") REFERENCES "users"("id")
--   ON DELETE NO ACTION ON UPDATE CASCADE;
--
-- -- WARNING: cannot rollback senderId NOT NULL if any row has senderId = NULL after the migration.
-- -- Inspect first: SELECT COUNT(*) FROM "messages" WHERE "senderId" IS NULL;
-- -- If 0, the next ALTER is safe. Otherwise back-fill or accept loss.
-- ALTER TABLE "messages" ALTER COLUMN "senderId" SET NOT NULL;
-- ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_senderId_fkey";
-- ALTER TABLE "messages"
--   ADD CONSTRAINT "messages_senderId_fkey"
--   FOREIGN KEY ("senderId") REFERENCES "users"("id")
--   ON DELETE NO ACTION ON UPDATE CASCADE;
--
-- ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "interviews_companyId_fkey";
-- ALTER TABLE "interviews"
--   ADD CONSTRAINT "interviews_companyId_fkey"
--   FOREIGN KEY ("companyId") REFERENCES "users"("id")
--   ON DELETE NO ACTION ON UPDATE CASCADE;
--
-- ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "interviews_studentId_fkey";
-- ALTER TABLE "interviews"
--   ADD CONSTRAINT "interviews_studentId_fkey"
--   FOREIGN KEY ("studentId") REFERENCES "users"("id")
--   ON DELETE NO ACTION ON UPDATE CASCADE;
--
-- ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "interviews_internshipId_fkey";
-- ALTER TABLE "interviews"
--   ADD CONSTRAINT "interviews_internshipId_fkey"
--   FOREIGN KEY ("internshipId") REFERENCES "internships"("id")
--   ON DELETE NO ACTION ON UPDATE CASCADE;
--
-- ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "interviews_applicationId_fkey";
-- ALTER TABLE "interviews"
--   ADD CONSTRAINT "interviews_applicationId_fkey"
--   FOREIGN KEY ("applicationId") REFERENCES "applications"("id")
--   ON DELETE NO ACTION ON UPDATE CASCADE;
--
-- ALTER TABLE "interviews" DROP CONSTRAINT IF EXISTS "interviews_conversationId_fkey";
-- ALTER TABLE "interviews"
--   ADD CONSTRAINT "interviews_conversationId_fkey"
--   FOREIGN KEY ("conversationId") REFERENCES "conversations"("id")
--   ON DELETE NO ACTION ON UPDATE CASCADE;
--
-- COMMIT;

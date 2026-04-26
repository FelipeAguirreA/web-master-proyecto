-- Migration: create_refresh_tokens
-- Date: 2026-04-26
-- Spec: docs/specs/refresh-tokens.spec.md
--
-- Crea la tabla refresh_tokens declarada en schema.prisma (modelo RefreshToken).
-- Esta tabla quedó sin aplicar tras el cierre de Fase 3 paso 3.2 (commit 040f1e8,
-- bump 1.7.1 → 1.8.0) porque el proyecto nunca usó `prisma migrate` para
-- sincronizar el schema con Supabase. Hasta el commit 5863dee, además, las
-- migraciones via pooler de pgBouncer estaban rotas.
--
-- El bug se manifiesta como P2021 (TableDoesNotExist) al hacer login con Google:
-- signIn() llama a issueRefreshToken() que intenta INSERT sobre una tabla
-- inexistente.
--
-- Apply order: Supabase via SQL Editor (mismo patrón que add_fk_cascades).
-- Reversible: see rollback section at the bottom.

BEGIN;

CREATE TABLE "refresh_tokens" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "tokenHash"  TEXT NOT NULL,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "revokedAt"  TIMESTAMP(3),
  "replacedBy" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key"
  ON "refresh_tokens"("tokenHash");

CREATE INDEX "refresh_tokens_userId_idx"
  ON "refresh_tokens"("userId");

CREATE INDEX "refresh_tokens_expiresAt_idx"
  ON "refresh_tokens"("expiresAt");

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

-- =============================================================================
-- ROLLBACK (do NOT include in apply; copy/paste into Supabase SQL Editor only
-- if you need to revert):
-- =============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS "refresh_tokens" CASCADE;
-- COMMIT;

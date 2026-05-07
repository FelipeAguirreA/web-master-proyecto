-- F-Legal-2.1 (Ley 21.719): persistir aceptación de la política de privacidad y términos.
-- consentAcceptedAt: fecha y hora en que el usuario aceptó la política durante el registro.
-- consentVersion: versión de la política aceptada (formato YYYY-MM-DD, ver src/lib/privacy-policy-version.ts).
-- Ambos nullable: usuarios pre-existentes a esta migration NO tienen valor (no aceptaron esta versión).
--   Para ellos, F-Legal-3 implementará un flow de re-consent cuando vuelvan a entrar.

ALTER TABLE "users" ADD COLUMN "consentAcceptedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "consentVersion" TEXT;

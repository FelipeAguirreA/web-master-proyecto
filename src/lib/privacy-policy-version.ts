/**
 * Versión vigente de la Política de Privacidad y Términos.
 *
 * Esta constante es la ÚNICA fuente de verdad para:
 *   - El cookie consent banner (`src/lib/cookie-consent.ts`).
 *   - El registro de aceptación que se persiste en `User.consentVersion`.
 *
 * Cuando se actualicen los textos legales (`src/app/privacidad/page.tsx`
 * y `src/app/terminos/page.tsx`), bumpear esta versión:
 *   - Invalida los consents previos del banner (vuelve a aparecer a los users).
 *   - Para users registrados, su `consentVersion` queda desactualizado y
 *     se les debería pedir re-aceptación (flow a implementar en F-Legal-3).
 *
 * Formato: `YYYY-MM-DD` de la fecha de publicación de la nueva versión.
 */
export const PRIVACY_POLICY_VERSION = "2026-05-07";

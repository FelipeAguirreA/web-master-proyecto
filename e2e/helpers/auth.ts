import type { Page } from "@playwright/test";

/**
 * Credenciales seed de empresas (ver prisma/seed.ts).
 * Solo válidas en entorno local con db:seed corrido.
 */
export const SEED_COMPANY = {
  email: "techcorp@example.com",
  password: "Test1234!",
};

export const SEED_COMPANY_ALT = {
  email: "startupx@example.com",
  password: "Test1234!",
};

/**
 * Loguea como empresa usando el flow de credentials del login UI.
 * Deja la sesión activa en `page` (cookies de NextAuth) y queda en /dashboard/empresa.
 */
export async function loginAsCompany(
  page: Page,
  creds: { email: string; password: string } = SEED_COMPANY,
): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: /soy empresa/i }).click();

  await page.getByPlaceholder("nombre@empresa.cl").first().fill(creds.email);
  await page.getByPlaceholder("••••••••").first().fill(creds.password);

  // Hay 2 botones que matchean "Iniciar sesión": el TAB (que ya está activo)
  // y el SUBMIT del form. El submit es el último — tiene la flecha "→" y
  // type=submit. Usamos last() para apuntar al submit del form.
  await page
    .getByRole("button", { name: /iniciar sesión/i })
    .last()
    .click();

  await page.waitForURL("**/dashboard/empresa", { timeout: 15000 });
}

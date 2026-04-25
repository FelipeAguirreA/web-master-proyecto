import { test, expect } from "@playwright/test";

test.describe("Autenticación", () => {
  test("redirige a /login al intentar acceder a /dashboard sin sesión", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirige a /login al intentar acceder a /dashboard/empresa sin sesión", async ({
    page,
  }) => {
    await page.goto("/dashboard/empresa");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirige a /login al intentar acceder a /dashboard/estudiante sin sesión", async ({
    page,
  }) => {
    await page.goto("/dashboard/estudiante");
    await expect(page).toHaveURL(/\/login/);
  });

  test("la página de login muestra el botón de Google OAuth", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: /continuar con google/i }),
    ).toBeVisible();
  });

  test("la página de login muestra el logo de PractiX", async ({ page }) => {
    await page.goto("/login");
    // El logo es un Link cuyo accessible name es "PractiX" (el "P" del ícono
    // también se incluye, ej. "P PractiX"). Usamos regex flexible.
    await expect(
      page.getByRole("link", { name: /practix/i }).first(),
    ).toBeVisible();
  });

  // El flujo completo de Google OAuth no se puede automatizar en E2E sin un
  // mock de Google — requiere interacción con el IdP externo. Para cubrir
  // el post-login se usarían fixtures de sesión o un provider de test.
  test.skip("login con Google redirige al dashboard según el rol", async () => {
    // Implementar con NextAuth test utilities o fixtures de sesión
  });

  test.skip("usuario STUDENT es redirigido a /dashboard/estudiante", async () => {
    // Implementar con fixture de sesión de rol STUDENT
  });

  test.skip("usuario COMPANY es redirigido a /dashboard/empresa", async () => {
    // Implementar con fixture de sesión de rol COMPANY
  });
});

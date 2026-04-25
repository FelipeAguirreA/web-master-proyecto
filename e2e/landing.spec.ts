import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("muestra el título principal de PractiX", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: /encontrá prácticas/i }),
    ).toBeVisible();
  });

  test("el header muestra el link a Prácticas (apunta a /practicas)", async ({
    page,
  }) => {
    const link = page
      .getByRole("banner")
      .getByRole("link", { name: /^prácticas$/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/practicas");
  });

  test("el header muestra el link 'Iniciar sesión'", async ({ page }) => {
    // Hay 2 'Iniciar sesión' (header + footer) — scopeamos al banner
    await expect(
      page.getByRole("banner").getByRole("link", { name: /iniciar sesión/i }),
    ).toBeVisible();
  });

  test("el CTA 'Empezar gratis' del header navega a /login", async ({
    page,
  }) => {
    await page
      .getByRole("banner")
      .getByRole("link", { name: /empezar gratis/i })
      .click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("el listado de prácticas es accesible sin estar logueado", async ({
    page,
  }) => {
    await page
      .getByRole("banner")
      .getByRole("link", { name: /^prácticas$/i })
      .click();
    await expect(page).toHaveURL("/practicas");
    await expect(
      page.getByRole("heading", { level: 1, name: /prácticas que/i }),
    ).toBeVisible();
  });
});

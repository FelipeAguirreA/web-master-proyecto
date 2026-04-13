import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("muestra el título principal de PractiX", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /encuentra la práctica perfecta para ti/i,
      }),
    ).toBeVisible();
  });

  test("el botón CTA de estudiante redirige a la página de login", async ({
    page,
  }) => {
    await page.getByRole("link", { name: /soy estudiante/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("el botón CTA de empresa redirige a la página de login", async ({
    page,
  }) => {
    await page.getByRole("link", { name: /soy empresa/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("el header muestra el link de explorar prácticas", async ({ page }) => {
    const explorarLink = page.getByRole("link", { name: /explorar/i });
    await expect(explorarLink).toBeVisible();
    await expect(explorarLink).toHaveAttribute("href", "/practicas");
  });

  test("el header muestra el botón de iniciar sesión", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /iniciar sesión/i }),
    ).toBeVisible();
  });

  test("el listado de prácticas es accesible sin estar logueado", async ({
    page,
  }) => {
    await page.getByRole("link", { name: /explorar/i }).click();
    await expect(page).toHaveURL("/practicas");
    await expect(
      page.getByRole("heading", { name: /prácticas laborales/i }),
    ).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { SEED_COMPANY, loginAsCompany } from "./helpers/auth";

test.describe("Login empresa con credentials", () => {
  test("login con credenciales válidas redirige a /dashboard/empresa", async ({
    page,
  }) => {
    await loginAsCompany(page);
    await expect(page).toHaveURL(/\/dashboard\/empresa$/);
  });

  test("password incorrecto muestra error 'Correo o contraseña incorrectos'", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /soy empresa/i }).click();

    await page
      .getByPlaceholder("nombre@empresa.cl")
      .first()
      .fill(SEED_COMPANY.email);
    await page.getByPlaceholder("••••••••").first().fill("WrongPassword1!");

    await page
      .getByRole("button", { name: /iniciar sesión/i })
      .last()
      .click();

    await expect(
      page.getByText(/correo o contraseña incorrectos/i),
    ).toBeVisible({ timeout: 10000 });
    // No debe redirigir
    await expect(page).toHaveURL(/\/login/);
  });

  test("email inexistente muestra el mismo error genérico", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /soy empresa/i }).click();

    await page
      .getByPlaceholder("nombre@empresa.cl")
      .first()
      .fill("nadie@inexistente.cl");
    await page.getByPlaceholder("••••••••").first().fill("Test1234!");

    await page
      .getByRole("button", { name: /iniciar sesión/i })
      .last()
      .click();

    await expect(
      page.getByText(/correo o contraseña incorrectos/i),
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("el toggle de mostrar/ocultar contraseña funciona", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /soy empresa/i }).click();

    const passwordInput = page.getByPlaceholder("••••••••").first();
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page
      .getByRole("button", { name: /mostrar contraseña/i })
      .first()
      .click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await page
      .getByRole("button", { name: /ocultar contraseña/i })
      .first()
      .click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("link 'Olvidé mi contraseña' navega a /forgot-password", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /soy empresa/i }).click();
    await page.getByRole("link", { name: /olvidé mi contraseña/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

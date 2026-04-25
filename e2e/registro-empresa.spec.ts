import { test, expect } from "@playwright/test";

/**
 * Tests del formulario de registro empresa.
 * No envía la cuenta a la DB — solo prueba las validaciones cliente.
 */
test.describe("Registro empresa — validaciones", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /soy empresa/i }).click();
    await page.getByRole("button", { name: /crear cuenta/i }).click();
  });

  test("muestra el form 'Crear cuenta empresa' al cambiar a tab registro", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /crear cuenta empresa/i }),
    ).toBeVisible();
  });

  test("submit con form vacío muestra errores de campos obligatorios", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /crear cuenta empresa/i }).click();

    await expect(page.getByText("Mínimo 2 caracteres").first()).toBeVisible();
    await expect(page.getByText("El correo es obligatorio")).toBeVisible();
    await expect(page.getByText("La contraseña es obligatoria")).toBeVisible();
  });

  test("RUT con dígito verificador incorrecto muestra error 'RUT inválido'", async ({
    page,
  }) => {
    await page.getByPlaceholder("76.123.456-7").fill("76.123.456-9");
    await page.getByRole("button", { name: /crear cuenta empresa/i }).click();
    await expect(
      page.getByText(/RUT inválido. Verificá el dígito verificador/i),
    ).toBeVisible();
  });

  test("email genérico (gmail) sin marcar checkbox muestra error", async ({
    page,
  }) => {
    await page.getByPlaceholder("nombre@empresa.cl").fill("test@gmail.com");
    await page.getByRole("button", { name: /crear cuenta empresa/i }).click();
    await expect(page.getByText(/usá un correo corporativo/i)).toBeVisible();
  });

  test("marcar checkbox 'usa servicio genérico' permite gmail", async ({
    page,
  }) => {
    await page.getByPlaceholder("nombre@empresa.cl").fill("test@gmail.com");
    await page
      .getByText(/mi empresa usa gmail, outlook u otro servicio genérico/i)
      .click();
    await page.getByRole("button", { name: /crear cuenta empresa/i }).click();
    // Ahora el error de email corporativo NO debe aparecer
    await expect(
      page.getByText(/usá un correo corporativo/i),
    ).not.toBeVisible();
  });

  test("password débil (sin mayúscula) muestra error específico", async ({
    page,
  }) => {
    await page.getByPlaceholder("••••••••").first().fill("password123!");
    await page.getByRole("button", { name: /crear cuenta empresa/i }).click();
    await expect(
      page.getByText(/debe incluir al menos una mayúscula/i),
    ).toBeVisible();
  });

  test("password sin símbolo muestra error específico", async ({ page }) => {
    await page.getByPlaceholder("••••••••").first().fill("Password123");
    await page.getByRole("button", { name: /crear cuenta empresa/i }).click();
    await expect(
      page.getByText(/debe incluir al menos un símbolo/i),
    ).toBeVisible();
  });

  test("password fuerte muestra etiqueta 'Fuerte'", async ({ page }) => {
    await page.getByPlaceholder("••••••••").first().fill("StrongPass1!");
    await expect(page.getByText(/^Fuerte$/i)).toBeVisible();
  });

  test("confirm password que no coincide muestra error 'no coinciden'", async ({
    page,
  }) => {
    const passwordInputs = page.getByPlaceholder("••••••••");
    await passwordInputs.first().fill("StrongPass1!");
    await passwordInputs.last().fill("OtraDistinta1!");
    await page.getByRole("button", { name: /crear cuenta empresa/i }).click();
    await expect(page.getByText(/las contraseñas no coinciden/i)).toBeVisible();
  });

  test("toggle entre RUT y Extranjera cambia el placeholder", async ({
    page,
  }) => {
    await expect(page.getByPlaceholder("76.123.456-7")).toBeVisible();
    await page.getByRole("button", { name: /^extranjera$/i }).click();
    await expect(
      page.getByPlaceholder(/dni o registro mercantil/i),
    ).toBeVisible();
  });
});

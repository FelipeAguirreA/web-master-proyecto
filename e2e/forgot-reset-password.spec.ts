import { test, expect } from "@playwright/test";

test.describe("Forgot password", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
  });

  test("renderiza el formulario con título 'Olvidé mi contraseña'", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /olvidé mi contraseña/i }),
    ).toBeVisible();
  });

  test("submit con email vacío muestra error 'El correo es obligatorio'", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /enviar instrucciones/i }).click();
    await expect(page.getByText("El correo es obligatorio.")).toBeVisible();
  });

  test("submit con email inválido muestra error 'Ingresá un correo válido'", async ({
    page,
  }) => {
    // "test@test" pasa la validación HTML5 nativa de type=email (no requiere TLD)
    // pero falla nuestro regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` que sí lo exige.
    await page.getByPlaceholder("empresa@correo.com").fill("test@test");
    await page.getByRole("button", { name: /enviar instrucciones/i }).click();
    await expect(page.getByText("Ingresá un correo válido.")).toBeVisible();
  });

  test("submit con email válido muestra pantalla 'Revisá tu correo' (anti-enumeration)", async ({
    page,
  }) => {
    await page
      .getByPlaceholder("empresa@correo.com")
      .fill("techcorp@example.com");
    await page.getByRole("button", { name: /enviar instrucciones/i }).click();
    await expect(
      page.getByRole("heading", { name: /revisá tu correo/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("submit con email no registrado muestra la MISMA pantalla 'Revisá tu correo'", async ({
    page,
  }) => {
    await page
      .getByPlaceholder("empresa@correo.com")
      .fill("nadie@inexistente.cl");
    await page.getByRole("button", { name: /enviar instrucciones/i }).click();
    // Anti-enumeration: respuesta idéntica para email registrado o no
    await expect(
      page.getByRole("heading", { name: /revisá tu correo/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("link 'Volver al login' regresa a /login", async ({ page }) => {
    await page.getByRole("link", { name: /volver al login/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Reset password", () => {
  test("sin token en la URL muestra pantalla 'Enlace inválido'", async ({
    page,
  }) => {
    await page.goto("/reset-password");
    await expect(
      page.getByRole("heading", { name: /enlace inválido/i }),
    ).toBeVisible();
  });

  test("link 'Solicitar un nuevo enlace' navega a /forgot-password", async ({
    page,
  }) => {
    await page.goto("/reset-password");
    await page
      .getByRole("link", { name: /solicitar un nuevo enlace/i })
      .click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("con token inválido y password fuerte el backend rechaza con error", async ({
    page,
  }) => {
    await page.goto("/reset-password?token=token-falso-no-valido");

    await page.getByPlaceholder("Mínimo 8 caracteres").fill("NewPassword1!");
    await page.getByPlaceholder("Repetí tu contraseña").fill("NewPassword1!");

    await page.getByRole("button", { name: /actualizar contraseña/i }).click();

    await expect(
      page.getByText(/el enlace es inválido o ya expiró/i),
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("botón submit está deshabilitado mientras la password sea débil", async ({
    page,
  }) => {
    await page.goto("/reset-password?token=anything");
    await page.getByPlaceholder("Mínimo 8 caracteres").fill("weak");
    const submit = page.getByRole("button", {
      name: /actualizar contraseña/i,
    });
    await expect(submit).toBeDisabled();
  });

  test("botón submit deshabilitado si confirm no coincide", async ({
    page,
  }) => {
    await page.goto("/reset-password?token=anything");
    await page.getByPlaceholder("Mínimo 8 caracteres").fill("StrongPass1!");
    await page.getByPlaceholder("Repetí tu contraseña").fill("StrongPass2!");

    const submit = page.getByRole("button", {
      name: /actualizar contraseña/i,
    });
    await expect(submit).toBeDisabled();
    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
  });

  test("muestra confirmación visual cuando las passwords coinciden y son fuertes", async ({
    page,
  }) => {
    await page.goto("/reset-password?token=anything");
    await page.getByPlaceholder("Mínimo 8 caracteres").fill("StrongPass1!");
    await page.getByPlaceholder("Repetí tu contraseña").fill("StrongPass1!");

    await expect(page.getByText(/listo, coinciden/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /actualizar contraseña/i }),
    ).not.toBeDisabled();
  });
});

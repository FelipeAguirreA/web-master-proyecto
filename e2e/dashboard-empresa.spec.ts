import { test, expect } from "@playwright/test";
import { loginAsCompany } from "./helpers/auth";

test.describe("Dashboard empresa — sesión autenticada", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCompany(page);
  });

  test("login lleva a /dashboard/empresa con header 'Gestioná tu talento'", async ({
    page,
  }) => {
    await expect(page).toHaveURL(/\/dashboard\/empresa$/);
    await expect(
      page.getByRole("heading", { name: /gestioná tu/i }),
    ).toBeVisible();
  });

  test("muestra los counters de prácticas Activas y Completadas", async ({
    page,
  }) => {
    await expect(page.getByText(/^activas$/i)).toBeVisible();
    await expect(page.getByText(/^completadas$/i)).toBeVisible();
  });

  test("lista las prácticas seed de la empresa logueada", async ({ page }) => {
    // TechCorp tiene 3 prácticas seed (Frontend, Data Science, UX/UI)
    await expect(
      page.getByText(/Practicante Desarrollo Web Frontend/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("abrir el modal de detalle de una práctica muestra título + descripción + skills", async ({
    page,
  }) => {
    const practiceCard = page
      .getByText(/Practicante Desarrollo Web Frontend/i)
      .first();
    await practiceCard.click();

    // Modal abierto: aparece la sección "Descripción"
    await expect(page.getByText("Descripción")).toBeVisible({ timeout: 5000 });
    // Skills incluye TailwindCSS según el seed
    await expect(page.getByText("TailwindCSS")).toBeVisible();

    // Cerrar el modal — uso getByLabel exact porque "Cerrar" como name de botón
    // también matchea los botones de "completar práctica" en la lista (3 prácticas activas).
    await page.getByLabel("Cerrar", { exact: true }).click();
    await expect(page.getByText("Descripción")).not.toBeVisible();
  });

  test("click en 'ATS' de una práctica navega a /dashboard/empresa/ats/[id]", async ({
    page,
  }) => {
    const atsLink = page.getByRole("link", { name: /^ATS$/ }).first();
    await atsLink.click();
    await expect(page).toHaveURL(/\/dashboard\/empresa\/ats\/.+/, {
      timeout: 15000,
    });
    await expect(
      page.getByRole("heading", {
        name: /rankeá candidatos con criterios propios/i,
      }),
    ).toBeVisible();
  });

  test("abre el modal 'Nueva práctica' y valida campos obligatorios", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /nueva práctica/i }).click();
    await expect(
      page.getByRole("heading", { name: /publicá una vacante/i }),
    ).toBeVisible();

    // Submit vacío → muestra errores de validación
    await page.getByRole("button", { name: /publicar práctica/i }).click();
    await expect(
      page.getByText("El título debe tener al menos 3 caracteres"),
    ).toBeVisible();
    await expect(
      page.getByText("La descripción debe tener al menos 20 caracteres"),
    ).toBeVisible();
  });

  test("cerrar sesión vía cookie clearing redirige el dashboard a /login", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto("/dashboard/empresa");
    await expect(page).toHaveURL(/\/login/);
  });
});

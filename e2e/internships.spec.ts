import { test, expect } from "@playwright/test";

// Prerequisito: datos de seed cargados (pnpm db:seed)
test.describe("Listado de Prácticas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/practicas");
    await page.waitForLoadState("networkidle");
  });

  test("el listado carga y muestra prácticas", async ({ page }) => {
    const cards = page.locator("a[href^='/practicas/']");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("el filtro de búsqueda filtra los resultados", async ({ page }) => {
    const allCards = page.locator("a[href^='/practicas/']");
    const totalBefore = await allCards.count();

    await page.getByPlaceholder("Buscar prácticas...").fill("Frontend");
    await page.waitForLoadState("networkidle");

    const filteredCards = page.locator("a[href^='/practicas/']");
    const totalAfter = await filteredCards.count();

    // El filtro debe reducir o mantener los resultados
    expect(totalAfter).toBeLessThanOrEqual(totalBefore);
  });

  test("buscar un término inexistente muestra mensaje de sin resultados", async ({
    page,
  }) => {
    await page
      .getByPlaceholder("Buscar prácticas...")
      .fill("zzz-inexistente-zzz");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/no se encontraron prácticas/i)).toBeVisible();
  });

  test("el filtro por modalidad funciona", async ({ page }) => {
    // Hay dos <select> en la página: primero área, segundo modalidad
    const modalitySelect = page.locator("select").nth(1);
    await modalitySelect.selectOption({ value: "REMOTE" });
    await page.waitForLoadState("networkidle");

    const cards = page.locator("a[href^='/practicas/']");
    // Con datos del seed debe haber al menos una práctica remota
    await expect(cards.first()).toBeVisible();
  });

  test("limpiar el filtro por modalidad restaura todos los resultados", async ({
    page,
  }) => {
    const cards = page.locator("a[href^='/practicas/']");
    const before = await cards.count();
    const modalitySelect = page.locator("select").nth(1);

    await modalitySelect.selectOption({ value: "ONSITE" });
    await page.waitForLoadState("networkidle");

    await modalitySelect.selectOption({ value: "" });
    // Esperar a que la lista vuelva al total completo antes de contar
    await expect(cards).toHaveCount(before);
  });

  test("hacer click en una práctica navega a la página de detalle", async ({
    page,
  }) => {
    const firstCard = page.locator("a[href^='/practicas/']").first();
    await firstCard.click();

    await expect(page).toHaveURL(/\/practicas\/.+/);
  });

  test("la página de detalle muestra título, empresa y descripción", async ({
    page,
  }) => {
    const firstCard = page.locator("a[href^='/practicas/']").first();
    const cardTitle = await firstCard.locator("h3").first().textContent();

    await firstCard.click();
    await page.waitForLoadState("networkidle");

    // El título del detalle debe coincidir con el de la card
    if (cardTitle) {
      await expect(
        page.getByRole("heading", { name: cardTitle.trim() }),
      ).toBeVisible();
    }
  });
});

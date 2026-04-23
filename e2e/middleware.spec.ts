import { test, expect } from "@playwright/test";

test.describe("Middleware (Next.js)", () => {
  test("agrega header x-request-id en cada respuesta no-API", async ({
    request,
  }) => {
    const response = await request.get("/");
    const requestId = response.headers()["x-request-id"];
    expect(requestId).toBeDefined();
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test("redirige a /login al intentar acceder a /registro sin sesión", async ({
    page,
  }) => {
    await page.goto("/registro");
    await expect(page).toHaveURL(/\/login/);
  });
});

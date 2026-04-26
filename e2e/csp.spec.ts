import { test, expect } from "@playwright/test";

import { loginAsCompany } from "./helpers/auth";

const RUTAS_PUBLICAS = ["/", "/login", "/practicas"];

function captureCspViolations(page: import("@playwright/test").Page): string[] {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (
      /Content[- ]Security[- ]Policy/i.test(text) ||
      /Refused to (load|execute|apply|connect)/i.test(text)
    ) {
      violations.push(text);
    }
  });
  return violations;
}

test.describe("CSP — header presente y bien formado", () => {
  test("la response a / trae Content-Security-Policy con nonce y sin unsafe-eval", async ({
    request,
  }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy"];

    expect(csp).toBeDefined();
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("'unsafe-eval'");
    // unsafe-inline solo permitido en style-src, no en script-src
    const scriptSrc = csp!
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  test("dos requests consecutivos traen nonces distintos", async ({
    request,
  }) => {
    const r1 = await request.get("/");
    const r2 = await request.get("/");
    const nonce1 = r1
      .headers()
      ["content-security-policy"]?.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];
    const nonce2 = r2
      .headers()
      ["content-security-policy"]?.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];
    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toBe(nonce2);
  });
});

test.describe("CSP — sin violaciones en rutas públicas", () => {
  for (const ruta of RUTAS_PUBLICAS) {
    test(`${ruta} carga sin violaciones CSP en console`, async ({ page }) => {
      const violations = captureCspViolations(page);
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      expect(violations).toEqual([]);
    });
  }
});

test.describe("CSP — sin violaciones en dashboard autenticado", () => {
  test("/dashboard/empresa carga sin violaciones CSP", async ({ page }) => {
    const violations = captureCspViolations(page);
    await loginAsCompany(page);
    await page.waitForLoadState("networkidle");
    expect(violations).toEqual([]);
  });
});

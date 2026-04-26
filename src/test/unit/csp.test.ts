import { describe, it, expect } from "vitest";

import { generateNonce, buildCspHeader } from "@/server/lib/csp";

describe("generateNonce", () => {
  it("retorna un string base64 no vacío", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(nonce.length).toBeGreaterThan(20);
  });

  it("dos llamadas consecutivas producen nonces distintos", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
  });
});

describe("buildCspHeader (modo prod, default)", () => {
  const nonce = "test-nonce-abc123";
  const csp = buildCspHeader(nonce);

  function getDirective(name: string): string {
    const found = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith(`${name} `) || d === name);
    if (!found) throw new Error(`Directiva ${name} no encontrada en CSP`);
    return found;
  }

  it("incluye default-src 'self'", () => {
    expect(getDirective("default-src")).toBe("default-src 'self'");
  });

  it("incluye el nonce dentro de script-src", () => {
    expect(getDirective("script-src")).toContain(`'nonce-${nonce}'`);
  });

  it("NO contiene 'unsafe-eval' en ninguna directiva", () => {
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("NO contiene 'unsafe-inline' en script-src", () => {
    expect(getDirective("script-src")).not.toContain("'unsafe-inline'");
  });

  it("contiene 'strict-dynamic' en script-src para chunks de Next", () => {
    expect(getDirective("script-src")).toContain("'strict-dynamic'");
  });

  it("permite Sentry ingest en script-src", () => {
    expect(getDirective("script-src")).toContain("https://*.sentry.io");
  });

  it("mantiene 'unsafe-inline' en style-src (Tailwind/Radix/next-font)", () => {
    expect(getDirective("style-src")).toContain("'unsafe-inline'");
  });

  it("incluye Google Fonts en style-src y font-src", () => {
    expect(getDirective("style-src")).toContain("https://fonts.googleapis.com");
    expect(getDirective("font-src")).toContain("https://fonts.gstatic.com");
  });

  it("permite Supabase en img-src y connect-src", () => {
    expect(getDirective("img-src")).toContain("https://*.supabase.co");
    expect(getDirective("connect-src")).toContain("https://*.supabase.co");
  });

  it("permite avatares de Google OAuth en img-src", () => {
    expect(getDirective("img-src")).toContain(
      "https://lh3.googleusercontent.com",
    );
  });

  it("permite HuggingFace y Brevo en connect-src", () => {
    const connect = getDirective("connect-src");
    expect(connect).toContain("https://api-inference.huggingface.co");
    expect(connect).toContain("https://api.brevo.com");
  });

  it("incluye frame-ancestors 'none' (anti-clickjacking)", () => {
    expect(getDirective("frame-ancestors")).toBe("frame-ancestors 'none'");
  });

  it("incluye base-uri 'self' (anti-base-tag injection)", () => {
    expect(getDirective("base-uri")).toBe("base-uri 'self'");
  });

  it("incluye form-action 'self' (anti-form-exfiltration)", () => {
    expect(getDirective("form-action")).toBe("form-action 'self'");
  });

  it("incluye object-src 'none' (bloquea legacy plugins)", () => {
    expect(getDirective("object-src")).toBe("object-src 'none'");
  });

  it("separa directivas con punto y coma", () => {
    const directivas = csp
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    expect(directivas.length).toBeGreaterThanOrEqual(10);
  });
});

describe("buildCspHeader (modo dev)", () => {
  const nonce = "test-nonce-dev-xyz";
  const cspDev = buildCspHeader(nonce, true);
  const cspProd = buildCspHeader(nonce, false);

  it("agrega 'unsafe-eval' al script-src en dev (React 19 dev devtools)", () => {
    const scriptSrc = cspDev
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"));
    expect(scriptSrc).toContain("'unsafe-eval'");
  });

  it("NO agrega 'unsafe-eval' en prod (default false)", () => {
    expect(cspProd).not.toContain("'unsafe-eval'");
  });

  it("dev sigue conservando nonce y strict-dynamic (no se relaja todo)", () => {
    expect(cspDev).toContain(`'nonce-${nonce}'`);
    expect(cspDev).toContain("'strict-dynamic'");
  });

  it("dev sigue sin 'unsafe-inline' en script-src", () => {
    const scriptSrc = cspDev
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"));
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });
});

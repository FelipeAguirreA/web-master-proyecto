import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  readConsent,
  writeConsent,
  CONSENT_VERSION,
  CONSENT_STORAGE_KEY,
  CONSENT_CHANGE_EVENT,
  type ConsentState,
} from "@/lib/cookie-consent";

describe("cookie-consent — readConsent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("retorna null si no hay nada guardado", () => {
    expect(readConsent()).toBeNull();
  });

  it("retorna el consent guardado cuando la versión matchea", () => {
    const stored: ConsentState = {
      necessary: true,
      analytics: true,
      version: CONSENT_VERSION,
      timestamp: "2026-05-07T00:00:00.000Z",
    };
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    expect(readConsent()).toEqual(stored);
  });

  it("retorna null si la versión almacenada NO matchea (consent expirado)", () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        necessary: true,
        analytics: true,
        version: "2025-01-01",
        timestamp: "2025-01-01T00:00:00.000Z",
      }),
    );
    expect(readConsent()).toBeNull();
  });

  it("retorna null si analytics no es boolean (corrupto)", () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        necessary: true,
        analytics: "yes",
        version: CONSENT_VERSION,
      }),
    );
    expect(readConsent()).toBeNull();
  });

  it("retorna null si el JSON está corrupto", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "{ broken json");
    expect(readConsent()).toBeNull();
  });
});

describe("cookie-consent — writeConsent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persiste analytics=true con version y timestamp", () => {
    const result = writeConsent(true);
    expect(result.analytics).toBe(true);
    expect(result.necessary).toBe(true);
    expect(result.version).toBe(CONSENT_VERSION);
    expect(result.timestamp).toBeTruthy();
    const stored = JSON.parse(
      window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? "",
    );
    expect(stored).toEqual(result);
  });

  it("persiste analytics=false (rechazo de tracking)", () => {
    const result = writeConsent(false);
    expect(result.analytics).toBe(false);
    expect(readConsent()?.analytics).toBe(false);
  });

  it("dispatch CustomEvent con el state al persistir", () => {
    const handler = vi.fn();
    window.addEventListener(CONSENT_CHANGE_EVENT, handler);
    writeConsent(true);
    expect(handler).toHaveBeenCalledOnce();
    const ev = handler.mock.calls[0][0] as CustomEvent<ConsentState>;
    expect(ev.detail.analytics).toBe(true);
    window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
  });

  it("sobreescribe el consent anterior", () => {
    writeConsent(true);
    expect(readConsent()?.analytics).toBe(true);
    writeConsent(false);
    expect(readConsent()?.analytics).toBe(false);
  });
});

describe("cookie-consent — SSR safety", () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it("readConsent retorna null si window no existe (SSR)", () => {
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(readConsent()).toBeNull();
  });

  it("writeConsent no rompe si window no existe (SSR) — retorna el state igual", () => {
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const result = writeConsent(true);
    expect(result.analytics).toBe(true);
    expect(result.version).toBe(CONSENT_VERSION);
  });
});

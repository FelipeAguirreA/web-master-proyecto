import { describe, it, expect } from "vitest";
import type { ErrorEvent, EventHint } from "@sentry/nextjs";

import { sanitizeSentryEvent } from "@/lib/sentry-sanitize";

const emptyHint = {} as EventHint;

function makeEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return {
    type: undefined,
    ...overrides,
  } as ErrorEvent;
}

describe("sanitizeSentryEvent — user PII", () => {
  it("strippa user.email", () => {
    const result = sanitizeSentryEvent(
      makeEvent({ user: { id: "abc123", email: "leak@example.com" } }),
      emptyHint,
    );
    expect(result?.user?.email).toBeUndefined();
    expect(result?.user?.id).toBe("abc123");
  });

  it("strippa user.username", () => {
    const result = sanitizeSentryEvent(
      makeEvent({ user: { id: "abc", username: "felipe" } }),
      emptyHint,
    );
    expect(result?.user?.username).toBeUndefined();
  });

  it("strippa user.ip_address", () => {
    const result = sanitizeSentryEvent(
      makeEvent({ user: { id: "abc", ip_address: "8.8.8.8" } }),
      emptyHint,
    );
    expect(result?.user?.ip_address).toBeUndefined();
  });

  it("conserva user.id (UUID, no es PII directa)", () => {
    const result = sanitizeSentryEvent(
      makeEvent({ user: { id: "user-uuid-123" } }),
      emptyHint,
    );
    expect(result?.user?.id).toBe("user-uuid-123");
  });

  it("no rompe si no hay user", () => {
    const result = sanitizeSentryEvent(makeEvent({}), emptyHint);
    expect(result).toBeDefined();
  });
});

describe("sanitizeSentryEvent — request headers", () => {
  it("redacta cookie header", () => {
    const result = sanitizeSentryEvent(
      makeEvent({
        request: {
          headers: {
            cookie: "session=secret123",
            "user-agent": "Mozilla/5.0",
          },
        },
      }),
      emptyHint,
    );
    expect(result?.request?.headers?.cookie).toBe("[Filtered]");
    expect(result?.request?.headers?.["user-agent"]).toBe("Mozilla/5.0");
  });

  it("redacta authorization header", () => {
    const result = sanitizeSentryEvent(
      makeEvent({
        request: { headers: { authorization: "Bearer abc.def.ghi" } },
      }),
      emptyHint,
    );
    expect(result?.request?.headers?.authorization).toBe("[Filtered]");
  });

  it("redacta header en cualquier capitalización", () => {
    const result = sanitizeSentryEvent(
      makeEvent({
        request: { headers: { Cookie: "x=y", "X-API-Key": "secret" } },
      }),
      emptyHint,
    );
    expect(result?.request?.headers?.Cookie).toBe("[Filtered]");
    expect(result?.request?.headers?.["X-API-Key"]).toBe("[Filtered]");
  });

  it("strippa request.cookies", () => {
    const result = sanitizeSentryEvent(
      makeEvent({
        request: { cookies: { session: "s3cr3t" } },
      }),
      emptyHint,
    );
    expect(result?.request?.cookies).toBeUndefined();
  });

  it("conserva headers no sensibles intactos", () => {
    const result = sanitizeSentryEvent(
      makeEvent({
        request: {
          headers: {
            "content-type": "application/json",
            accept: "*/*",
          },
        },
      }),
      emptyHint,
    );
    expect(result?.request?.headers?.["content-type"]).toBe("application/json");
    expect(result?.request?.headers?.accept).toBe("*/*");
  });
});

describe("sanitizeSentryEvent — URL/query string", () => {
  it("redacta token en query string", () => {
    const result = sanitizeSentryEvent(
      makeEvent({
        request: {
          url: "https://practix.cl/reset?token=abc123secret&other=x",
        },
      }),
      emptyHint,
    );
    expect(result?.request?.url).toContain("token=%5BFiltered%5D");
    expect(result?.request?.url).toContain("other=x");
  });

  it("redacta password en query string", () => {
    const result = sanitizeSentryEvent(
      makeEvent({
        request: { url: "https://practix.cl/login?password=hunter2" },
      }),
      emptyHint,
    );
    expect(result?.request?.url).not.toContain("hunter2");
  });

  it("URL sin query strings sensibles queda intacta", () => {
    const result = sanitizeSentryEvent(
      makeEvent({ request: { url: "https://practix.cl/dashboard" } }),
      emptyHint,
    );
    expect(result?.request?.url).toBe("https://practix.cl/dashboard");
  });

  it("URL malformada no rompe — devuelve original", () => {
    const result = sanitizeSentryEvent(
      makeEvent({ request: { url: "not a url" } }),
      emptyHint,
    );
    expect(result?.request?.url).toBeDefined();
  });
});

describe("sanitizeSentryEvent — return contract", () => {
  it("retorna el event (no null) en caso normal", () => {
    const result = sanitizeSentryEvent(makeEvent({}), emptyHint);
    expect(result).not.toBeNull();
  });

  it("preserva otras propiedades del event", () => {
    const result = sanitizeSentryEvent(
      makeEvent({
        message: "Algo falló",
        level: "error",
        tags: { route: "api/auth" },
      }),
      emptyHint,
    );
    expect(result?.message).toBe("Algo falló");
    expect(result?.level).toBe("error");
    expect(result?.tags?.route).toBe("api/auth");
  });
});

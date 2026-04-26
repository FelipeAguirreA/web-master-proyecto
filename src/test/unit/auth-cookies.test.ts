import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { NEXTAUTH_URL: "http://localhost:3000" },
}));

import {
  buildSessionCookie,
  buildRefreshCookie,
  buildClearCookie,
  sessionCookieName,
  refreshCookieName,
  ACCESS_TOKEN_MAX_AGE_S,
  REFRESH_TOKEN_MAX_AGE_S,
} from "@/server/lib/auth-cookies";

describe("auth-cookies — nombres según protocolo", () => {
  it("usa nombre HTTP cuando NEXTAUTH_URL no es HTTPS", () => {
    expect(sessionCookieName).toBe("next-auth.session-token");
    expect(refreshCookieName).toBe("practix.refresh-token");
  });
});

describe("buildSessionCookie", () => {
  it("retorna shape de cookie con maxAge de 15 minutos", () => {
    const c = buildSessionCookie("jwt-string");
    expect(c).toEqual({
      name: sessionCookieName,
      value: "jwt-string",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE_S,
    });
    expect(ACCESS_TOKEN_MAX_AGE_S).toBe(15 * 60);
  });
});

describe("buildRefreshCookie", () => {
  it("retorna shape con maxAge de 7 días", () => {
    const c = buildRefreshCookie("raw-token");
    expect(c).toEqual({
      name: refreshCookieName,
      value: "raw-token",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE_S,
    });
    expect(REFRESH_TOKEN_MAX_AGE_S).toBe(7 * 24 * 60 * 60);
  });
});

describe("buildClearCookie", () => {
  it("retorna cookie con expires en epoch 0 para borrado inmediato", () => {
    const c = buildClearCookie("any-name");
    expect(c.name).toBe("any-name");
    expect(c.value).toBe("");
    expect(c.expires).toEqual(new Date(0));
    expect(c.httpOnly).toBe(true);
    expect(c.path).toBe("/");
    expect(c).not.toHaveProperty("maxAge");
  });
});

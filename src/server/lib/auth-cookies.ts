import { env } from "@/lib/env";

export const ACCESS_TOKEN_MAX_AGE_S = 15 * 60; // 15 min
export const REFRESH_TOKEN_MAX_AGE_S = 7 * 24 * 60 * 60; // 7 días

const useSecureCookies = env.NEXTAUTH_URL.startsWith("https://");

export const sessionCookieName = useSecureCookies
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

export const refreshCookieName = useSecureCookies
  ? "__Host-practix.refresh-token"
  : "practix.refresh-token";

export interface CookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge?: number;
  expires?: Date;
}

export function buildSessionCookie(jwt: string): CookieOptions {
  return {
    name: sessionCookieName,
    value: jwt,
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_S,
  };
}

export function buildRefreshCookie(rawToken: string): CookieOptions {
  return {
    name: refreshCookieName,
    value: rawToken,
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_S,
  };
}

export function buildClearCookie(name: string): CookieOptions {
  return {
    name,
    value: "",
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  };
}

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSignOut = vi.fn();
vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

import { logout } from "@/lib/client/logout";

describe("logout — cierre de sesión completo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("revoca el refresh server-side ANTES de cerrar la sesión NextAuth", async () => {
    const order: string[] = [];
    const fetchMock = vi.fn().mockImplementation(async () => {
      order.push("revoke");
      return { ok: true };
    });
    mockSignOut.mockImplementation(async () => {
      order.push("signOut");
    });
    vi.stubGlobal("fetch", fetchMock);

    await logout();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    // El orden importa: si signOut corriera primero, la cookie de sesión se
    // borraría y el POST a /logout podría no autenticar bien el revoke.
    expect(order).toEqual(["revoke", "signOut"]);
  });

  it("propaga el callbackUrl provisto (ej. borrado de cuenta)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    await logout("/?account_deleted=1");

    expect(mockSignOut).toHaveBeenCalledWith({
      callbackUrl: "/?account_deleted=1",
    });
  });

  it("cierra la sesión igual si el revoke server-side falla (red caída)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    await expect(logout()).resolves.toBeUndefined();
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});

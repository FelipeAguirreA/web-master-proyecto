import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { fetchWithRefresh, __testing } from "@/lib/client/fetch-with-refresh";

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  fetchSpy.mockReset();
  __testing.resetRefreshPromise();
  // window.location es read-only en jsdom, pero podemos sobreescribirlo
  // con defineProperty para spyear assign.
  Object.defineProperty(window, "location", {
    value: {
      pathname: "/dashboard",
      search: "",
      assign: vi.fn(),
    },
    writable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchWithRefresh — happy path", () => {
  it("retorna la respuesta original si no es 401", async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, { ok: true }));

    const res = await fetchWithRefresh("/api/internships");

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("forwardea init sin alterar shape (mismo origen ya es same-origin por default)", async () => {
    fetchSpy.mockResolvedValue(makeResponse(200));

    await fetchWithRefresh("/api/x", {
      method: "POST",
      headers: { "X-Custom": "1" },
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/x", {
      method: "POST",
      headers: { "X-Custom": "1" },
    });
  });

  it("permite credentials explícitos desde init", async () => {
    fetchSpy.mockResolvedValue(makeResponse(200));

    await fetchWithRefresh("/api/x", { credentials: "include" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/x",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("llama fetch con un solo argumento si no se pasa init", async () => {
    fetchSpy.mockResolvedValue(makeResponse(200));

    await fetchWithRefresh("/api/x");

    expect(fetchSpy).toHaveBeenCalledWith("/api/x");
  });
});

describe("fetchWithRefresh — interceptor 401", () => {
  it("llama a /api/auth/refresh y reintenta la original", async () => {
    fetchSpy
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200, { ok: true })) // /refresh
      .mockResolvedValueOnce(makeResponse(200, { data: "x" })); // retry

    const res = await fetchWithRefresh("/api/internships");

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy.mock.calls[1][0]).toBe("/api/auth/refresh");
  });

  it("redirige a /login si refresh falla con 401", async () => {
    fetchSpy
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(401)); // /refresh

    const res = await fetchWithRefresh("/api/x");

    expect(res.status).toBe(401);
    expect(window.location.assign).toHaveBeenCalledWith(
      "/login?callbackUrl=%2Fdashboard",
    );
  });

  it("redirige a /login si refresh tira excepción de red", async () => {
    fetchSpy
      .mockResolvedValueOnce(makeResponse(401))
      .mockRejectedValueOnce(new Error("network"));

    await fetchWithRefresh("/api/x");

    expect(window.location.assign).toHaveBeenCalledWith(
      expect.stringContaining("/login"),
    );
  });

  it("redirige a /login si tras refresh OK la original sigue en 401", async () => {
    fetchSpy
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200)) // /refresh OK
      .mockResolvedValueOnce(makeResponse(401)); // retry sigue 401

    await fetchWithRefresh("/api/x");

    expect(window.location.assign).toHaveBeenCalledWith(
      expect.stringContaining("/login"),
    );
  });

  it("NO entra en loop si la propia request es a /api/auth/refresh", async () => {
    fetchSpy.mockResolvedValueOnce(makeResponse(401));

    const res = await fetchWithRefresh("/api/auth/refresh", { method: "POST" });

    expect(res.status).toBe(401);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("NO intercepta /api/auth/logout (debe propagar el 401 sin refresh)", async () => {
    fetchSpy.mockResolvedValueOnce(makeResponse(401));

    const res = await fetchWithRefresh("/api/auth/logout", { method: "POST" });

    expect(res.status).toBe(401);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("preserva pathname + search en callbackUrl", async () => {
    Object.defineProperty(window, "location", {
      value: {
        pathname: "/practicas",
        search: "?area=tech",
        assign: vi.fn(),
      },
      writable: true,
    });
    fetchSpy
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(401));

    await fetchWithRefresh("/api/x");

    expect(window.location.assign).toHaveBeenCalledWith(
      "/login?callbackUrl=%2Fpracticas%3Farea%3Dtech",
    );
  });

  it("NO redirige si ya estamos en /login", async () => {
    Object.defineProperty(window, "location", {
      value: {
        pathname: "/login",
        search: "",
        assign: vi.fn(),
      },
      writable: true,
    });
    fetchSpy
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(401));

    await fetchWithRefresh("/api/x");

    expect(window.location.assign).not.toHaveBeenCalled();
  });
});

describe("fetchWithRefresh — single-flight", () => {
  it("dos requests 401 paralelas comparten una sola llamada a /refresh", async () => {
    let resolveRefresh!: (r: Response) => void;
    const refreshPending = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });

    fetchSpy
      .mockImplementationOnce(() => Promise.resolve(makeResponse(401)))
      .mockImplementationOnce(() => Promise.resolve(makeResponse(401)))
      .mockImplementationOnce(() => refreshPending) // /refresh queda pending
      .mockResolvedValueOnce(makeResponse(200, { a: 1 })) // retry req1
      .mockResolvedValueOnce(makeResponse(200, { b: 1 })); // retry req2

    const p1 = fetchWithRefresh("/api/a");
    const p2 = fetchWithRefresh("/api/b");

    // Pequeña espera para que ambas hayan llegado al punto de pedir refresh.
    await new Promise((r) => setTimeout(r, 0));

    resolveRefresh(makeResponse(200));

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    // 2 originales (401) + 1 refresh + 2 retries = 5 llamadas
    expect(fetchSpy).toHaveBeenCalledTimes(5);
    const refreshCalls = fetchSpy.mock.calls.filter(
      (c) => c[0] === "/api/auth/refresh",
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("tras un refresh completado se permite un nuevo refresh en próxima 401", async () => {
    fetchSpy
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200)) // /refresh 1
      .mockResolvedValueOnce(makeResponse(200)) // retry 1
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200)) // /refresh 2
      .mockResolvedValueOnce(makeResponse(200)); // retry 2

    await fetchWithRefresh("/api/a");
    await fetchWithRefresh("/api/b");

    const refreshCalls = fetchSpy.mock.calls.filter(
      (c) => c[0] === "/api/auth/refresh",
    );
    expect(refreshCalls).toHaveLength(2);
  });
});

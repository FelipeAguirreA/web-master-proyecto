import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useUnreadCount } from "@/hooks/useUnreadCount";

const mockJsonResponse = (data: unknown, ok = true) =>
  ({
    ok,
    json: () => Promise.resolve(data),
  }) as Response;

// El hook ahora vive con visibilitychange + interval. Usamos fake timers para
// avanzar el interval y un mock sobre `document.visibilityState` cuando hace
// falta verificar la pausa por tab oculto.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // Por defecto la tab arranca visible. Cada test puede sobreescribir.
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useUnreadCount", () => {
  it("hace fetch inicial al endpoint /api/chat/unread-count", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse({ count: 0 }));

    renderHook(() => useUnreadCount());

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/chat/unread-count");
    });
  });

  it("lee el count del response y lo expone como state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse({ count: 8 }),
    );

    const { result } = renderHook(() => useUnreadCount());

    await waitFor(() => {
      expect(result.current).toBe(8);
    });
  });

  it("mantiene unread en 0 si count viene undefined", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse({ other: "field" }),
    );

    const { result } = renderHook(() => useUnreadCount());

    await act(async () => {
      await Promise.resolve();
    });
    // count missing → no se setea, queda en 0 inicial.
    expect(result.current).toBe(0);
  });

  it("mantiene unread en 0 si count NO es number", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse({ count: "8" }),
    );

    const { result } = renderHook(() => useUnreadCount());

    await act(async () => {
      await Promise.resolve();
    });
    // typeof check rechaza string.
    expect(result.current).toBe(0);
  });

  it("ignora la respuesta si ok=false", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse({ count: 99 }, false),
    );

    const { result } = renderHook(() => useUnreadCount());

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(0);
  });

  it("captura silenciosamente errores de fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useUnreadCount());

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(0);
  });

  it("hace polling cada 30s mientras la tab esta visible", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse({ count: 0 }));

    renderHook(() => useUnreadCount());

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
  });

  it("limpia el interval al desmontar", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse({ count: 0 }));

    const { unmount } = renderHook(() => useUnreadCount());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    // Sin nuevo fetch despues del unmount, ni siquiera tras avanzar 60s.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

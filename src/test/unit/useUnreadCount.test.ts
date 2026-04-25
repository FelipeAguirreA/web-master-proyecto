import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useUnreadCount } from "@/hooks/useUnreadCount";

const mockJsonResponse = (data: unknown) =>
  ({
    ok: true,
    json: () => Promise.resolve(data),
  }) as Response;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useUnreadCount", () => {
  it("hace fetch inicial al endpoint /api/chat/conversations", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse([]));

    renderHook(() => useUnreadCount());

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/chat/conversations");
    });
  });

  it("suma el unreadCount de todas las conversaciones", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse([
        { unreadCount: 3 },
        { unreadCount: 5 },
        { unreadCount: 0 },
      ]),
    );

    const { result } = renderHook(() => useUnreadCount());

    await waitFor(() => {
      expect(result.current).toBe(8);
    });
  });

  it("trata unreadCount undefined como 0", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse([{ unreadCount: 2 }, {}, { unreadCount: 1 }]),
    );

    const { result } = renderHook(() => useUnreadCount());

    await waitFor(() => {
      expect(result.current).toBe(3);
    });
  });

  it("queda en 0 si data no es array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse({ error: "boom" }),
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

  it("hace polling cada 5s", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse([]));

    renderHook(() => useUnreadCount());

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
  });

  it("limpia el interval al desmontar", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse([]));

    const { unmount } = renderHook(() => useUnreadCount());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

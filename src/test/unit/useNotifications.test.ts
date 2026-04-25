import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useNotifications } from "@/hooks/useNotifications";

const buildNotif = (
  id: string,
  read = false,
): {
  id: string;
  type: "APPLICATION_REVIEWED";
  title: string;
  body: string;
  read: boolean;
  entityId: null;
  createdAt: string;
} => ({
  id,
  type: "APPLICATION_REVIEWED",
  title: `Title ${id}`,
  body: `Body ${id}`,
  read,
  entityId: null,
  createdAt: "2026-04-25T00:00:00.000Z",
});

const mockJsonResponse = (data: unknown, ok = true) =>
  ({
    ok,
    json: () => Promise.resolve(data),
  }) as Response;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useNotifications", () => {
  it("hace fetch inicial y carga las notificaciones en el state", async () => {
    const data = [buildNotif("n1"), buildNotif("n2", true)];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse(data));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/notifications");
    expect(result.current.unreadCount).toBe(1);
  });

  it("setea notifications a [] si fetch responde !ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse([], false),
    );

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.notifications).toEqual([]);
  });

  it("setea notifications a [] cuando data es null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockJsonResponse(null));

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.notifications).toEqual([]);
  });

  it("captura silenciosamente errores de fetch (catch)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.notifications).toEqual([]);
  });

  it("hace polling cada 10s", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse([]));

    renderHook(() => useNotifications());

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
  });

  it("limpia el interval al desmontar", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse([]));

    const { unmount } = renderHook(() => useNotifications());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("markAllRead hace PATCH y marca todas como leídas", async () => {
    const initial = [
      buildNotif("n1"),
      buildNotif("n2"),
      buildNotif("n3", true),
    ];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse(initial));

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(3);
    });

    fetchSpy.mockResolvedValueOnce(mockJsonResponse({}));
    await act(async () => {
      await result.current.markAllRead();
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/notifications/read-all", {
      method: "PATCH",
    });
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("deleteNotification hace optimistic remove y DELETE al endpoint", async () => {
    const initial = [buildNotif("n1"), buildNotif("n2")];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse(initial));

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    fetchSpy.mockResolvedValueOnce(mockJsonResponse({}, true));
    await act(async () => {
      await result.current.deleteNotification("n1");
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/notifications/n1", {
      method: "DELETE",
    });
    expect(result.current.notifications.map((n) => n.id)).toEqual(["n2"]);
  });

  it("deleteNotification revierte el optimistic update si la API falla", async () => {
    const initial = [buildNotif("n1"), buildNotif("n2")];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse(initial));

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    fetchSpy.mockResolvedValueOnce(mockJsonResponse({}, false));
    await act(async () => {
      await result.current.deleteNotification("n1");
    });

    expect(result.current.notifications.map((n) => n.id)).toEqual(["n1", "n2"]);
  });

  it("refresh dispara un fetch manual sin esperar al interval", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse([]));

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const before = fetchSpy.mock.calls.length;

    await act(async () => {
      result.current.refresh();
      await Promise.resolve();
    });

    expect(fetchSpy.mock.calls.length).toBe(before + 1);
  });
});

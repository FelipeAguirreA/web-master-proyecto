import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const {
  useSessionMock,
  channelMock,
  removeChannelMock,
  subscribeMock,
  onMock,
} = vi.hoisted(() => {
  const subscribeMock = vi.fn();
  const onMock = vi.fn((..._args: unknown[]) => ({ subscribe: subscribeMock }));
  const channelMock = vi.fn(() => ({ on: onMock, subscribe: subscribeMock }));
  const removeChannelMock = vi.fn();
  return {
    useSessionMock: vi.fn(),
    channelMock,
    removeChannelMock,
    subscribeMock,
    onMock,
  };
});

vi.mock("next-auth/react", () => ({
  useSession: useSessionMock,
}));

vi.mock("@/lib/supabase/realtime-client", () => ({
  supabaseRealtime: {
    channel: channelMock,
    removeChannel: removeChannelMock,
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/chat/MessageBubble", () => ({
  default: ({
    content,
    isMine,
    senderName,
  }: {
    content: string;
    isMine: boolean;
    senderName: string;
  }) => (
    <div
      data-testid="message-bubble"
      data-is-mine={isMine}
      data-sender-name={senderName}
    >
      {content}
    </div>
  ),
}));

vi.mock("@/components/chat/InterviewMessageCard", () => ({
  default: ({ content, isMine }: { content: string; isMine: boolean }) => (
    <div data-testid="interview-card" data-is-mine={isMine}>
      {content}
    </div>
  ),
}));

vi.mock("@/components/chat/MessageInput", () => ({
  default: ({
    onSend,
    disabled,
  }: {
    onSend: (c: string) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="message-input">
      <input
        data-testid="msg-input"
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSend((e.target as HTMLInputElement).value);
          }
        }}
      />
    </div>
  ),
}));

import ChatWindow from "@/components/chat/ChatWindow";

const buildMeta = (overrides: Record<string, unknown> = {}) => ({
  id: "conv-1",
  companyId: "comp-1",
  studentId: "stu-1",
  company: {
    id: "comp-1",
    name: "TechCorp",
    contactName: "Ana López",
    image: null,
  },
  student: {
    id: "stu-1",
    name: "Juan Pérez",
    image: null,
  },
  application: {
    internship: {
      id: "int-1",
      title: "Backend Intern",
      company: { companyName: "TechCorp" },
    },
  },
  ...overrides,
});

const buildMessage = (
  overrides: Partial<{
    id: string;
    content: string;
    senderId: string | null;
    type: "TEXT" | "INTERVIEW";
    sender: {
      id: string;
      name: string;
      image: string | null;
      role: string;
    } | null;
  }> = {},
) => ({
  id: "msg-1",
  conversationId: "conv-1",
  senderId: "stu-1",
  content: "Hola",
  type: "TEXT" as const,
  createdAt: "2026-04-25T10:00:00.000Z",
  sender: {
    id: "stu-1",
    name: "Juan Pérez",
    image: null,
    role: "STUDENT",
  },
  ...overrides,
});

const setSession = (
  role: "COMPANY" | "STUDENT" = "COMPANY",
  userId = "comp-1",
) => {
  useSessionMock.mockReturnValue({
    data: {
      user: { id: userId, name: "Yo", image: null, role, email: "" },
    },
  });
};

const mockFetch = (
  metaResp: unknown,
  msgsResp: { messages: unknown[] },
  metaOk = true,
  msgsOk = true,
) => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  fetchSpy.mockImplementation((url: RequestInfo | URL) => {
    const u = String(url);
    if (u.includes("/messages")) {
      return Promise.resolve({
        ok: msgsOk,
        json: () => Promise.resolve(msgsResp),
      } as Response);
    }
    return Promise.resolve({
      ok: metaOk,
      json: () => Promise.resolve(metaResp),
    } as Response);
  });
  return fetchSpy;
};

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  setSession("COMPANY");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ChatWindow", () => {
  describe("loading state", () => {
    it("muestra spinner mientras carga", () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(
        () => new Promise(() => {}),
      );

      const { container } = render(<ChatWindow conversationId="conv-1" />);

      expect(container.querySelector(".animate-spin")).not.toBeNull();
    });

    it("retorna null si meta no se carga (metaOk=false)", async () => {
      mockFetch(null, { messages: [] }, false);

      const { container } = render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        expect(container.querySelector(".animate-spin")).toBeNull();
      });
      expect(container.firstChild).toBeNull();
    });
  });

  describe("header — modo COMPANY", () => {
    beforeEach(() => setSession("COMPANY"));

    it("muestra el nombre del estudiante en el header", async () => {
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      });
    });

    it("muestra Building2 NO se usa para empresa cuando user es COMPANY (otherPerson=student)", async () => {
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );
      // Para COMPANY mirando student → fallback es la inicial "J", no Building2
      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("muestra link al calendario", async () => {
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /Calendario/ });
        expect(link).toHaveAttribute("href", "/dashboard/empresa/calendar");
      });
    });

    it("muestra el título de la práctica", async () => {
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        expect(screen.getByText("Backend Intern")).toBeInTheDocument();
      });
    });
  });

  describe("header — modo STUDENT", () => {
    beforeEach(() => setSession("STUDENT", "stu-1"));

    it("muestra 'contactName · companyName' como header name", async () => {
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        expect(screen.getByText("Ana López · TechCorp")).toBeInTheDocument();
      });
    });

    it("NO muestra link al calendario", async () => {
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() =>
        expect(screen.getByText(/Ana López/)).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("link", { name: /Calendario/ }),
      ).not.toBeInTheDocument();
    });

    it("muestra Building2 como fallback de avatar cuando other es company", async () => {
      mockFetch(buildMeta(), { messages: [] });

      const { container } = render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() =>
        expect(screen.getByText(/Ana López/)).toBeInTheDocument(),
      );
      // Building2 svg debería estar — fallback de empresa
      const svg = container.querySelector("header svg, div svg");
      expect(svg).not.toBeNull();
    });
  });

  describe("avatar de la otra persona", () => {
    it("muestra la imagen cuando hay image", async () => {
      mockFetch(
        buildMeta({
          student: {
            id: "stu-1",
            name: "Juan",
            image: "https://x.com/avatar.jpg",
          },
        }),
        { messages: [] },
      );
      setSession("COMPANY");

      render(<ChatWindow conversationId="conv-1" />);

      const img = await screen.findByAltText("Juan");
      expect(img).toHaveAttribute("src", "https://x.com/avatar.jpg");
    });

    it("cae al fallback cuando la imagen falla a cargar (onError)", async () => {
      mockFetch(
        buildMeta({
          student: {
            id: "stu-1",
            name: "Juan",
            image: "https://x.com/broken.jpg",
          },
        }),
        { messages: [] },
      );
      setSession("COMPANY");

      render(<ChatWindow conversationId="conv-1" />);

      const img = await screen.findByAltText("Juan");
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.queryByAltText("Juan")).not.toBeInTheDocument();
      });
      expect(screen.getByText("J")).toBeInTheDocument();
    });
  });

  describe("back button", () => {
    it("NO muestra back button por defecto", async () => {
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );
      expect(screen.queryByLabelText("Volver")).not.toBeInTheDocument();
    });

    it("muestra back button cuando showBackButton=true", async () => {
      mockFetch(buildMeta(), { messages: [] });

      render(
        <ChatWindow conversationId="conv-1" showBackButton onBack={vi.fn()} />,
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Volver")).toBeInTheDocument();
      });
    });

    it("dispara onBack al click", async () => {
      mockFetch(buildMeta(), { messages: [] });
      const onBack = vi.fn();

      render(
        <ChatWindow conversationId="conv-1" showBackButton onBack={onBack} />,
      );

      const back = await screen.findByLabelText("Volver");
      fireEvent.click(back);
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe("empty state de mensajes", () => {
    it("COMPANY → 'Enviá el primer mensaje...'", async () => {
      setSession("COMPANY");
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Enviá el primer mensaje/)).toBeInTheDocument();
      });
    });

    it("STUDENT sin mensajes → 'Cuando la empresa te contacte...'", async () => {
      setSession("STUDENT", "stu-1");
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        expect(
          screen.getByText(/Cuando la empresa te contacte/),
        ).toBeInTheDocument();
      });
    });

    it("STUDENT sin mensajes → MessageInput está disabled", async () => {
      setSession("STUDENT", "stu-1");
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      const input = await screen.findByTestId("msg-input");
      expect(input).toBeDisabled();
    });

    it("STUDENT con mensajes → MessageInput NO está disabled", async () => {
      setSession("STUDENT", "stu-1");
      mockFetch(buildMeta(), {
        messages: [buildMessage({ senderId: "comp-1" })],
      });

      render(<ChatWindow conversationId="conv-1" />);

      const input = await screen.findByTestId("msg-input");
      expect(input).not.toBeDisabled();
    });
  });

  describe("render de mensajes", () => {
    it("renderiza MessageBubble para mensajes TEXT", async () => {
      mockFetch(buildMeta(), {
        messages: [
          buildMessage({ id: "m1", content: "Hola", type: "TEXT" }),
          buildMessage({ id: "m2", content: "Como estás?", type: "TEXT" }),
        ],
      });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        expect(screen.getAllByTestId("message-bubble")).toHaveLength(2);
      });
      expect(screen.getByText("Hola")).toBeInTheDocument();
    });

    it("renderiza InterviewMessageCard para mensajes INTERVIEW", async () => {
      mockFetch(buildMeta(), {
        messages: [
          buildMessage({
            id: "iv-1",
            content: '{"title":"E1"}',
            type: "INTERVIEW",
          }),
        ],
      });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        expect(screen.getByTestId("interview-card")).toBeInTheDocument();
      });
    });

    it("marca isMine=true cuando senderId === userId", async () => {
      setSession("COMPANY", "comp-1");
      mockFetch(buildMeta(), {
        messages: [
          buildMessage({ id: "m1", senderId: "comp-1", content: "mio" }),
          buildMessage({ id: "m2", senderId: "stu-1", content: "ajeno" }),
        ],
      });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        const bubbles = screen.getAllByTestId("message-bubble");
        expect(bubbles[0].getAttribute("data-is-mine")).toBe("true");
        expect(bubbles[1].getAttribute("data-is-mine")).toBe("false");
      });
    });

    it("muestra 'Usuario eliminado' cuando sender es null (user borrado)", async () => {
      setSession("COMPANY", "comp-1");
      mockFetch(buildMeta(), {
        messages: [
          buildMessage({
            id: "ghost",
            senderId: null,
            sender: null,
            content: "msg de un user borrado",
          }),
        ],
      });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => {
        const bubble = screen.getByTestId("message-bubble");
        expect(bubble.getAttribute("data-sender-name")).toBe(
          "Usuario eliminado",
        );
        expect(bubble.getAttribute("data-is-mine")).toBe("false");
      });
    });
  });

  describe("envío de mensajes", () => {
    it("envío exitoso hace POST y refetch", async () => {
      const fetchSpy = mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => screen.getByText(/Enviá el primer mensaje/));

      const input = screen.getByTestId("msg-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "hola" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/chat/conversations/conv-1/messages",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: "hola" }),
          }),
        );
      });
    });

    it("muestra el mensaje optimistic inmediatamente", async () => {
      mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);
      await waitFor(() => screen.getByText(/Enviá el primer mensaje/));

      const input = screen.getByTestId("msg-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "optimistic-msg" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(screen.getByText("optimistic-msg")).toBeInTheDocument();
      });
    });

    it("revierte el optimistic update si la API responde !ok", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy.mockImplementation((url: RequestInfo | URL, opts) => {
        const u = String(url);
        if (opts?.method === "POST") {
          return Promise.resolve({ ok: false } as Response);
        }
        if (u.includes("/messages")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ messages: [] }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(buildMeta()),
        } as Response);
      });

      render(<ChatWindow conversationId="conv-1" />);
      await waitFor(() => screen.getByText(/Enviá el primer mensaje/));

      const input = screen.getByTestId("msg-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "fallido" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(screen.queryByText("fallido")).not.toBeInTheDocument();
      });
    });

    it("revierte el optimistic update si fetch lanza excepción", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy.mockImplementation((_, opts) => {
        if (opts?.method === "POST") {
          return Promise.reject(new Error("network"));
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              String(_).includes("/messages") ? { messages: [] } : buildMeta(),
            ),
        } as Response);
      });

      render(<ChatWindow conversationId="conv-1" />);
      await waitFor(() => screen.getByText(/Enviá el primer mensaje/));

      const input = screen.getByTestId("msg-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "boom" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(screen.queryByText("boom")).not.toBeInTheDocument();
      });
    });
  });

  describe("realtime supabase", () => {
    it("se subscribe al canal conversation:{id} y se desubscribe al unmount", async () => {
      mockFetch(buildMeta(), { messages: [] });

      const { unmount } = render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() =>
        expect(channelMock).toHaveBeenCalledWith("conversation:conv-1"),
      );

      unmount();
      expect(removeChannelMock).toHaveBeenCalled();
    });

    it("dispara refetch cuando llega un payload INSERT del mismo conversationId", async () => {
      const fetchSpy = mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      // El handler del INSERT está en el segundo argumento de onMock
      const handler = onMock.mock.calls[0]?.[2] as
        | ((payload: {
            new: { conversationId: string };
          }) => Promise<void> | void)
        | undefined;
      expect(typeof handler).toBe("function");

      const callsBefore = fetchSpy.mock.calls.length;
      await handler!({ new: { conversationId: "conv-1" } });
      // Tras el handler, debe haber al menos un fetch nuevo (el refetch de mensajes)
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it("ignora payloads INSERT de otra conversación", async () => {
      const fetchSpy = mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      const handler = onMock.mock.calls[0]?.[2] as
        | ((payload: {
            new: { conversationId: string };
          }) => Promise<void> | void)
        | undefined;
      const callsBefore = fetchSpy.mock.calls.length;
      await handler!({ new: { conversationId: "otra-conv" } });
      expect(fetchSpy.mock.calls.length).toBe(callsBefore);
    });
  });

  describe("polling", () => {
    it("hace refetch cada 3s mientras esté montado", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const fetchSpy = mockFetch(buildMeta(), { messages: [] });

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      const callsBefore = fetchSpy.mock.calls.length;

      await vi.advanceTimersByTimeAsync(3100);
      await waitFor(() => {
        expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    });

    it("scrollToBottom corre cuando llegan mensajes nuevos via refetch (no primer load)", async () => {
      const messagesPerCall = [
        { messages: [buildMessage({ id: "m1", content: "Hola" })] },
        {
          messages: [
            buildMessage({ id: "m1", content: "Hola" }),
            buildMessage({ id: "m2", content: "Nuevo" }),
          ],
        },
      ];
      let msgsCallIdx = 0;
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy.mockImplementation((url: RequestInfo | URL) => {
        const u = String(url);
        if (u.includes("/messages")) {
          const data = messagesPerCall[Math.min(msgsCallIdx, 1)];
          msgsCallIdx++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(data),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(buildMeta()),
        } as Response);
      });

      vi.useFakeTimers({ shouldAdvanceTime: true });
      const scrollSpy = vi.fn();
      Element.prototype.scrollIntoView = scrollSpy;

      render(<ChatWindow conversationId="conv-1" />);

      await waitFor(() => expect(screen.getByText("Hola")).toBeInTheDocument());

      // Avanzar para que el polling dispare el segundo fetch con un nuevo mensaje
      await vi.advanceTimersByTimeAsync(3100);

      await waitFor(() => {
        expect(screen.getByText("Nuevo")).toBeInTheDocument();
      });
      // scrollIntoView se llamó tanto en first-load como en hasNewMessages
      expect(scrollSpy).toHaveBeenCalled();
    });
  });
});

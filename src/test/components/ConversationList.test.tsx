import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ConversationList from "@/components/chat/ConversationList";

const mockUseSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

const STUDENT_SESSION = {
  data: { user: { id: "u-1", role: "STUDENT" } },
  status: "authenticated",
};

const COMPANY_SESSION = {
  data: { user: { id: "u-2", role: "COMPANY" } },
  status: "authenticated",
};

const buildConversation = (
  overrides: Partial<Record<string, unknown>> = {},
) => ({
  id: "conv-1",
  companyId: "c-1",
  studentId: "s-1",
  company: { id: "c-1", name: "Acme Corp", image: null },
  student: { id: "s-1", name: "Juan Pérez", image: null },
  internship: { id: "i-1", title: "Pasantía Frontend" },
  lastMessage: {
    content: "Mensaje de prueba",
    type: "TEXT",
    createdAt: new Date().toISOString(),
    senderId: "c-1",
    isRead: false,
  },
  unreadCount: 0,
  hasPendingInterview: false,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockFetchOnce = (data: unknown) => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(data),
  }) as unknown as typeof fetch;
};

describe("ConversationList", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue(STUDENT_SESSION);
    mockFetchOnce([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("muestra spinner mientras carga (antes de la primera respuesta)", () => {
      // Fetch que nunca resuelve durante el test
      globalThis.fetch = vi.fn(
        () => new Promise(() => {}),
      ) as unknown as typeof fetch;
      const { container } = render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("muestra mensaje para STUDENT cuando no hay conversaciones", async () => {
      mockUseSession.mockReturnValue(STUDENT_SESSION);
      mockFetchOnce([]);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      expect(
        await screen.findByText(
          "Cuando una empresa te contacte, los mensajes aparecerán acá.",
        ),
      ).toBeInTheDocument();
    });

    it("muestra mensaje para COMPANY cuando no hay conversaciones", async () => {
      mockUseSession.mockReturnValue(COMPANY_SESSION);
      mockFetchOnce([]);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      expect(
        await screen.findByText(
          "Contactá candidatos desde el panel ATS para iniciar conversaciones.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("header con total unread", () => {
    it("renderiza el header 'Mensajes' siempre", async () => {
      mockFetchOnce([]);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      expect(await screen.findByText("Mensajes")).toBeInTheDocument();
    });

    it("muestra total de no leídos sumando todas las conversaciones", async () => {
      mockFetchOnce([
        buildConversation({ id: "c-1", unreadCount: 3 }),
        buildConversation({ id: "c-2", unreadCount: 5 }),
      ]);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      expect(await screen.findByText("8 sin leer")).toBeInTheDocument();
    });

    it("no muestra badge de total cuando todas las conversaciones están leídas", async () => {
      mockFetchOnce([
        buildConversation({ id: "c-1", unreadCount: 0 }),
        buildConversation({ id: "c-2", unreadCount: 0 }),
      ]);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      await screen.findByText("Mensajes");
      expect(screen.queryByText(/sin leer$/)).not.toBeInTheDocument();
    });
  });

  describe("render de lista", () => {
    it("renderiza un ConversationItem por cada conversación", async () => {
      mockFetchOnce([
        buildConversation({
          id: "c-1",
          internship: { id: "i-1", title: "Práctica A" },
        }),
        buildConversation({
          id: "c-2",
          internship: { id: "i-2", title: "Práctica B" },
        }),
      ]);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      expect(await screen.findByText("Práctica A")).toBeInTheDocument();
      expect(screen.getByText("Práctica B")).toBeInTheDocument();
    });

    it("para STUDENT muestra el nombre de la empresa como otherPerson", async () => {
      mockUseSession.mockReturnValue(STUDENT_SESSION);
      mockFetchOnce([
        buildConversation({
          company: { id: "c-1", name: "Acme Corp", image: null },
          student: { id: "s-1", name: "Juan Pérez", image: null },
        }),
      ]);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
      expect(screen.queryByText("Juan Pérez")).not.toBeInTheDocument();
    });

    it("para COMPANY muestra el nombre del estudiante como otherPerson", async () => {
      mockUseSession.mockReturnValue(COMPANY_SESSION);
      mockFetchOnce([
        buildConversation({
          company: { id: "c-1", name: "Acme Corp", image: null },
          student: { id: "s-1", name: "Juan Pérez", image: null },
        }),
      ]);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      expect(await screen.findByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    });
  });

  describe("selección activa", () => {
    it("dispara onSelect con el id de la conversación al hacer click", async () => {
      const onSelect = vi.fn();
      mockFetchOnce([buildConversation({ id: "conv-xyz" })]);
      render(
        <ConversationList activeConversationId={null} onSelect={onSelect} />,
      );
      const item = await screen.findByText("Pasantía Frontend");
      fireEvent.click(item);
      expect(onSelect).toHaveBeenCalledWith("conv-xyz");
    });
  });

  describe("hasPendingInterview por rol", () => {
    it("muestra 'Cita sin enviar' a COMPANY cuando hay pending", async () => {
      mockUseSession.mockReturnValue(COMPANY_SESSION);
      mockFetchOnce([buildConversation({ hasPendingInterview: true })]);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      expect(await screen.findByText("Cita sin enviar")).toBeInTheDocument();
    });

    it("NO muestra 'Cita sin enviar' a STUDENT aunque la conv tenga pending", async () => {
      mockUseSession.mockReturnValue(STUDENT_SESSION);
      mockFetchOnce([buildConversation({ hasPendingInterview: true })]);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      await screen.findByText("Pasantía Frontend");
      expect(screen.queryByText("Cita sin enviar")).not.toBeInTheDocument();
    });
  });

  describe("manejo de error en fetch", () => {
    it("muestra empty state cuando el fetch falla (silencia el error)", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error("network")) as unknown as typeof fetch;
      mockUseSession.mockReturnValue(STUDENT_SESSION);
      render(
        <ConversationList activeConversationId={null} onSelect={() => {}} />,
      );
      await waitFor(() =>
        expect(
          screen.getByText(
            "Cuando una empresa te contacte, los mensajes aparecerán acá.",
          ),
        ).toBeInTheDocument(),
      );
      consoleSpy.mockRestore();
    });
  });
});

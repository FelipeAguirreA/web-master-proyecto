import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ConversationItem from "@/components/chat/ConversationItem";

const NOW = new Date("2026-04-24T15:00:00Z");

const BASE_PROPS = {
  id: "conv-1",
  otherPersonName: "Camila Torres",
  otherPersonImage: null,
  internshipTitle: "Pasantía Frontend",
  lastMessage: {
    content: "Hola, gracias por postularte",
    type: "TEXT" as const,
    createdAt: NOW.toISOString(),
  },
  unreadCount: 0,
  hasPendingInterview: false,
  isActive: false,
  onClick: () => {},
};

describe("ConversationItem", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("render base", () => {
    it("renderiza el nombre del otro participante", () => {
      render(<ConversationItem {...BASE_PROPS} />);
      expect(screen.getByText("Camila Torres")).toBeInTheDocument();
    });

    it("renderiza el título de la práctica", () => {
      render(<ConversationItem {...BASE_PROPS} />);
      expect(screen.getByText("Pasantía Frontend")).toBeInTheDocument();
    });

    it("renderiza el preview del último mensaje TEXT", () => {
      render(<ConversationItem {...BASE_PROPS} />);
      expect(
        screen.getByText("Hola, gracias por postularte"),
      ).toBeInTheDocument();
    });

    it("trunca el contenido del mensaje a 60 caracteres", () => {
      const longMsg = "a".repeat(100);
      render(
        <ConversationItem
          {...BASE_PROPS}
          lastMessage={{
            ...BASE_PROPS.lastMessage!,
            content: longMsg,
          }}
        />,
      );
      expect(screen.getByText("a".repeat(60))).toBeInTheDocument();
    });

    it("renderiza 'Sin mensajes aún' cuando lastMessage es null", () => {
      render(<ConversationItem {...BASE_PROPS} lastMessage={null} />);
      expect(screen.getByText("Sin mensajes aún")).toBeInTheDocument();
    });

    it("renderiza 'Cita de entrevista' cuando el último mensaje es type INTERVIEW", () => {
      render(
        <ConversationItem
          {...BASE_PROPS}
          lastMessage={{
            content: "ignored",
            type: "INTERVIEW",
            createdAt: NOW.toISOString(),
          }}
        />,
      );
      expect(screen.getByText("Cita de entrevista")).toBeInTheDocument();
    });
  });

  describe("timeAgo", () => {
    it("muestra 'ahora' para mensajes con menos de 1 minuto", () => {
      const recent = new Date(NOW.getTime() - 30 * 1000).toISOString();
      render(
        <ConversationItem
          {...BASE_PROPS}
          lastMessage={{ ...BASE_PROPS.lastMessage!, createdAt: recent }}
        />,
      );
      expect(screen.getByText("ahora")).toBeInTheDocument();
    });

    it("muestra 'Xm' para mensajes en minutos (1-59)", () => {
      const fiveMinAgo = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();
      render(
        <ConversationItem
          {...BASE_PROPS}
          lastMessage={{ ...BASE_PROPS.lastMessage!, createdAt: fiveMinAgo }}
        />,
      );
      expect(screen.getByText("5m")).toBeInTheDocument();
    });

    it("muestra 'Xh' para mensajes en horas (1-23)", () => {
      const threeHoursAgo = new Date(
        NOW.getTime() - 3 * 60 * 60 * 1000,
      ).toISOString();
      render(
        <ConversationItem
          {...BASE_PROPS}
          lastMessage={{ ...BASE_PROPS.lastMessage!, createdAt: threeHoursAgo }}
        />,
      );
      expect(screen.getByText("3h")).toBeInTheDocument();
    });

    it("muestra 'Xd' para mensajes de días", () => {
      const twoDaysAgo = new Date(
        NOW.getTime() - 2 * 24 * 60 * 60 * 1000,
      ).toISOString();
      render(
        <ConversationItem
          {...BASE_PROPS}
          lastMessage={{ ...BASE_PROPS.lastMessage!, createdAt: twoDaysAgo }}
        />,
      );
      expect(screen.getByText("2d")).toBeInTheDocument();
    });

    it("no muestra timestamp cuando lastMessage es null", () => {
      render(<ConversationItem {...BASE_PROPS} lastMessage={null} />);
      expect(screen.queryByText(/^\d+[mhd]$/)).not.toBeInTheDocument();
      expect(screen.queryByText("ahora")).not.toBeInTheDocument();
    });
  });

  describe("avatar", () => {
    it("muestra la imagen cuando otherPersonImage está disponible", () => {
      render(
        <ConversationItem
          {...BASE_PROPS}
          otherPersonImage="https://example.com/avatar.jpg"
        />,
      );
      const img = screen.getByAltText("Camila Torres") as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toBe("https://example.com/avatar.jpg");
    });

    it("muestra la inicial del nombre cuando no hay imagen y no es empresa", () => {
      render(<ConversationItem {...BASE_PROPS} />);
      expect(screen.getByText("C")).toBeInTheDocument();
    });

    it("cae al fallback (inicial) cuando la imagen falla en cargar", () => {
      render(
        <ConversationItem
          {...BASE_PROPS}
          otherPersonImage="https://example.com/broken.jpg"
        />,
      );
      const img = screen.getByAltText("Camila Torres");
      fireEvent.error(img);
      expect(screen.getByText("C")).toBeInTheDocument();
      expect(screen.queryByAltText("Camila Torres")).not.toBeInTheDocument();
    });

    it("muestra ícono Building2 cuando isCompany=true y no hay imagen", () => {
      const { container } = render(
        <ConversationItem {...BASE_PROPS} isCompany />,
      );
      expect(screen.queryByText("C")).not.toBeInTheDocument();
      // El ícono lucide-react se renderiza como svg
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("unread badge", () => {
    it("no muestra badge cuando unreadCount=0", () => {
      render(<ConversationItem {...BASE_PROPS} unreadCount={0} />);
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
    });

    it("muestra el número exacto cuando unreadCount está entre 1 y 9", () => {
      render(<ConversationItem {...BASE_PROPS} unreadCount={3} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("muestra '9+' cuando unreadCount es mayor a 9", () => {
      render(<ConversationItem {...BASE_PROPS} unreadCount={42} />);
      expect(screen.getByText("9+")).toBeInTheDocument();
    });
  });

  describe("pending interview banner", () => {
    it("muestra 'Cita sin enviar' cuando hasPendingInterview=true", () => {
      render(<ConversationItem {...BASE_PROPS} hasPendingInterview />);
      expect(screen.getByText("Cita sin enviar")).toBeInTheDocument();
    });

    it("NO muestra 'Cita sin enviar' cuando hasPendingInterview=false", () => {
      render(<ConversationItem {...BASE_PROPS} hasPendingInterview={false} />);
      expect(screen.queryByText("Cita sin enviar")).not.toBeInTheDocument();
    });
  });

  describe("estado activo", () => {
    it("aplica gradient de fondo cuando isActive=true", () => {
      render(<ConversationItem {...BASE_PROPS} isActive />);
      expect(screen.getByRole("button").className).toContain("from-[#FFF4EE]");
    });

    it("aplica hover state cuando isActive=false", () => {
      render(<ConversationItem {...BASE_PROPS} isActive={false} />);
      expect(screen.getByRole("button").className).toContain("hover:bg-");
    });
  });

  describe("interacción", () => {
    it("dispara onClick al hacer click", () => {
      const onClick = vi.fn();
      render(<ConversationItem {...BASE_PROPS} onClick={onClick} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});

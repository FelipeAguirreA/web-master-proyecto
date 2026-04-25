import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import InterviewListItem from "@/components/chat/calendar/InterviewListItem";

const baseProps = {
  id: "iv-1",
  title: "Entrevista técnica",
  scheduledAt: "2026-04-25T14:30:00.000Z",
  durationMins: 45,
  meetingLink: "https://meet.google.com/abc",
  notes: null,
  sentToChat: false,
  sentToChatAt: null,
  studentName: "Juan Pérez",
  internshipTitle: "Backend Intern",
  onSendToChat: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("InterviewListItem", () => {
  describe("render base", () => {
    it("renderiza el título y la duración", () => {
      render(<InterviewListItem {...baseProps} />);
      expect(screen.getByText("Entrevista técnica")).toBeInTheDocument();
      expect(screen.getByText("45min")).toBeInTheDocument();
    });

    it("renderiza el studentName y internshipTitle", () => {
      render(<InterviewListItem {...baseProps} />);
      expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument();
      expect(screen.getByText(/Backend Intern/)).toBeInTheDocument();
    });

    it("formatea la hora con Intl.DateTimeFormat es-CL", () => {
      const { container } = render(<InterviewListItem {...baseProps} />);
      const horaNode = container.querySelector("p.text-\\[17px\\].font-bold");
      expect(horaNode?.textContent ?? "").toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe("meetingLink", () => {
    it("renderiza el link clickeable cuando hay meetingLink", () => {
      render(<InterviewListItem {...baseProps} />);
      const link = screen.getByRole("link", {
        name: "https://meet.google.com/abc",
      });
      expect(link).toHaveAttribute("href", "https://meet.google.com/abc");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("muestra 'Link por confirmar' cuando meetingLink es null", () => {
      render(<InterviewListItem {...baseProps} meetingLink={null} />);
      expect(screen.getByText("Link por confirmar")).toBeInTheDocument();
    });

    it("click en 'Copiar' llama a navigator.clipboard.writeText con el link", async () => {
      render(<InterviewListItem {...baseProps} />);
      fireEvent.click(screen.getByText("Copiar"));

      expect(writeText).toHaveBeenCalledWith("https://meet.google.com/abc");
    });

    it("muestra '¡Copiado!' tras click en Copiar", async () => {
      render(<InterviewListItem {...baseProps} />);
      fireEvent.click(screen.getByText("Copiar"));

      await waitFor(() => {
        expect(screen.getByText("¡Copiado!")).toBeInTheDocument();
      });
    });

    it("vuelve a 'Copiar' después de 2s", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      render(<InterviewListItem {...baseProps} />);
      fireEvent.click(screen.getByText("Copiar"));
      await waitFor(() => {
        expect(screen.getByText("¡Copiado!")).toBeInTheDocument();
      });

      vi.advanceTimersByTime(2100);
      await waitFor(() => {
        expect(screen.getByText("Copiar")).toBeInTheDocument();
      });
    });

    it("handleCopyLink retorna early si meetingLink es null (no rompe)", () => {
      render(<InterviewListItem {...baseProps} meetingLink={null} />);
      // Sin link no hay botón Copiar — solo verificar que no rompe el render
      expect(screen.queryByText("Copiar")).not.toBeInTheDocument();
    });
  });

  describe("estado de envío", () => {
    it("badge 'Sin enviar' cuando sentToChat=false", () => {
      render(<InterviewListItem {...baseProps} sentToChat={false} />);
      expect(screen.getByText("Sin enviar al candidato")).toBeInTheDocument();
    });

    it("badge 'Enviada' con fecha cuando sentToChat=true", () => {
      render(
        <InterviewListItem
          {...baseProps}
          sentToChat={true}
          sentToChatAt="2026-04-20T10:00:00.000Z"
        />,
      );
      expect(screen.getByText(/Enviada/)).toBeInTheDocument();
    });

    it("botón principal dice 'Enviar al chat' cuando sentToChat=false", () => {
      render(<InterviewListItem {...baseProps} sentToChat={false} />);
      expect(screen.getByText("Enviar al chat")).toBeInTheDocument();
    });

    it("botón principal dice 'Reenviar' cuando sentToChat=true", () => {
      render(
        <InterviewListItem
          {...baseProps}
          sentToChat={true}
          sentToChatAt="2026-04-20T10:00:00.000Z"
        />,
      );
      expect(screen.getByText("Reenviar")).toBeInTheDocument();
    });

    it("muestra 'Enviando...' mientras onSendToChat está pendiente", async () => {
      let resolve!: () => void;
      const onSendToChat = vi.fn(() => new Promise<void>((r) => (resolve = r)));
      render(<InterviewListItem {...baseProps} onSendToChat={onSendToChat} />);

      fireEvent.click(screen.getByText("Enviar al chat"));
      await waitFor(() => {
        expect(screen.getByText("Enviando...")).toBeInTheDocument();
      });

      resolve();
      await waitFor(() => {
        expect(screen.queryByText("Enviando...")).not.toBeInTheDocument();
      });
    });

    it("dispara onSendToChat con el id correcto", async () => {
      const onSendToChat = vi.fn().mockResolvedValue(undefined);
      render(<InterviewListItem {...baseProps} onSendToChat={onSendToChat} />);

      fireEvent.click(screen.getByText("Enviar al chat"));
      await waitFor(() => {
        expect(onSendToChat).toHaveBeenCalledWith("iv-1");
      });
    });
  });

  describe("acciones secundarias", () => {
    it("dispara onEdit con el id al click en el botón Editar", () => {
      const onEdit = vi.fn();
      render(<InterviewListItem {...baseProps} onEdit={onEdit} />);

      fireEvent.click(screen.getByTitle("Editar"));
      expect(onEdit).toHaveBeenCalledWith("iv-1");
    });

    it("click en Eliminar abre el modal de confirmación", () => {
      render(<InterviewListItem {...baseProps} />);

      fireEvent.click(screen.getByTitle("Eliminar"));
      expect(document.body.querySelector("h2")?.textContent).toBe(
        "Eliminar entrevista",
      );
    });
  });

  describe("modal de eliminación", () => {
    it("modal NO está en el DOM por defecto", () => {
      render(<InterviewListItem {...baseProps} />);
      expect(screen.queryByText("Eliminar entrevista")).not.toBeInTheDocument();
    });

    it("click en 'Cancelar' cierra el modal sin llamar onDelete", () => {
      const onDelete = vi.fn();
      render(<InterviewListItem {...baseProps} onDelete={onDelete} />);

      fireEvent.click(screen.getByTitle("Eliminar"));
      fireEvent.click(screen.getByText("Cancelar"));

      expect(onDelete).not.toHaveBeenCalled();
      expect(screen.queryByText("Eliminar entrevista")).not.toBeInTheDocument();
    });

    it("click en X (Cerrar) cierra el modal", () => {
      render(<InterviewListItem {...baseProps} />);

      fireEvent.click(screen.getByTitle("Eliminar"));
      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

      expect(screen.queryByText("Eliminar entrevista")).not.toBeInTheDocument();
    });

    it("click en backdrop cierra el modal", () => {
      render(<InterviewListItem {...baseProps} />);

      fireEvent.click(screen.getByTitle("Eliminar"));
      const backdrop = document.body.querySelector(
        ".bg-\\[\\#0A0909\\]\\/50",
      ) as HTMLElement;
      fireEvent.click(backdrop);

      expect(screen.queryByText("Eliminar entrevista")).not.toBeInTheDocument();
    });

    it("muestra warning cuando sentToChat=true", () => {
      render(
        <InterviewListItem
          {...baseProps}
          sentToChat={true}
          sentToChatAt="2026-04-20T10:00:00.000Z"
        />,
      );
      fireEvent.click(screen.getByTitle("Eliminar"));

      expect(
        screen.getByText(/Esta cita ya fue enviada al candidato/),
      ).toBeInTheDocument();
    });

    it("NO muestra warning cuando sentToChat=false", () => {
      render(<InterviewListItem {...baseProps} sentToChat={false} />);
      fireEvent.click(screen.getByTitle("Eliminar"));

      expect(
        screen.queryByText(/Esta cita ya fue enviada al candidato/),
      ).not.toBeInTheDocument();
    });

    it("click en 'Eliminar' (modal) dispara onDelete con el id y cierra modal", async () => {
      const onDelete = vi.fn().mockResolvedValue(undefined);
      render(<InterviewListItem {...baseProps} onDelete={onDelete} />);

      fireEvent.click(screen.getByTitle("Eliminar"));
      const modal = within(
        screen.getByText("Eliminar entrevista").closest("div")
          ?.parentElement as HTMLElement,
      );
      fireEvent.click(modal.getByRole("button", { name: /^Eliminar$/ }));

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith("iv-1");
      });
      await waitFor(() => {
        expect(
          screen.queryByText("Eliminar entrevista"),
        ).not.toBeInTheDocument();
      });
    });

    it("muestra 'Eliminando...' mientras onDelete está pendiente", async () => {
      let resolve!: () => void;
      const onDelete = vi.fn(() => new Promise<void>((r) => (resolve = r)));
      render(<InterviewListItem {...baseProps} onDelete={onDelete} />);

      fireEvent.click(screen.getByTitle("Eliminar"));
      const modal = within(
        screen.getByText("Eliminar entrevista").closest("div")
          ?.parentElement as HTMLElement,
      );
      fireEvent.click(modal.getByRole("button", { name: /^Eliminar$/ }));

      await waitFor(() => {
        expect(screen.getByText("Eliminando...")).toBeInTheDocument();
      });

      resolve();
    });
  });
});

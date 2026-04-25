import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import InterviewMessageCard from "@/components/chat/InterviewMessageCard";

const BASE_PROPS = {
  content:
    "Entrevista programada\nFecha: 28/04/2026\nHora: 10:00\nLugar: Google Meet",
  createdAt: "2026-04-24T15:30:00Z",
};

describe("InterviewMessageCard", () => {
  describe("render base", () => {
    it("renderiza el header 'Cita de entrevista'", () => {
      render(<InterviewMessageCard {...BASE_PROPS} />);
      expect(screen.getByText("Cita de entrevista")).toBeInTheDocument();
    });

    it("renderiza el contenido pasado por prop", () => {
      render(<InterviewMessageCard {...BASE_PROPS} />);
      expect(screen.getByText(/Entrevista programada/)).toBeInTheDocument();
      expect(screen.getByText(/Google Meet/)).toBeInTheDocument();
    });

    it("renderiza contenido vacío sin romper", () => {
      const { container } = render(
        <InterviewMessageCard {...BASE_PROPS} content="" />,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("preserva los saltos de línea con whitespace-pre-wrap", () => {
      render(<InterviewMessageCard {...BASE_PROPS} />);
      const p = screen.getByText(/Entrevista programada/);
      expect(p.className).toContain("whitespace-pre-wrap");
    });

    it("usa fuente monoespaciada para el contenido", () => {
      render(<InterviewMessageCard {...BASE_PROPS} />);
      const p = screen.getByText(/Entrevista programada/);
      expect(p.className).toContain("font-mono");
    });
  });

  describe("alineación según isMine", () => {
    it("alinea a la derecha (justify-end) cuando isMine=true", () => {
      const { container } = render(
        <InterviewMessageCard {...BASE_PROPS} isMine />,
      );
      expect(container.firstChild).toHaveClass("justify-end");
    });

    it("alinea a la izquierda (justify-start) cuando isMine=false", () => {
      const { container } = render(
        <InterviewMessageCard {...BASE_PROPS} isMine={false} />,
      );
      expect(container.firstChild).toHaveClass("justify-start");
    });

    it("alinea a la izquierda por defecto cuando isMine se omite", () => {
      const { container } = render(<InterviewMessageCard {...BASE_PROPS} />);
      expect(container.firstChild).toHaveClass("justify-start");
    });
  });

  describe("formato de hora", () => {
    it("formatea la hora con separador ':'", () => {
      const { container } = render(<InterviewMessageCard {...BASE_PROPS} />);
      // El locale es-CL puede dar "15:30" (24h) o "11:30 a. m." (12h) según runner/TZ.
      // La hora del mensaje vive en el <p> con clase tabular-nums.
      const hora = container.querySelector(".tabular-nums");
      expect(hora?.textContent).toMatch(/\d{1,2}:\d{2}/);
    });

    it("renderiza la hora alineada a la derecha y con tabular-nums", () => {
      const { container } = render(<InterviewMessageCard {...BASE_PROPS} />);
      const hora = container.querySelector(".tabular-nums");
      expect(hora?.className).toContain("text-right");
      expect(hora?.className).toContain("tabular-nums");
    });
  });

  describe("estructura visual", () => {
    it("aplica el borde y radio característicos de la card", () => {
      const { container } = render(<InterviewMessageCard {...BASE_PROPS} />);
      const card = container.querySelector(".rounded-\\[20px\\]");
      expect(card).toBeInTheDocument();
      expect(card?.className).toContain("border-[#FFD4B5]");
    });
  });
});

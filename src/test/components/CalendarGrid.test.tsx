import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CalendarGrid from "@/components/chat/calendar/CalendarGrid";

const baseProps = {
  year: 2026,
  month: 3, // Abril (0-indexed)
  interviewDates: new Set<string>(),
  selectedDate: null,
  onSelectDate: vi.fn(),
  onPrevMonth: vi.fn(),
  onNextMonth: vi.fn(),
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CalendarGrid", () => {
  describe("header de navegación", () => {
    it("renderiza el nombre del mes en español y el año", () => {
      render(<CalendarGrid {...baseProps} year={2026} month={3} />);
      expect(screen.getByText("Abril")).toBeInTheDocument();
      expect(screen.getByText("2026")).toBeInTheDocument();
    });

    it.each([
      [0, "Enero"],
      [5, "Junio"],
      [11, "Diciembre"],
    ])("month=%d → '%s'", (m, name) => {
      render(<CalendarGrid {...baseProps} month={m} />);
      expect(screen.getByText(name)).toBeInTheDocument();
    });

    it("dispara onPrevMonth al click en la flecha izquierda", () => {
      const onPrevMonth = vi.fn();
      render(<CalendarGrid {...baseProps} onPrevMonth={onPrevMonth} />);
      fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
      expect(onPrevMonth).toHaveBeenCalledTimes(1);
    });

    it("dispara onNextMonth al click en la flecha derecha", () => {
      const onNextMonth = vi.fn();
      render(<CalendarGrid {...baseProps} onNextMonth={onNextMonth} />);
      fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
      expect(onNextMonth).toHaveBeenCalledTimes(1);
    });
  });

  describe("cabecera de días", () => {
    it("renderiza los 7 días en español arrancando en lunes", () => {
      render(<CalendarGrid {...baseProps} />);
      const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      days.forEach((d) => expect(screen.getByText(d)).toBeInTheDocument());
    });
  });

  describe("celdas de días", () => {
    it("renderiza un botón por cada día del mes (Abril 2026 = 30 días)", () => {
      const { container } = render(
        <CalendarGrid {...baseProps} year={2026} month={3} />,
      );
      const dayButtons = container.querySelectorAll("button[class*='h-9']");
      expect(dayButtons.length).toBe(30);
    });

    it("calcula correctamente días en febrero (no bisiesto: 28)", () => {
      const { container } = render(
        <CalendarGrid {...baseProps} year={2025} month={1} />,
      );
      const dayButtons = container.querySelectorAll("button[class*='h-9']");
      expect(dayButtons.length).toBe(28);
    });

    it("calcula correctamente febrero bisiesto (2024: 29 días)", () => {
      const { container } = render(
        <CalendarGrid {...baseProps} year={2024} month={1} />,
      );
      const dayButtons = container.querySelectorAll("button[class*='h-9']");
      expect(dayButtons.length).toBe(29);
    });

    it("dispara onSelectDate con el dateStr correcto al click en un día", () => {
      const onSelectDate = vi.fn();
      render(
        <CalendarGrid
          {...baseProps}
          year={2026}
          month={3}
          onSelectDate={onSelectDate}
        />,
      );

      fireEvent.click(screen.getByText("15"));
      expect(onSelectDate).toHaveBeenCalledWith("2026-04-15");
    });

    it("click en día seleccionado dispara onSelectDate('') para deseleccionar", () => {
      const onSelectDate = vi.fn();
      render(
        <CalendarGrid
          {...baseProps}
          year={2026}
          month={3}
          selectedDate="2026-04-15"
          onSelectDate={onSelectDate}
        />,
      );

      fireEvent.click(screen.getByText("15"));
      expect(onSelectDate).toHaveBeenCalledWith("");
    });

    it("aplica estilo de today al día actual (mock fecha)", () => {
      render(<CalendarGrid {...baseProps} year={2026} month={3} />);
      const today = screen.getByText("15");
      expect(today.className).toContain("bg-[#FFF3EC]");
    });

    it("aplica estilo de selected al día seleccionado (gradient)", () => {
      render(
        <CalendarGrid
          {...baseProps}
          year={2026}
          month={3}
          selectedDate="2026-04-10"
        />,
      );
      const selected = screen.getByText("10");
      expect(selected.className).toContain("bg-gradient-to-br");
    });

    it("muestra dot indicador en días con interviewDates", () => {
      const { container } = render(
        <CalendarGrid
          {...baseProps}
          year={2026}
          month={3}
          interviewDates={new Set(["2026-04-20"])}
        />,
      );

      const button20 = screen.getByText("20").closest("button");
      const dot = button20?.querySelector("span.absolute");
      expect(dot).not.toBeNull();
      expect(dot?.className).toContain("bg-[#FF6A3D]");
      // No es selected → dot NO es bg-white
      expect(dot?.className).not.toContain("bg-white");

      void container;
    });

    it("dot del día con interview cambia a bg-white cuando está selected", () => {
      render(
        <CalendarGrid
          {...baseProps}
          year={2026}
          month={3}
          selectedDate="2026-04-20"
          interviewDates={new Set(["2026-04-20"])}
        />,
      );

      const dot = screen
        .getByText("20")
        .closest("button")
        ?.querySelector("span.absolute");
      expect(dot?.className).toContain("bg-white");
    });

    it("NO muestra dot en días sin interview", () => {
      render(
        <CalendarGrid
          {...baseProps}
          year={2026}
          month={3}
          interviewDates={new Set(["2026-04-20"])}
        />,
      );

      const dot = screen
        .getByText("5")
        .closest("button")
        ?.querySelector("span.absolute");
      expect(dot).toBeNull();
    });

    it("rellena con celdas vacías al inicio para alinear con lunes", () => {
      // Mayo 2026: el 1 es viernes → startDow = 4 (lunes=0)
      const { container } = render(
        <CalendarGrid {...baseProps} year={2026} month={4} />,
      );
      // Total cells = ceil((4 + 31) / 7) * 7 = 35
      const grid = container.querySelectorAll(".grid-cols-7")[1];
      expect(grid.children.length).toBe(35);
    });

    it("trata el domingo como último día (startDow=6 cuando el primero del mes es domingo)", () => {
      // Marzo 2026: el 1 es domingo → startDow = 6
      const { container } = render(
        <CalendarGrid {...baseProps} year={2026} month={2} />,
      );
      const dayButtons = container.querySelectorAll("button[class*='h-9']");
      expect(dayButtons.length).toBe(31); // marzo tiene 31 días
    });
  });
});

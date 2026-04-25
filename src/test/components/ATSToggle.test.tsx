import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ATSToggle from "@/components/ats/ATSToggle";

const BASE_PROPS = {
  internshipId: "i-123",
  isActive: false,
  hasConfig: false,
  onChange: () => {},
};

describe("ATSToggle", () => {
  describe("render base", () => {
    it("renderiza el título 'Modo ATS' y su descripción", () => {
      render(<ATSToggle {...BASE_PROPS} />);
      expect(screen.getByText("Modo ATS")).toBeInTheDocument();
      expect(
        screen.getByText("Ranking automático de candidatos"),
      ).toBeInTheDocument();
    });

    it("renderiza el botón con aria-label 'Toggle ATS'", () => {
      render(<ATSToggle {...BASE_PROPS} />);
      expect(
        screen.getByRole("button", { name: "Toggle ATS" }),
      ).toBeInTheDocument();
    });
  });

  describe("estado visual cuando isActive=true", () => {
    it("aplica fondo brand-600 al toggle", () => {
      render(<ATSToggle {...BASE_PROPS} isActive />);
      const toggle = screen.getByRole("button", { name: "Toggle ATS" });
      expect(toggle.className).toContain("bg-brand-600");
    });

    it("aplica translate-x-6 al thumb (toggle a la derecha)", () => {
      render(<ATSToggle {...BASE_PROPS} isActive />);
      const toggle = screen.getByRole("button", { name: "Toggle ATS" });
      const thumb = toggle.querySelector("span");
      expect(thumb?.className).toContain("translate-x-6");
    });

    it("muestra el link de configuración con texto 'Configurar ATS' cuando hasConfig=false", () => {
      render(<ATSToggle {...BASE_PROPS} isActive hasConfig={false} />);
      expect(screen.getByText(/Configurar ATS/)).toBeInTheDocument();
    });

    it("muestra el link con texto 'Configurar módulos' cuando hasConfig=true", () => {
      render(<ATSToggle {...BASE_PROPS} isActive hasConfig />);
      expect(screen.getByText(/Configurar módulos/)).toBeInTheDocument();
    });

    it("el link apunta a /dashboard/empresa/ats/:internshipId", () => {
      render(<ATSToggle {...BASE_PROPS} isActive internshipId="i-xyz" />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/dashboard/empresa/ats/i-xyz");
    });
  });

  describe("estado visual cuando isActive=false", () => {
    it("aplica fondo gris al toggle", () => {
      render(<ATSToggle {...BASE_PROPS} isActive={false} />);
      const toggle = screen.getByRole("button", { name: "Toggle ATS" });
      expect(toggle.className).toContain("bg-gray-300");
    });

    it("aplica translate-x-1 al thumb (toggle a la izquierda)", () => {
      render(<ATSToggle {...BASE_PROPS} isActive={false} />);
      const toggle = screen.getByRole("button", { name: "Toggle ATS" });
      const thumb = toggle.querySelector("span");
      expect(thumb?.className).toContain("translate-x-1");
    });

    it("NO muestra el link de configuración cuando isActive=false", () => {
      render(<ATSToggle {...BASE_PROPS} isActive={false} />);
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("interacción — activar (sin confirm)", () => {
    it("dispara onChange(true) directamente cuando se activa desde apagado", () => {
      const onChange = vi.fn();
      const confirmSpy = vi.spyOn(window, "confirm");
      render(
        <ATSToggle {...BASE_PROPS} isActive={false} onChange={onChange} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Toggle ATS" }));
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith(true);
      confirmSpy.mockRestore();
    });
  });

  describe("interacción — desactivar (con confirm)", () => {
    let confirmSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      confirmSpy = vi.spyOn(window, "confirm");
    });

    afterEach(() => {
      confirmSpy.mockRestore();
    });

    it("pide confirmación al usuario antes de desactivar", () => {
      confirmSpy.mockReturnValue(true);
      const onChange = vi.fn();
      render(<ATSToggle {...BASE_PROPS} isActive onChange={onChange} />);
      fireEvent.click(screen.getByRole("button", { name: "Toggle ATS" }));
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("Desactivar el ATS"),
      );
    });

    it("dispara onChange(false) cuando el usuario confirma", () => {
      confirmSpy.mockReturnValue(true);
      const onChange = vi.fn();
      render(<ATSToggle {...BASE_PROPS} isActive onChange={onChange} />);
      fireEvent.click(screen.getByRole("button", { name: "Toggle ATS" }));
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it("NO dispara onChange cuando el usuario cancela el confirm", () => {
      confirmSpy.mockReturnValue(false);
      const onChange = vi.fn();
      render(<ATSToggle {...BASE_PROPS} isActive onChange={onChange} />);
      fireEvent.click(screen.getByRole("button", { name: "Toggle ATS" }));
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

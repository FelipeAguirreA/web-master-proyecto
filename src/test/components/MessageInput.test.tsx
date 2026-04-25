import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MessageInput from "@/components/chat/MessageInput";

describe("MessageInput", () => {
  describe("render", () => {
    it("renderiza el textarea con placeholder por defecto", () => {
      render(<MessageInput onSend={() => {}} />);
      expect(
        screen.getByPlaceholderText("Escribí un mensaje..."),
      ).toBeInTheDocument();
    });

    it("renderiza placeholder custom cuando se pasa por prop", () => {
      render(<MessageInput onSend={() => {}} placeholder="Tu mensaje acá" />);
      expect(screen.getByPlaceholderText("Tu mensaje acá")).toBeInTheDocument();
    });

    it("muestra placeholder específico cuando está disabled (ignora el placeholder custom)", () => {
      render(
        <MessageInput
          onSend={() => {}}
          disabled
          placeholder="No se debería ver"
        />,
      );
      expect(
        screen.getByPlaceholderText(
          "Esperá a que la empresa te contacte primero",
        ),
      ).toBeInTheDocument();
    });

    it("renderiza el botón con aria-label 'Enviar mensaje'", () => {
      render(<MessageInput onSend={() => {}} />);
      expect(
        screen.getByRole("button", { name: "Enviar mensaje" }),
      ).toBeInTheDocument();
    });
  });

  describe("estado del textarea", () => {
    it("el textarea NO está disabled por defecto", () => {
      render(<MessageInput onSend={() => {}} />);
      expect(
        screen.getByPlaceholderText("Escribí un mensaje..."),
      ).not.toBeDisabled();
    });

    it("el textarea está disabled cuando prop disabled=true", () => {
      render(<MessageInput onSend={() => {}} disabled />);
      expect(
        screen.getByPlaceholderText(
          "Esperá a que la empresa te contacte primero",
        ),
      ).toBeDisabled();
    });
  });

  describe("estado del botón enviar", () => {
    it("el botón está disabled cuando el textarea está vacío", () => {
      render(<MessageInput onSend={() => {}} />);
      expect(
        screen.getByRole("button", { name: "Enviar mensaje" }),
      ).toBeDisabled();
    });

    it("el botón se habilita cuando hay contenido", () => {
      render(<MessageInput onSend={() => {}} />);
      const textarea = screen.getByPlaceholderText("Escribí un mensaje...");
      fireEvent.change(textarea, { target: { value: "Hola" } });
      expect(
        screen.getByRole("button", { name: "Enviar mensaje" }),
      ).not.toBeDisabled();
    });

    it("el botón sigue disabled cuando el contenido es solo whitespace", () => {
      render(<MessageInput onSend={() => {}} />);
      const textarea = screen.getByPlaceholderText("Escribí un mensaje...");
      fireEvent.change(textarea, { target: { value: "   \n\t  " } });
      expect(
        screen.getByRole("button", { name: "Enviar mensaje" }),
      ).toBeDisabled();
    });

    it("el botón está disabled cuando hay contenido pero prop disabled=true", () => {
      render(<MessageInput onSend={() => {}} disabled />);
      const textarea = screen.getByPlaceholderText(
        "Esperá a que la empresa te contacte primero",
      );
      fireEvent.change(textarea, { target: { value: "Hola" } });
      expect(
        screen.getByRole("button", { name: "Enviar mensaje" }),
      ).toBeDisabled();
    });
  });

  describe("envío por click", () => {
    it("dispara onSend con el contenido al hacer click en el botón", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByPlaceholderText("Escribí un mensaje...");
      fireEvent.change(textarea, { target: { value: "Hola mundo" } });
      fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
      expect(onSend).toHaveBeenCalledTimes(1);
      expect(onSend).toHaveBeenCalledWith("Hola mundo");
    });

    it("trimea el contenido antes de enviarlo", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByPlaceholderText("Escribí un mensaje...");
      fireEvent.change(textarea, { target: { value: "  Hola  " } });
      fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
      expect(onSend).toHaveBeenCalledWith("Hola");
    });

    it("limpia el textarea después de enviar", () => {
      render(<MessageInput onSend={() => {}} />);
      const textarea = screen.getByPlaceholderText(
        "Escribí un mensaje...",
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Hola" } });
      fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
      expect(textarea.value).toBe("");
    });
  });

  describe("envío por teclado", () => {
    it("Enter sin shift dispara onSend", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByPlaceholderText("Escribí un mensaje...");
      fireEvent.change(textarea, { target: { value: "Hola" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
      expect(onSend).toHaveBeenCalledWith("Hola");
    });

    it("Enter CON shift NO dispara onSend (permite salto de línea)", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByPlaceholderText("Escribí un mensaje...");
      fireEvent.change(textarea, { target: { value: "Hola" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
      expect(onSend).not.toHaveBeenCalled();
    });

    it("otras teclas no disparan onSend", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByPlaceholderText("Escribí un mensaje...");
      fireEvent.change(textarea, { target: { value: "Hola" } });
      fireEvent.keyDown(textarea, { key: "a" });
      fireEvent.keyDown(textarea, { key: "Tab" });
      expect(onSend).not.toHaveBeenCalled();
    });

    it("Enter con textarea vacío NO dispara onSend", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByPlaceholderText("Escribí un mensaje...");
      fireEvent.keyDown(textarea, { key: "Enter" });
      expect(onSend).not.toHaveBeenCalled();
    });

    it("Enter con solo whitespace NO dispara onSend", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} />);
      const textarea = screen.getByPlaceholderText("Escribí un mensaje...");
      fireEvent.change(textarea, { target: { value: "   " } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe("comportamiento defensivo", () => {
    it("no envía cuando prop disabled=true (incluso con contenido)", () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} disabled />);
      const textarea = screen.getByPlaceholderText(
        "Esperá a que la empresa te contacte primero",
      );
      fireEvent.change(textarea, { target: { value: "Hola" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      expect(onSend).not.toHaveBeenCalled();
    });
  });
});

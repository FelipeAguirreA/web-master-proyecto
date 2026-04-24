import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MessageBubble from "@/components/chat/MessageBubble";

const BASE_PROPS = {
  content: "Hola, ¿cómo estás?",
  isMine: false,
  senderName: "Camila Torres",
  senderImage: null,
  createdAt: "2026-04-24T15:30:00Z",
};

describe("MessageBubble", () => {
  it("renderiza el contenido del mensaje", () => {
    render(<MessageBubble {...BASE_PROPS} />);
    expect(screen.getByText("Hola, ¿cómo estás?")).toBeInTheDocument();
  });

  it("muestra el nombre del sender cuando el mensaje NO es mío", () => {
    render(<MessageBubble {...BASE_PROPS} isMine={false} />);
    expect(screen.getByText("Camila Torres")).toBeInTheDocument();
  });

  it("oculta el nombre del sender cuando el mensaje es mío", () => {
    render(<MessageBubble {...BASE_PROPS} isMine={true} />);
    expect(screen.queryByText("Camila Torres")).not.toBeInTheDocument();
  });

  it("formatea la hora del mensaje con separador ':'", () => {
    render(<MessageBubble {...BASE_PROPS} />);
    // El locale puede dar "15:30" o "03:30 p. m." según Intl data disponible
    expect(screen.getByText(/\d+:\d{2}/)).toBeInTheDocument();
  });

  it("alinea a la derecha (justify-end) cuando es mío", () => {
    const { container } = render(
      <MessageBubble {...BASE_PROPS} isMine={true} />,
    );
    expect(container.firstChild).toHaveClass("justify-end");
  });

  it("alinea a la izquierda (justify-start) cuando NO es mío", () => {
    const { container } = render(
      <MessageBubble {...BASE_PROPS} isMine={false} />,
    );
    expect(container.firstChild).toHaveClass("justify-start");
  });

  it("aplica el gradient warm cuando es mío", () => {
    render(<MessageBubble {...BASE_PROPS} isMine={true} />);
    const bubble = screen.getByText("Hola, ¿cómo estás?").closest("div");
    expect(bubble?.className).toContain("from-[#FFF0E4]");
  });

  it("aplica fondo blanco con borde cuando NO es mío", () => {
    render(<MessageBubble {...BASE_PROPS} isMine={false} />);
    const bubble = screen.getByText("Hola, ¿cómo estás?").closest("div");
    expect(bubble?.className).toContain("bg-white");
  });

  it("preserva los saltos de línea en el contenido (whitespace-pre-wrap)", () => {
    const multiline = "Línea 1\nLínea 2\nLínea 3";
    render(<MessageBubble {...BASE_PROPS} content={multiline} />);
    const p = screen.getByText(/Línea 1/);
    expect(p.className).toContain("whitespace-pre-wrap");
  });

  it("renderiza contenido vacío sin romper", () => {
    const { container } = render(<MessageBubble {...BASE_PROPS} content="" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

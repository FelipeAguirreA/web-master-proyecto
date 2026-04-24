import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ModuleCard, { type ATSModuleState } from "@/components/ats/ModuleCard";

function buildModule(overrides: Partial<ATSModuleState> = {}): ATSModuleState {
  return {
    id: "mod-1",
    type: "SKILLS",
    label: "Skills técnicas",
    icon: "zap",
    isActive: true,
    weight: 50,
    order: 0,
    params: {},
    ...overrides,
  };
}

function renderWithHandlers(moduleOverrides: Partial<ATSModuleState> = {}) {
  const onEdit = vi.fn();
  const onDeactivate = vi.fn();
  const onWeightChange = vi.fn();
  render(
    <ModuleCard
      module={buildModule(moduleOverrides)}
      onEdit={onEdit}
      onDeactivate={onDeactivate}
      onWeightChange={onWeightChange}
    />,
  );
  return { onEdit, onDeactivate, onWeightChange };
}

describe("ModuleCard — render", () => {
  it("renderiza el label del módulo", () => {
    renderWithHandlers({ label: "Skills técnicas" });
    expect(screen.getByText("Skills técnicas")).toBeInTheDocument();
  });

  it("muestra el peso actual en el input number", () => {
    renderWithHandlers({ weight: 75 });
    const numberInput = screen.getByRole("spinbutton");
    expect(numberInput).toHaveValue(75);
  });

  it("refleja el peso actual en el input range", () => {
    renderWithHandlers({ weight: 30 });
    const slider = screen.getByRole("slider");
    expect(slider).toHaveValue("30");
  });
});

describe("ModuleCard — callbacks", () => {
  it("dispara onEdit al hacer click en el botón editar", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderWithHandlers();

    await user.click(screen.getByTitle("Editar módulo"));

    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("dispara onDeactivate al hacer click en el botón X", async () => {
    const user = userEvent.setup();
    const { onDeactivate } = renderWithHandlers();

    await user.click(screen.getByTitle("Desactivar módulo"));

    expect(onDeactivate).toHaveBeenCalledOnce();
  });

  it("dispara onWeightChange al cambiar el slider", () => {
    const { onWeightChange } = renderWithHandlers({ weight: 50 });
    const slider = screen.getByRole("slider");

    // fireEvent sobre range: necesitamos change manual
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    // userEvent no cambia range directo, usamos fireEvent change
    const changeEvent = new Event("change", { bubbles: true });
    Object.defineProperty(slider, "value", { value: "80", writable: true });
    slider.dispatchEvent(changeEvent);

    expect(onWeightChange).toHaveBeenCalledWith(80);
  });

  it("dispara onWeightChange al tipear en el input number (controlled)", async () => {
    const user = userEvent.setup();
    const { onWeightChange } = renderWithHandlers({ weight: 50 });
    const numberInput = screen.getByRole("spinbutton");

    // Al tipear "4" sobre value=50 → recibe "504" → clamp a 100.
    // Verificamos que SE dispara onChange cada vez (comportamiento controlled real).
    await user.clear(numberInput);
    await user.type(numberInput, "4");

    expect(onWeightChange).toHaveBeenCalled();
    // Todas las llamadas entregan números enteros en [0, 100]
    for (const call of onWeightChange.mock.calls) {
      expect(call[0]).toBeGreaterThanOrEqual(0);
      expect(call[0]).toBeLessThanOrEqual(100);
    }
  });
});

describe("ModuleCard — clamp y parsing", () => {
  it("clamp a 100 cuando el usuario tipea un valor mayor", async () => {
    const user = userEvent.setup();
    const { onWeightChange } = renderWithHandlers({ weight: 10 });
    const numberInput = screen.getByRole("spinbutton");

    await user.clear(numberInput);
    await user.type(numberInput, "250");

    // El handler recibe min(100, max(0, 250)) = 100
    const lastCall = onWeightChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(100);
  });

  it("reemplaza NaN por 0 cuando el input number queda vacío", async () => {
    const user = userEvent.setup();
    const { onWeightChange } = renderWithHandlers({ weight: 30 });
    const numberInput = screen.getByRole("spinbutton");

    await user.clear(numberInput);

    expect(onWeightChange).toHaveBeenLastCalledWith(0);
  });
});

describe("ModuleCard — icon por tipo", () => {
  it("renderiza sin crash para cada tipo conocido", () => {
    const types = [
      "SKILLS",
      "EXPERIENCE",
      "EDUCATION",
      "LANGUAGES",
      "PORTFOLIO",
      "CUSTOM",
    ];
    for (const type of types) {
      const { unmount } = render(
        <ModuleCard
          module={buildModule({ type, label: `Mod ${type}` })}
          onEdit={vi.fn()}
          onDeactivate={vi.fn()}
          onWeightChange={vi.fn()}
        />,
      );
      expect(screen.getByText(`Mod ${type}`)).toBeInTheDocument();
      unmount();
    }
  });

  it("usa icon default (Star) para tipos desconocidos sin crash", () => {
    renderWithHandlers({ type: "UNKNOWN_TYPE", label: "Custom module" });
    expect(screen.getByText("Custom module")).toBeInTheDocument();
  });
});

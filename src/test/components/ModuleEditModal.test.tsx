import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ModuleEditModal from "@/components/ats/ModuleEditModal";
import type { ATSModuleState } from "@/components/ats/ModuleCard";

const buildModule = (
  overrides: Partial<ATSModuleState> = {},
): ATSModuleState => ({
  id: "m-1",
  type: "SKILLS",
  label: "Skills",
  icon: "⚡",
  isActive: true,
  weight: 30,
  order: 0,
  params: {},
  ...overrides,
});

describe("ModuleEditModal", () => {
  describe("render base", () => {
    it("renderiza el header 'Editar módulo'", () => {
      render(
        <ModuleEditModal
          module={buildModule()}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByText("Editar módulo")).toBeInTheDocument();
    });

    it("renderiza el label del módulo en el título", () => {
      render(
        <ModuleEditModal
          module={buildModule({ label: "Mis skills" })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByText("Mis skills")).toBeInTheDocument();
    });

    it("renderiza los botones 'Cancelar' y 'Guardar cambios'", () => {
      render(
        <ModuleEditModal
          module={buildModule()}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByText("Cancelar")).toBeInTheDocument();
      expect(screen.getByText("Guardar cambios")).toBeInTheDocument();
    });

    it("renderiza el botón de cerrar con aria-label", () => {
      render(
        <ModuleEditModal
          module={buildModule()}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(
        screen.getByRole("button", { name: "Cerrar" }),
      ).toBeInTheDocument();
    });
  });

  describe("cierre del modal", () => {
    it("dispara onClose al click en el botón X", () => {
      const onClose = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule()}
          onSave={() => {}}
          onClose={onClose}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("dispara onClose al click en 'Cancelar'", () => {
      const onClose = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule()}
          onSave={() => {}}
          onClose={onClose}
        />,
      );
      fireEvent.click(screen.getByText("Cancelar"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("guardado", () => {
    it("dispara onSave con el módulo actualizado y luego onClose", () => {
      const onSave = vi.fn();
      const onClose = vi.fn();
      const mod = buildModule({
        label: "Skills",
        params: { required: ["React"], hardFilter: false },
      });
      render(
        <ModuleEditModal module={mod} onSave={onSave} onClose={onClose} />,
      );
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave).toHaveBeenCalledTimes(1);
      const saved = onSave.mock.calls[0][0];
      expect(saved.label).toBe("Skills");
      expect(saved.params).toEqual({ required: ["React"], hardFilter: false });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("preserva campos originales del módulo (id, type, weight, order)", () => {
      const onSave = vi.fn();
      const mod = buildModule({
        id: "m-xyz",
        type: "SKILLS",
        weight: 45,
        order: 2,
      });
      render(
        <ModuleEditModal module={mod} onSave={onSave} onClose={() => {}} />,
      );
      fireEvent.click(screen.getByText("Guardar cambios"));
      const saved = onSave.mock.calls[0][0];
      expect(saved.id).toBe("m-xyz");
      expect(saved.type).toBe("SKILLS");
      expect(saved.weight).toBe(45);
      expect(saved.order).toBe(2);
    });
  });

  describe("tipo SKILLS", () => {
    it("renderiza tags iniciales de skills requeridas", () => {
      render(
        <ModuleEditModal
          module={buildModule({
            type: "SKILLS",
            params: { required: ["React", "TypeScript"], preferred: [] },
          })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });

    it("agrega un tag al presionar Enter en el input", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({ type: "SKILLS", params: { required: [] } })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const inputs = screen.getAllByPlaceholderText("ej: React, TypeScript");
      fireEvent.change(inputs[0], { target: { value: "Vue" } });
      fireEvent.keyDown(inputs[0], { key: "Enter" });
      expect(screen.getByText("Vue")).toBeInTheDocument();
    });

    it("elimina un tag al hacer click en su botón X", () => {
      render(
        <ModuleEditModal
          module={buildModule({
            type: "SKILLS",
            params: { required: ["React"] },
          })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Eliminar React" }));
      expect(screen.queryByText("React")).not.toBeInTheDocument();
    });

    it("no agrega tags duplicados", () => {
      render(
        <ModuleEditModal
          module={buildModule({
            type: "SKILLS",
            params: { required: ["React"] },
          })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      const input = screen.getAllByPlaceholderText("ej: React, TypeScript")[0];
      fireEvent.change(input, { target: { value: "React" } });
      fireEvent.keyDown(input, { key: "Enter" });
      // Solo debería haber 1 instancia de "React" entre los tags
      expect(screen.getAllByText("React")).toHaveLength(1);
    });

    it("no agrega tags vacíos o solo whitespace", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({ type: "SKILLS", params: { required: [] } })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const input = screen.getAllByPlaceholderText("ej: React, TypeScript")[0];
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.required).toEqual([]);
    });

    it("toggle del checkbox hardFilter actualiza el state", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "SKILLS",
            params: { hardFilter: false },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const checkbox = screen.getByLabelText(/Hard filter/);
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.hardFilter).toBe(true);
    });
  });

  describe("tipo SKILLS — preferred (handler línea 174)", () => {
    it("agrega y guarda skills preferidas", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "SKILLS",
            params: { required: [], preferred: [] },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const preferredInput = screen.getByPlaceholderText("ej: Docker, AWS");
      fireEvent.change(preferredInput, { target: { value: "Docker" } });
      fireEvent.keyDown(preferredInput, { key: "Enter" });
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.preferred).toEqual(["Docker"]);
    });
  });

  describe("tipo EXPERIENCE — preferredRoles + hardFilter (handlers 206/211)", () => {
    it("agrega y guarda roles preferidos", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "EXPERIENCE",
            params: { minYears: 0, preferredRoles: [], hardFilter: false },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const rolesInput = screen.getByPlaceholderText("ej: developer, analyst");
      fireEvent.change(rolesInput, { target: { value: "developer" } });
      fireEvent.keyDown(rolesInput, { key: "Enter" });
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.preferredRoles).toEqual([
        "developer",
      ]);
    });

    it("toggle del checkbox 'Hard filter' actualiza state en EXPERIENCE", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "EXPERIENCE",
            params: { minYears: 0, preferredRoles: [], hardFilter: false },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      fireEvent.click(screen.getByLabelText(/Hard filter/));
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.hardFilter).toBe(true);
    });
  });

  describe("tipo LANGUAGES — required (handler línea 255)", () => {
    it("agrega y guarda idiomas requeridos", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "LANGUAGES",
            params: { required: [], preferred: [] },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const requiredInput = screen.getByPlaceholderText(
        "ej: Inglés B2, Portugués A2",
      );
      fireEvent.change(requiredInput, { target: { value: "Inglés B2" } });
      fireEvent.keyDown(requiredInput, { key: "Enter" });
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.required).toEqual(["Inglés B2"]);
    });
  });

  describe("tipo EXPERIENCE", () => {
    it("renderiza input numérico de años mínimos", () => {
      render(
        <ModuleEditModal
          module={buildModule({
            type: "EXPERIENCE",
            params: { minYears: 2 },
          })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(
        screen.getByText("Años mínimos de experiencia"),
      ).toBeInTheDocument();
      const input = screen.getByDisplayValue("2") as HTMLInputElement;
      expect(input.type).toBe("number");
    });

    it("convierte input numérico vacío en 0", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "EXPERIENCE",
            params: { minYears: 5 },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const input = screen.getByDisplayValue("5");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.minYears).toBe(0);
    });
  });

  describe("tipo CUSTOM", () => {
    it("renderiza input editable de 'Nombre del módulo' SOLO en CUSTOM", () => {
      render(
        <ModuleEditModal
          module={buildModule({ type: "CUSTOM", label: "Mi módulo" })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByText("Nombre del módulo")).toBeInTheDocument();
    });

    it("no renderiza el campo 'Nombre del módulo' en otros tipos", () => {
      render(
        <ModuleEditModal
          module={buildModule({ type: "SKILLS" })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.queryByText("Nombre del módulo")).not.toBeInTheDocument();
    });

    it("permite editar el label del módulo CUSTOM y lo guarda", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({ type: "CUSTOM", label: "Original" })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const input = screen.getByDisplayValue("Original");
      fireEvent.change(input, { target: { value: "Editado" } });
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].label).toBe("Editado");
    });

    it("muestra mensaje explicativo de scoring manual", () => {
      render(
        <ModuleEditModal
          module={buildModule({ type: "CUSTOM" })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByText(/se puntúan manualmente/)).toBeInTheDocument();
    });
  });

  describe("tipo PORTFOLIO", () => {
    it("renderiza checkbox 'Portafolio requerido'", () => {
      render(
        <ModuleEditModal
          module={buildModule({
            type: "PORTFOLIO",
            params: { required: false, keywords: [] },
          })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByText("Portafolio requerido")).toBeInTheDocument();
    });

    it("renderiza tags iniciales de palabras clave", () => {
      render(
        <ModuleEditModal
          module={buildModule({
            type: "PORTFOLIO",
            params: { keywords: ["github", "behance"] },
          })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByText("github")).toBeInTheDocument();
      expect(screen.getByText("behance")).toBeInTheDocument();
    });

    it("toggle del checkbox 'Portafolio requerido' actualiza params.required", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "PORTFOLIO",
            params: { required: false, keywords: [] },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      fireEvent.click(screen.getByLabelText(/Portafolio requerido/));
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.required).toBe(true);
    });

    it("agrega y guarda nueva palabra clave", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "PORTFOLIO",
            params: { required: false, keywords: [] },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const input = screen.getByPlaceholderText(
        "ej: github, behance, portfolio",
      );
      fireEvent.change(input, { target: { value: "dribbble" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.keywords).toEqual(["dribbble"]);
    });

    it("toggle del checkbox 'Hard filter' actualiza params.hardFilter", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "PORTFOLIO",
            params: { required: false, keywords: [], hardFilter: false },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      fireEvent.click(screen.getByLabelText(/Hard filter/));
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.hardFilter).toBe(true);
    });
  });

  describe("tipo desconocido (default branch)", () => {
    it("no crashea ni renderiza fields cuando el type no está mapeado", () => {
      render(
        <ModuleEditModal
          module={buildModule({
            type: "UNKNOWN_TYPE" as ATSModuleState["type"],
            params: {},
          })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      // El header sigue, pero no hay campos específicos de tipo
      expect(screen.getByText("Editar módulo")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/ej:/)).not.toBeInTheDocument();
    });
  });

  describe("tipo EDUCATION", () => {
    it("renderiza input numérico de promedio mínimo", () => {
      render(
        <ModuleEditModal
          module={buildModule({
            type: "EDUCATION",
            params: { minGPA: 5.5, preferredDegrees: [] },
          })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByText(/Promedio mínimo/)).toBeInTheDocument();
      expect(screen.getByDisplayValue("5.5")).toBeInTheDocument();
    });

    it("guarda el nuevo minGPA al modificar el input", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "EDUCATION",
            params: { minGPA: 5, preferredDegrees: [] },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      fireEvent.change(screen.getByDisplayValue("5"), {
        target: { value: "6.5" },
      });
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.minGPA).toBe(6.5);
    });

    it("agrega y guarda carreras preferidas", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "EDUCATION",
            params: { minGPA: 0, preferredDegrees: [] },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const input = screen.getByPlaceholderText(
        "ej: Ingeniería, Computer Science",
      );
      fireEvent.change(input, { target: { value: "Ingeniería" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.preferredDegrees).toEqual([
        "Ingeniería",
      ]);
    });

    it("toggle de hardFilter actualiza el state", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "EDUCATION",
            params: { minGPA: 0, preferredDegrees: [], hardFilter: false },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      fireEvent.click(screen.getByLabelText(/Hard filter/));
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.hardFilter).toBe(true);
    });
  });

  describe("tipo LANGUAGES", () => {
    it("renderiza tags iniciales de idiomas requeridos", () => {
      render(
        <ModuleEditModal
          module={buildModule({
            type: "LANGUAGES",
            params: { required: ["Inglés B2"], preferred: [] },
          })}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByText("Inglés B2")).toBeInTheDocument();
    });

    it("agrega y guarda idiomas preferidos", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "LANGUAGES",
            params: { required: [], preferred: [] },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      const input = screen.getByPlaceholderText("ej: Francés A1");
      fireEvent.change(input, { target: { value: "Portugués A2" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.preferred).toEqual([
        "Portugués A2",
      ]);
    });

    it("toggle de hardFilter actualiza el state", () => {
      const onSave = vi.fn();
      render(
        <ModuleEditModal
          module={buildModule({
            type: "LANGUAGES",
            params: { required: [], preferred: [], hardFilter: false },
          })}
          onSave={onSave}
          onClose={() => {}}
        />,
      );
      fireEvent.click(screen.getByLabelText(/Hard filter/));
      fireEvent.click(screen.getByText("Guardar cambios"));
      expect(onSave.mock.calls[0][0].params.hardFilter).toBe(true);
    });
  });

  describe("aislamiento de params (no muta el módulo original)", () => {
    it("no muta los params del módulo recibido por prop al editar", () => {
      const original = buildModule({
        type: "SKILLS",
        params: { required: ["React"] },
      });
      const originalParamsSnapshot = JSON.parse(
        JSON.stringify(original.params),
      );
      render(
        <ModuleEditModal
          module={original}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );
      const card = screen.getByText("React").closest("span");
      const xBtn = within(card!).getByRole("button", {
        name: "Eliminar React",
      });
      fireEvent.click(xBtn);
      // Los params originales del prop deben quedar intactos
      expect(original.params).toEqual(originalParamsSnapshot);
    });
  });
});

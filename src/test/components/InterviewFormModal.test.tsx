import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import InterviewFormModal from "@/components/chat/calendar/InterviewFormModal";

const buildCandidate = (
  overrides: Partial<{
    applicationId: string;
    conversationId: string | null;
    student: { id: string; name: string; image: string | null };
  }> = {},
) => ({
  applicationId: "app-1",
  conversationId: "conv-1",
  student: {
    id: "stu-1",
    name: "Juan Pérez",
    image: null,
  },
  ...overrides,
});

const baseProps = {
  internships: [
    { id: "int-1", title: "Backend Intern" },
    { id: "int-2", title: "Frontend Intern" },
  ],
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

const mockFetchCandidates = (data: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InterviewFormModal", () => {
  describe("render base — modo crear", () => {
    it("renderiza header 'Nueva entrevista'", () => {
      mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);
      expect(screen.getByText("Nueva entrevista")).toBeInTheDocument();
      expect(
        screen.getByText("Completá los campos para agendar"),
      ).toBeInTheDocument();
    });

    it("renderiza opciones de prácticas en el select", () => {
      mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);
      expect(screen.getByText("Backend Intern")).toBeInTheDocument();
      expect(screen.getByText("Frontend Intern")).toBeInTheDocument();
    });

    it("dispara onClose al click en X", () => {
      mockFetchCandidates([]);
      const onClose = vi.fn();
      render(<InterviewFormModal {...baseProps} onClose={onClose} />);
      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("dispara onClose al click en backdrop", () => {
      mockFetchCandidates([]);
      const onClose = vi.fn();
      render(<InterviewFormModal {...baseProps} onClose={onClose} />);
      const backdrop = document.body.querySelector(
        ".bg-\\[\\#0A0909\\]\\/50",
      ) as HTMLElement;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("dispara onClose al click en 'Cancelar' del footer", () => {
      mockFetchCandidates([]);
      const onClose = vi.fn();
      render(<InterviewFormModal {...baseProps} onClose={onClose} />);
      fireEvent.click(screen.getByText("Cancelar"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("render base — modo editar", () => {
    const initialData = {
      internshipId: "int-1",
      applicationId: "app-1",
      conversationId: "conv-1",
      title: "Entrevista técnica",
      scheduledAt: "2026-04-25T14:30:00.000Z",
      durationMins: 90,
      meetingLink: "https://meet.google.com/abc",
      notes: "Trae portafolio",
      sentToChat: false,
    };

    it("renderiza header 'Editar entrevista'", () => {
      mockFetchCandidates([buildCandidate()]);
      render(
        <InterviewFormModal
          {...baseProps}
          editingId="iv-1"
          initialData={initialData}
        />,
      );
      expect(screen.getByText("Editar entrevista")).toBeInTheDocument();
      expect(
        screen.getByText("Actualizá los datos y guardá"),
      ).toBeInTheDocument();
    });

    it("popula el form con initialData", () => {
      mockFetchCandidates([buildCandidate()]);
      render(
        <InterviewFormModal
          {...baseProps}
          editingId="iv-1"
          initialData={initialData}
        />,
      );

      expect(
        screen.getByDisplayValue("Entrevista técnica"),
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("https://meet.google.com/abc"),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("Trae portafolio")).toBeInTheDocument();
    });

    it("muestra '(Práctica inactiva)' si initialData.internshipId no está en internships", () => {
      mockFetchCandidates([]);
      render(
        <InterviewFormModal
          {...baseProps}
          editingId="iv-1"
          initialData={{ ...initialData, internshipId: "int-ghost" }}
        />,
      );

      expect(screen.getByText("(Práctica inactiva)")).toBeInTheDocument();
    });

    it("muestra warning cuando candidate cambia y sentToChat=true", async () => {
      mockFetchCandidates([
        buildCandidate({ applicationId: "app-1" }),
        buildCandidate({
          applicationId: "app-2",
          student: { id: "s-2", name: "María", image: null },
        }),
      ]);
      render(
        <InterviewFormModal
          {...baseProps}
          editingId="iv-1"
          initialData={{ ...initialData, sentToChat: true }}
        />,
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("Juan Pérez")).toBeInTheDocument();
      });

      const candidateSelect = screen.getAllByRole(
        "combobox",
      )[1] as HTMLSelectElement;
      fireEvent.change(candidateSelect, { target: { value: "app-2" } });

      await waitFor(() => {
        expect(
          screen.getByText(
            /Al cambiar el candidato se notificará al candidato anterior/,
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe("fetch de candidatos", () => {
    it("NO llama a fetch si internshipId está vacío", () => {
      const fetchSpy = mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("llama a /api/interviews/available-candidates/:id al cambiar internship", async () => {
      const fetchSpy = mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/interviews/available-candidates/int-1",
        );
      });
    });

    it("muestra 'Cargando candidatos...' durante el fetch", async () => {
      let resolve!: (value: Response) => void;
      vi.spyOn(globalThis, "fetch").mockImplementation(
        () =>
          new Promise<Response>((r) => {
            resolve = r;
          }),
      );

      render(<InterviewFormModal {...baseProps} />);
      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });

      await waitFor(() => {
        expect(screen.getByText("Cargando candidatos...")).toBeInTheDocument();
      });

      resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
    });

    it("muestra mensaje empty cuando fetch retorna []", async () => {
      mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);
      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "No hay candidatos en etapa INTERVIEW sin entrevista activa.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("captura errores de fetch (console.error)", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<InterviewFormModal {...baseProps} />);
      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });

      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalled();
      });
    });

    it("popula select de candidatos con conversationId null marca '(sin chat activo)'", async () => {
      mockFetchCandidates([
        buildCandidate({ conversationId: null, applicationId: "app-x" }),
      ]);
      render(<InterviewFormModal {...baseProps} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });

      await waitFor(() => {
        expect(
          screen.getByText(/Juan Pérez \(sin chat activo\)/),
        ).toBeInTheDocument();
      });
    });

    it("setea data=[] cuando fetch retorna null/undefined", async () => {
      mockFetchCandidates(null);
      render(<InterviewFormModal {...baseProps} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "No hay candidatos en etapa INTERVIEW sin entrevista activa.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("cambiar de internship resetea applicationId del form", async () => {
      mockFetchCandidates([buildCandidate()]);
      render(<InterviewFormModal {...baseProps} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });

      await waitFor(() => {
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      });

      const candidateSelect = screen.getAllByRole(
        "combobox",
      )[1] as HTMLSelectElement;
      fireEvent.change(candidateSelect, { target: { value: "app-1" } });
      expect(candidateSelect.value).toBe("app-1");

      // Cambiar internship → applicationId vuelve a ""
      fireEvent.change(internshipSelect, { target: { value: "int-2" } });
      await waitFor(() => {
        expect(candidateSelect.value).toBe("");
      });
    });
  });

  describe("validaciones del submit", () => {
    it("error si internshipId está vacío", async () => {
      mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);
      fireEvent.click(screen.getByText(/Guardar/));

      await waitFor(() => {
        expect(screen.getByText("Seleccioná una práctica")).toBeInTheDocument();
      });
    });

    it("error si applicationId está vacío", async () => {
      mockFetchCandidates([buildCandidate()]);
      render(<InterviewFormModal {...baseProps} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });

      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByText(/Guardar/));

      await waitFor(() => {
        expect(screen.getByText("Seleccioná un candidato")).toBeInTheDocument();
      });
    });

    it("error si el candidato no tiene conversación activa", async () => {
      mockFetchCandidates([buildCandidate({ conversationId: null })]);
      render(<InterviewFormModal {...baseProps} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });

      await waitFor(() =>
        expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument(),
      );

      const candidateSelect = screen.getAllByRole(
        "combobox",
      )[1] as HTMLSelectElement;
      fireEvent.change(candidateSelect, { target: { value: "app-1" } });

      fireEvent.click(screen.getByText(/Guardar/));

      await waitFor(() => {
        expect(
          screen.getByText(/no tiene una conversación activa/),
        ).toBeInTheDocument();
      });
    });

    it("error si el título está vacío", async () => {
      mockFetchCandidates([buildCandidate()]);
      render(<InterviewFormModal {...baseProps} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });
      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      const candidateSelect = screen.getAllByRole(
        "combobox",
      )[1] as HTMLSelectElement;
      fireEvent.change(candidateSelect, { target: { value: "app-1" } });

      fireEvent.click(screen.getByText(/Guardar/));

      await waitFor(() => {
        expect(screen.getByText("El título es requerido")).toBeInTheDocument();
      });
    });

    it("error si fecha o hora están vacías", async () => {
      mockFetchCandidates([buildCandidate()]);
      render(<InterviewFormModal {...baseProps} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });
      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      const candidateSelect = screen.getAllByRole(
        "combobox",
      )[1] as HTMLSelectElement;
      fireEvent.change(candidateSelect, { target: { value: "app-1" } });

      const titleInput = screen.getByPlaceholderText(
        "Ej: Entrevista técnica — Frontend Dev",
      );
      fireEvent.change(titleInput, { target: { value: "Entrevista X" } });

      fireEvent.click(screen.getByText(/Guardar/));

      await waitFor(() => {
        expect(
          screen.getByText("Fecha y hora son requeridas"),
        ).toBeInTheDocument();
      });
    });

    it("título solo whitespace falla la validación", async () => {
      mockFetchCandidates([buildCandidate()]);
      render(<InterviewFormModal {...baseProps} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });
      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      const candidateSelect = screen.getAllByRole(
        "combobox",
      )[1] as HTMLSelectElement;
      fireEvent.change(candidateSelect, { target: { value: "app-1" } });

      const titleInput = screen.getByPlaceholderText(
        "Ej: Entrevista técnica — Frontend Dev",
      );
      fireEvent.change(titleInput, { target: { value: "   " } });

      fireEvent.click(screen.getByText(/Guardar/));

      await waitFor(() => {
        expect(screen.getByText("El título es requerido")).toBeInTheDocument();
      });
    });
  });

  describe("submit happy path", () => {
    const setupCompleteForm = async () => {
      mockFetchCandidates([buildCandidate()]);
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<InterviewFormModal {...baseProps} onSubmit={onSubmit} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });
      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      const candidateSelect = screen.getAllByRole(
        "combobox",
      )[1] as HTMLSelectElement;
      fireEvent.change(candidateSelect, { target: { value: "app-1" } });

      fireEvent.change(
        screen.getByPlaceholderText("Ej: Entrevista técnica — Frontend Dev"),
        { target: { value: "Entrevista FE" } },
      );

      const dateInput = document.body.querySelector(
        "input[type='date']",
      ) as HTMLInputElement;
      const timeInput = document.body.querySelector(
        "input[type='time']",
      ) as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: "2026-05-01" } });
      fireEvent.change(timeInput, { target: { value: "14:30" } });

      return { onSubmit };
    };

    it("llama a onSubmit con los datos del form", async () => {
      const { onSubmit } = await setupCompleteForm();
      fireEvent.click(screen.getByText(/Guardar/));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            internshipId: "int-1",
            applicationId: "app-1",
            conversationId: "conv-1",
            title: "Entrevista FE",
            date: "2026-05-01",
            time: "14:30",
            durationMins: 60,
          }),
        );
      });
    });

    it("muestra 'Guardando...' mientras onSubmit está pendiente", async () => {
      mockFetchCandidates([buildCandidate()]);
      let resolve!: () => void;
      const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
      render(<InterviewFormModal {...baseProps} onSubmit={onSubmit} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });
      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      const candidateSelect = screen.getAllByRole(
        "combobox",
      )[1] as HTMLSelectElement;
      fireEvent.change(candidateSelect, { target: { value: "app-1" } });

      fireEvent.change(
        screen.getByPlaceholderText("Ej: Entrevista técnica — Frontend Dev"),
        { target: { value: "X" } },
      );

      const dateInput = document.body.querySelector(
        "input[type='date']",
      ) as HTMLInputElement;
      const timeInput = document.body.querySelector(
        "input[type='time']",
      ) as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: "2026-05-01" } });
      fireEvent.change(timeInput, { target: { value: "14:30" } });

      fireEvent.click(screen.getByText(/Guardar/));

      await waitFor(() => {
        expect(screen.getByText("Guardando...")).toBeInTheDocument();
      });

      resolve();
    });

    it("muestra error.message si onSubmit lanza Error", async () => {
      mockFetchCandidates([buildCandidate()]);
      const onSubmit = vi.fn().mockRejectedValue(new Error("DB down"));
      render(<InterviewFormModal {...baseProps} onSubmit={onSubmit} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });
      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      const candidateSelect = screen.getAllByRole(
        "combobox",
      )[1] as HTMLSelectElement;
      fireEvent.change(candidateSelect, { target: { value: "app-1" } });

      fireEvent.change(
        screen.getByPlaceholderText("Ej: Entrevista técnica — Frontend Dev"),
        { target: { value: "Test" } },
      );

      const dateInput = document.body.querySelector(
        "input[type='date']",
      ) as HTMLInputElement;
      const timeInput = document.body.querySelector(
        "input[type='time']",
      ) as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: "2026-05-01" } });
      fireEvent.change(timeInput, { target: { value: "14:30" } });

      fireEvent.click(screen.getByText(/Guardar/));

      await waitFor(() => {
        expect(screen.getByText("DB down")).toBeInTheDocument();
      });
    });

    it("muestra 'Error al guardar' si onSubmit lanza algo no-Error", async () => {
      mockFetchCandidates([buildCandidate()]);
      const onSubmit = vi.fn().mockRejectedValue("string raro");
      render(<InterviewFormModal {...baseProps} onSubmit={onSubmit} />);

      const internshipSelect = screen.getAllByRole(
        "combobox",
      )[0] as HTMLSelectElement;
      fireEvent.change(internshipSelect, { target: { value: "int-1" } });
      await waitFor(() =>
        expect(screen.getByText("Juan Pérez")).toBeInTheDocument(),
      );

      const candidateSelect = screen.getAllByRole(
        "combobox",
      )[1] as HTMLSelectElement;
      fireEvent.change(candidateSelect, { target: { value: "app-1" } });

      fireEvent.change(
        screen.getByPlaceholderText("Ej: Entrevista técnica — Frontend Dev"),
        { target: { value: "Test" } },
      );

      const dateInput = document.body.querySelector(
        "input[type='date']",
      ) as HTMLInputElement;
      const timeInput = document.body.querySelector(
        "input[type='time']",
      ) as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: "2026-05-01" } });
      fireEvent.change(timeInput, { target: { value: "14:30" } });

      fireEvent.click(screen.getByText(/Guardar/));

      await waitFor(() => {
        expect(screen.getByText("Error al guardar")).toBeInTheDocument();
      });
    });
  });

  describe("duración", () => {
    it("muestra los 4 botones de duración (30, 60, 90, 120)", () => {
      mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);

      expect(screen.getByText("30 min")).toBeInTheDocument();
      expect(screen.getByText("60 min")).toBeInTheDocument();
      expect(screen.getByText("90 min")).toBeInTheDocument();
      expect(screen.getByText("120 min")).toBeInTheDocument();
    });

    it("60 min es el default activo", () => {
      mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);
      expect(screen.getByText("60 min").className).toContain("bg-[#0A0909]");
      expect(screen.getByText("30 min").className).not.toContain(
        "bg-[#0A0909]",
      );
    });

    it("click en otro botón cambia el activo", () => {
      mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);
      fireEvent.click(screen.getByText("90 min"));

      expect(screen.getByText("90 min").className).toContain("bg-[#0A0909]");
      expect(screen.getByText("60 min").className).not.toContain(
        "bg-[#0A0909]",
      );
    });
  });

  describe("inputs opcionales (link y notas)", () => {
    it("link y notas inician vacíos en modo crear", () => {
      mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);

      const linkInput = screen.getByPlaceholderText(
        "zoom.us/j/... o meet.google.com/...",
      ) as HTMLInputElement;
      const notesInput = screen.getByPlaceholderText(
        "Ej: Por favor traé tu portafolio...",
      ) as HTMLTextAreaElement;
      expect(linkInput.value).toBe("");
      expect(notesInput.value).toBe("");
    });

    it("permite escribir en el link y notas", () => {
      mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);

      const linkInput = screen.getByPlaceholderText(
        "zoom.us/j/... o meet.google.com/...",
      ) as HTMLInputElement;
      const notesInput = screen.getByPlaceholderText(
        "Ej: Por favor traé tu portafolio...",
      ) as HTMLTextAreaElement;

      fireEvent.change(linkInput, { target: { value: "https://meet/x" } });
      fireEvent.change(notesInput, { target: { value: "Notas X" } });

      expect(linkInput.value).toBe("https://meet/x");
      expect(notesInput.value).toBe("Notas X");
    });
  });

  describe("aviso de envío manual", () => {
    it("siempre muestra el aviso 'no se enviará al candidato hasta...'", () => {
      mockFetchCandidates([]);
      render(<InterviewFormModal {...baseProps} />);
      expect(
        screen.getByText(/no se enviará al candidato/),
      ).toBeInTheDocument();
    });
  });
});

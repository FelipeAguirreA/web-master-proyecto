import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScoreBreakdownModal from "@/components/ats/ScoreBreakdownModal";

type ModuleScore = {
  moduleId: string;
  type: string;
  label: string;
  weight: number;
  score: number;
  passed: boolean;
  reason?: string;
};

type Applicant = {
  id: string;
  student: {
    name: string;
    email: string;
    image?: string | null;
  };
  atsScore: number | null;
  moduleScores: ModuleScore[] | null;
  passedFilters: boolean;
  filterReason: string | null;
  pipelineStatus: string;
};

const buildApplicant = (overrides: Partial<Applicant> = {}): Applicant => ({
  id: "a-1",
  student: {
    name: "Juan Pérez",
    email: "juan@x.com",
    image: null,
  },
  atsScore: 85,
  moduleScores: [],
  passedFilters: true,
  filterReason: null,
  pipelineStatus: "PENDING",
  ...overrides,
});

describe("ScoreBreakdownModal", () => {
  describe("header", () => {
    it("renderiza el nombre y email del estudiante", () => {
      render(
        <ScoreBreakdownModal applicant={buildApplicant()} onClose={() => {}} />,
      );

      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("juan@x.com")).toBeInTheDocument();
    });

    it("renderiza la imagen cuando hay student.image", () => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({
            student: {
              name: "Juan",
              email: "j@x.com",
              image: "https://x.com/avatar.jpg",
            },
          })}
          onClose={() => {}}
        />,
      );

      const img = screen.getByAltText("Juan") as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toBe("https://x.com/avatar.jpg");
    });

    it("renderiza la inicial cuando no hay imagen", () => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({
            student: { name: "maría", email: "m@x.com", image: null },
          })}
          onClose={() => {}}
        />,
      );

      // inicial debe estar en mayúscula
      expect(screen.getByText("M")).toBeInTheDocument();
    });

    it("dispara onClose al click en el botón Cerrar", () => {
      const onClose = vi.fn();
      render(
        <ScoreBreakdownModal applicant={buildApplicant()} onClose={onClose} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("dispara onClose al click en el backdrop", () => {
      const onClose = vi.fn();
      const { container } = render(
        <ScoreBreakdownModal applicant={buildApplicant()} onClose={onClose} />,
      );

      const backdrop = container.ownerDocument.body.querySelector(
        ".bg-\\[\\#0A0909\\]\\/50",
      ) as HTMLElement;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("score general", () => {
    it("renderiza estado 'Calculando' cuando atsScore es null", () => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({ atsScore: null })}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("Calculando")).toBeInTheDocument();
      expect(
        screen.getByText("El score se está procesando"),
      ).toBeInTheDocument();
    });

    it("renderiza estado 'Descalificado' con filterReason cuando passedFilters=false", () => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({
            passedFilters: false,
            filterReason: "Falta skill obligatoria: React",
          })}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("Descalificado")).toBeInTheDocument();
      expect(
        screen.getByText("Falta skill obligatoria: React"),
      ).toBeInTheDocument();
    });

    it("renderiza el atsScore como número grande con %", () => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({ atsScore: 92 })}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("92")).toBeInTheDocument();
      expect(screen.getByText("Score ATS total")).toBeInTheDocument();
    });
  });

  describe("breakdown de módulos", () => {
    it("renderiza un row por cada moduleScore con label y peso", () => {
      const modules: ModuleScore[] = [
        {
          moduleId: "m-1",
          type: "SKILLS",
          label: "Skills",
          weight: 30,
          score: 85,
          passed: true,
        },
        {
          moduleId: "m-2",
          type: "EXPERIENCE",
          label: "Experiencia",
          weight: 25,
          score: 70,
          passed: true,
        },
      ];

      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({ moduleScores: modules })}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("Skills")).toBeInTheDocument();
      expect(screen.getByText("Experiencia")).toBeInTheDocument();
      expect(screen.getByText("Peso 30%")).toBeInTheDocument();
      expect(screen.getByText("Peso 25%")).toBeInTheDocument();
    });

    it("muestra el % del score cuando passed=true", () => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({
            moduleScores: [
              {
                moduleId: "m-1",
                type: "SKILLS",
                label: "Skills",
                weight: 30,
                score: 75,
                passed: true,
              },
            ],
          })}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("muestra '✕' cuando passed=false", () => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({
            moduleScores: [
              {
                moduleId: "m-1",
                type: "SKILLS",
                label: "Skills",
                weight: 30,
                score: 0,
                passed: false,
                reason: "No cumple",
              },
            ],
          })}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("✕")).toBeInTheDocument();
      expect(screen.getByText("No cumple")).toBeInTheDocument();
    });

    it("muestra mensaje de empty cuando moduleScores=[] y atsScore!==null", () => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({
            moduleScores: [],
            atsScore: 50,
          })}
          onClose={() => {}}
        />,
      );

      expect(
        screen.getByText("No hay módulos activos en la configuración ATS."),
      ).toBeInTheDocument();
    });

    it("NO muestra mensaje de empty cuando atsScore es null", () => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({
            moduleScores: [],
            atsScore: null,
          })}
          onClose={() => {}}
        />,
      );

      expect(
        screen.queryByText("No hay módulos activos en la configuración ATS."),
      ).not.toBeInTheDocument();
    });

    it("usa el icono Star como fallback para tipos desconocidos (CUSTOM o no listado)", () => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({
            moduleScores: [
              {
                moduleId: "m-x",
                type: "TIPO_RARO",
                label: "Custom",
                weight: 20,
                score: 60,
                passed: true,
              },
            ],
          })}
          onClose={() => {}}
        />,
      );

      expect(document.body.querySelector("svg")).not.toBeNull();
    });
  });

  describe("ScoreBar (estilos según score)", () => {
    const renderWithScore = (score: number, passed = true) => {
      render(
        <ScoreBreakdownModal
          applicant={buildApplicant({
            moduleScores: [
              {
                moduleId: "m-1",
                type: "SKILLS",
                label: "Skills",
                weight: 30,
                score,
                passed,
              },
            ],
          })}
          onClose={() => {}}
        />,
      );
    };

    it("score >= 80 → fill verde", () => {
      renderWithScore(85);
      expect(document.body.querySelector(".bg-\\[\\#10B981\\]")).not.toBeNull();
    });

    it("60 <= score < 80 → fill naranja gradient", () => {
      renderWithScore(70);
      expect(
        document.body.querySelector(".bg-gradient-to-r.from-\\[\\#FF6A3D\\]"),
      ).not.toBeNull();
    });

    it("score < 60 (passed) → fill gris", () => {
      renderWithScore(40);
      expect(document.body.querySelector(".bg-\\[\\#C9C6BF\\]")).not.toBeNull();
    });

    it("!passed → fill rojo independiente del score", () => {
      renderWithScore(95, false);
      expect(document.body.querySelector(".bg-\\[\\#EF4444\\]")).not.toBeNull();
    });
  });
});

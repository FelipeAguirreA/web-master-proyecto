import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import CandidateCard, {
  type CandidateData,
} from "@/components/ats/CandidateCard";

function buildCandidate(overrides: Partial<CandidateData> = {}): CandidateData {
  return {
    id: "app-1",
    status: "PENDING",
    student: {
      name: "Camila Torres",
      email: "camila@example.com",
      image: null,
      studentProfile: {
        career: "Ingeniería Informática",
        university: "Universidad de Chile",
        cvUrl: null,
      },
    },
    atsScore: 75,
    moduleScores: [],
    passedFilters: true,
    filterReason: null,
    pipelineStatus: "REVIEWING",
    matchScore: null,
    ...overrides,
  };
}

describe("CandidateCard — información básica", () => {
  it("renderiza el nombre del estudiante", () => {
    render(<CandidateCard candidate={buildCandidate()} />);
    expect(screen.getByText("Camila Torres")).toBeInTheDocument();
  });

  it("renderiza la inicial del nombre en el avatar (mayúscula)", () => {
    render(<CandidateCard candidate={buildCandidate()} />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("muestra la carrera cuando el perfil la tiene", () => {
    render(<CandidateCard candidate={buildCandidate()} />);
    expect(screen.getByText("Ingeniería Informática")).toBeInTheDocument();
  });

  it("fallback al email cuando no hay carrera", () => {
    const candidate = buildCandidate({
      student: {
        name: "Pedro Pérez",
        email: "pedro@example.com",
        image: null,
        studentProfile: {
          career: null,
          university: null,
          cvUrl: null,
        },
      },
    });
    render(<CandidateCard candidate={candidate} />);
    expect(screen.getByText("pedro@example.com")).toBeInTheDocument();
  });
});

describe("CandidateCard — pipeline status badge", () => {
  it("muestra 'Pendiente' para PENDING", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({ pipelineStatus: "PENDING" })}
      />,
    );
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("muestra 'En revisión' para REVIEWING", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({ pipelineStatus: "REVIEWING" })}
      />,
    );
    expect(screen.getByText("En revisión")).toBeInTheDocument();
  });

  it("muestra 'Entrevista' para INTERVIEW", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({ pipelineStatus: "INTERVIEW" })}
      />,
    );
    expect(screen.getByText("Entrevista")).toBeInTheDocument();
  });

  it("muestra 'Rechazado' para REJECTED", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({ pipelineStatus: "REJECTED" })}
      />,
    );
    expect(screen.getByText("Rechazado")).toBeInTheDocument();
  });

  it("fallback a 'Pendiente' para status desconocido", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({ pipelineStatus: "UNKNOWN_X" })}
      />,
    );
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });
});

describe("CandidateCard — ATS score", () => {
  it("muestra el score cuando passedFilters es true", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({ atsScore: 85, passedFilters: true })}
      />,
    );
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("muestra ✕ cuando passedFilters es false", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({
          atsScore: 0,
          passedFilters: false,
          filterReason: "Faltan skills",
        })}
      />,
    );
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("oculta el score cuando atsScore es null", () => {
    render(<CandidateCard candidate={buildCandidate({ atsScore: null })} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("oculta el score cuando showScore es false", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({ atsScore: 90 })}
        showScore={false}
      />,
    );
    expect(screen.queryByText("90%")).not.toBeInTheDocument();
  });

  it("aplica color verde para score >= 80", () => {
    render(<CandidateCard candidate={buildCandidate({ atsScore: 80 })} />);
    expect(screen.getByText("80%").className).toContain("bg-[#ECFDF3]");
  });

  it("aplica color ámbar para score entre 60 y 79", () => {
    render(<CandidateCard candidate={buildCandidate({ atsScore: 65 })} />);
    expect(screen.getByText("65%").className).toContain("bg-[#FFF7EC]");
  });

  it("aplica color neutral para score < 60", () => {
    render(<CandidateCard candidate={buildCandidate({ atsScore: 40 })} />);
    expect(screen.getByText("40%").className).toContain("bg-[#F5F4F1]");
  });

  it("aplica color rojo cuando passedFilters es false", () => {
    render(
      <CandidateCard
        candidate={buildCandidate({
          atsScore: 90,
          passedFilters: false,
        })}
      />,
    );
    expect(screen.getByText("✕").className).toContain("bg-[#FEF2F2]");
  });
});

describe("CandidateCard — CV link", () => {
  it("muestra el link al CV cuando cvUrl existe", () => {
    const candidate = buildCandidate({
      student: {
        name: "María",
        email: "m@m.com",
        image: null,
        studentProfile: {
          career: "Diseño",
          university: null,
          cvUrl: "https://example.com/cv.pdf",
        },
      },
    });
    render(<CandidateCard candidate={candidate} />);
    const link = screen.getByRole("link", { name: /CV/i });
    expect(link).toHaveAttribute("href", "https://example.com/cv.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("oculta el link cuando cvUrl es null", () => {
    render(<CandidateCard candidate={buildCandidate()} />);
    expect(screen.queryByRole("link", { name: /CV/i })).not.toBeInTheDocument();
  });

  it("click en CV NO dispara onOpenDetail (stopPropagation)", async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    const candidate = buildCandidate({
      student: {
        name: "María",
        email: "m@m.com",
        image: null,
        studentProfile: {
          career: "Diseño",
          university: null,
          cvUrl: "https://example.com/cv.pdf",
        },
      },
    });

    render(<CandidateCard candidate={candidate} onOpenDetail={onOpenDetail} />);
    await user.click(screen.getByRole("link", { name: /CV/i }));

    expect(onOpenDetail).not.toHaveBeenCalled();
  });
});

describe("CandidateCard — onOpenDetail", () => {
  it("dispara onOpenDetail al clickear la card", async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();

    render(
      <CandidateCard
        candidate={buildCandidate()}
        onOpenDetail={onOpenDetail}
      />,
    );
    await user.click(screen.getByText("Camila Torres"));

    expect(onOpenDetail).toHaveBeenCalledOnce();
  });

  it("no rompe si onOpenDetail no se pasa", async () => {
    const user = userEvent.setup();

    render(<CandidateCard candidate={buildCandidate()} />);

    // No debería explotar al clickear sin handler
    await expect(
      user.click(screen.getByText("Camila Torres")),
    ).resolves.not.toThrow();
  });
});

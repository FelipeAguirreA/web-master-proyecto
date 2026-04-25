import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KanbanColumn from "@/components/ats/KanbanColumn";
import type { CandidateData } from "@/components/ats/CandidateCard";

vi.mock("@/components/ats/CandidateCard", () => ({
  default: ({
    candidate,
    onOpenDetail,
  }: {
    candidate: { id: string; name: string };
    onOpenDetail: () => void;
  }) => (
    <div data-testid="candidate-card" onClick={onOpenDetail}>
      {candidate.name}
    </div>
  ),
}));

const buildCandidate = (
  overrides: Partial<CandidateData> = {},
): CandidateData =>
  ({
    id: "c-1",
    name: "Juan Pérez",
    email: "juan@x.com",
    image: null,
    atsScore: 85,
    pipelineStatus: "PENDING",
    passedFilters: true,
    filterReason: null,
    appliedAt: "2026-04-25T00:00:00.000Z",
    ...overrides,
  }) as CandidateData;

const baseProps = {
  status: "PENDING",
  label: "Pendientes",
  color: "bg-blue-500",
  candidates: [buildCandidate()],
  onDrop: vi.fn(),
  onOpenDetail: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("KanbanColumn", () => {
  it("renderiza el label en uppercase implícito (CSS) y el color en el dot", () => {
    const { container } = render(<KanbanColumn {...baseProps} />);

    expect(screen.getByText("Pendientes")).toBeInTheDocument();
    expect(container.querySelector(".bg-blue-500")).not.toBeNull();
  });

  it("muestra el conteo correcto de candidatos", () => {
    render(
      <KanbanColumn
        {...baseProps}
        candidates={[buildCandidate(), buildCandidate({ id: "c-2" })]}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("muestra empty state cuando no hay candidatos", () => {
    render(<KanbanColumn {...baseProps} candidates={[]} />);

    expect(screen.getByText("Arrastrá candidatos acá")).toBeInTheDocument();
    expect(screen.queryByTestId("candidate-card")).not.toBeInTheDocument();
  });

  it("renderiza un CandidateCard por cada candidato", () => {
    render(
      <KanbanColumn
        {...baseProps}
        candidates={[
          buildCandidate({ id: "c-1", name: "Juan" }),
          buildCandidate({ id: "c-2", name: "María" }),
          buildCandidate({ id: "c-3", name: "Pedro" }),
        ]}
      />,
    );

    expect(screen.getAllByTestId("candidate-card")).toHaveLength(3);
    expect(screen.getByText("Juan")).toBeInTheDocument();
    expect(screen.getByText("María")).toBeInTheDocument();
    expect(screen.getByText("Pedro")).toBeInTheDocument();
  });

  it("dispara onOpenDetail al hacer click en un CandidateCard", () => {
    const onOpenDetail = vi.fn();
    render(<KanbanColumn {...baseProps} onOpenDetail={onOpenDetail} />);

    fireEvent.click(screen.getByTestId("candidate-card"));

    expect(onOpenDetail).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c-1" }),
    );
  });

  it("handleDragOver previene default y setea dropEffect 'move'", () => {
    const { container } = render(<KanbanColumn {...baseProps} />);
    const column = container.firstChild as HTMLElement;

    const dataTransfer = { dropEffect: "" } as DataTransfer;
    const event = new Event("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    column.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe("move");
  });

  it("handleDrop llama a onDrop con candidateId y status cuando hay candidateId", () => {
    const onDrop = vi.fn();
    const { container } = render(
      <KanbanColumn {...baseProps} onDrop={onDrop} />,
    );
    const column = container.firstChild as HTMLElement;

    const dataTransfer = {
      getData: vi.fn(() => "c-99"),
    } as unknown as DataTransfer;
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    column.dispatchEvent(event);

    expect(onDrop).toHaveBeenCalledWith("c-99", "PENDING");
    expect(event.defaultPrevented).toBe(true);
  });

  it("handleDrop NO llama a onDrop si dataTransfer no tiene candidateId", () => {
    const onDrop = vi.fn();
    const { container } = render(
      <KanbanColumn {...baseProps} onDrop={onDrop} />,
    );
    const column = container.firstChild as HTMLElement;

    const dataTransfer = {
      getData: vi.fn(() => ""),
    } as unknown as DataTransfer;
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    column.dispatchEvent(event);

    expect(onDrop).not.toHaveBeenCalled();
  });

  it("dragStart en una card setea candidateId y effectAllowed='move'", () => {
    const { container } = render(<KanbanColumn {...baseProps} />);
    const draggable = container.querySelector("[draggable]") as HTMLElement;

    const setData = vi.fn();
    const dataTransfer = {
      setData,
      effectAllowed: "",
    } as unknown as DataTransfer;
    const event = new Event("dragstart", { bubbles: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    draggable.dispatchEvent(event);

    expect(setData).toHaveBeenCalledWith("candidateId", "c-1");
    expect(dataTransfer.effectAllowed).toBe("move");
  });
});

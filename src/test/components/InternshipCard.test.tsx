import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import InternshipCard from "@/components/ui/InternshipCard";

const baseInternship = {
  id: "int-1",
  title: "Practicante Frontend",
  description: "Desarrollarás interfaces con React y TypeScript.",
  area: "Ingeniería",
  location: "Santiago",
  modality: "REMOTE" as const,
  duration: "3 meses",
  skills: ["React", "TypeScript"],
  requirements: ["Estudiante de último año"],
  isActive: true,
  companyId: "comp-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  embedding: [],
  company: { companyName: "TechCorp", logo: null },
};

describe("InternshipCard", () => {
  it("renderiza el título de la práctica", () => {
    render(<InternshipCard internship={baseInternship} />);
    expect(screen.getByText("Practicante Frontend")).toBeInTheDocument();
  });

  it("renderiza el nombre de la empresa", () => {
    render(<InternshipCard internship={baseInternship} />);
    expect(screen.getByText("TechCorp")).toBeInTheDocument();
  });

  it("renderiza la ubicación", () => {
    render(<InternshipCard internship={baseInternship} />);
    expect(screen.getByText("Santiago")).toBeInTheDocument();
  });

  it("renderiza la duración", () => {
    render(<InternshipCard internship={baseInternship} />);
    expect(screen.getByText("3 meses")).toBeInTheDocument();
  });

  it("muestra el matchScore cuando es mayor a 0", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: 85 }} />,
    );
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("muestra el score redondeado al entero más cercano", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: 72.7 }} />,
    );
    expect(screen.getByText("73%")).toBeInTheDocument();
  });

  it("no muestra el matchScore cuando es undefined", () => {
    render(<InternshipCard internship={baseInternship} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("no muestra el matchScore cuando es null", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: null }} />,
    );
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("no muestra el matchScore cuando es 0", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: 0 }} />,
    );
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("aplica color verde para score >= 70", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: 70 }} />,
    );
    expect(screen.getByText("70%").closest("span")).toHaveClass(
      "bg-green-50",
      "text-green-700",
    );
  });

  it("aplica color amarillo para score entre 40 y 69", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: 55 }} />,
    );
    expect(screen.getByText("55%").closest("span")).toHaveClass(
      "bg-amber-50",
      "text-amber-700",
    );
  });

  it("aplica color rojo para score menor a 40", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: 25 }} />,
    );
    expect(screen.getByText("25%").closest("span")).toHaveClass(
      "bg-red-50",
      "text-red-600",
    );
  });

  it("renderiza las skills de la práctica", () => {
    render(<InternshipCard internship={baseInternship} />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("muestra la etiqueta de modalidad correcta para REMOTE", () => {
    render(<InternshipCard internship={baseInternship} />);
    expect(screen.getByText("Remoto")).toBeInTheDocument();
  });

  it("muestra la etiqueta de modalidad correcta para ONSITE", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, modality: "ONSITE" }} />,
    );
    expect(screen.getByText("Presencial")).toBeInTheDocument();
  });

  it("muestra la etiqueta de modalidad correcta para HYBRID", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, modality: "HYBRID" }} />,
    );
    expect(screen.getByText("Híbrido")).toBeInTheDocument();
  });
});

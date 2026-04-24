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
    // El número y el % están en spans separados en el nuevo diseño
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
  });

  it("muestra el score redondeado al entero más cercano", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: 72.7 }} />,
    );
    expect(screen.getByText("73")).toBeInTheDocument();
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

  it("aplica color verde para score >= 90", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: 92 }} />,
    );
    expect(screen.getByText("92").className).toContain("text-[#1A8F3C]");
  });

  it("aplica color warm (naranja) para score entre 80 y 89", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: 85 }} />,
    );
    expect(screen.getByText("85").className).toContain("text-[#FF6A3D]");
  });

  it("aplica color neutral para score menor a 80", () => {
    render(
      <InternshipCard internship={{ ...baseInternship, matchScore: 55 }} />,
    );
    expect(screen.getByText("55").className).toContain("text-[#6D6A63]");
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

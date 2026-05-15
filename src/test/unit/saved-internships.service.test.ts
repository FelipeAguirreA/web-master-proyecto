import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("@/server/lib/embeddings", () => ({
  calculateHybridMatchScore: vi.fn().mockReturnValue(0),
}));

import {
  toggleSavedInternship,
  getSavedInternships,
  getSavedInternshipIds,
} from "@/server/services/saved-internships.service";
import { calculateHybridMatchScore } from "@/server/lib/embeddings";

beforeEach(() => {
  Object.values(prismaMock).forEach((model) =>
    Object.values(model).forEach((fn) =>
      (fn as ReturnType<typeof vi.fn>).mockReset(),
    ),
  );
  vi.mocked(calculateHybridMatchScore).mockReset();
  vi.mocked(calculateHybridMatchScore).mockReturnValue(0);
});

describe("toggleSavedInternship", () => {
  it("guarda la práctica si NO existía previamente", async () => {
    prismaMock.savedInternship.findUnique.mockResolvedValue(null);
    prismaMock.savedInternship.create.mockResolvedValue({
      id: "sav-1",
      studentId: "u-1",
      internshipId: "int-1",
    });

    const result = await toggleSavedInternship("u-1", "int-1");

    expect(result).toEqual({ saved: true });
    expect(prismaMock.savedInternship.create).toHaveBeenCalledWith({
      data: { studentId: "u-1", internshipId: "int-1" },
    });
    expect(prismaMock.savedInternship.delete).not.toHaveBeenCalled();
  });

  it("desguarda si ya existía", async () => {
    prismaMock.savedInternship.findUnique.mockResolvedValue({ id: "sav-1" });
    prismaMock.savedInternship.delete.mockResolvedValue({ id: "sav-1" });

    const result = await toggleSavedInternship("u-1", "int-1");

    expect(result).toEqual({ saved: false });
    expect(prismaMock.savedInternship.delete).toHaveBeenCalledWith({
      where: { id: "sav-1" },
    });
    expect(prismaMock.savedInternship.create).not.toHaveBeenCalled();
  });
});

describe("getSavedInternships", () => {
  beforeEach(() => {
    prismaMock.studentProfile.findUnique.mockResolvedValue({
      embedding: [],
      skills: [],
    });
  });

  it("filtra prácticas inactivas o de empresas no aprobadas", async () => {
    prismaMock.savedInternship.findMany.mockResolvedValue([]);

    await getSavedInternships("u-1");

    expect(prismaMock.savedInternship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId: "u-1",
          internship: {
            isActive: true,
            company: { companyStatus: "APPROVED" },
          },
        },
      }),
    );
  });

  it("retorna las prácticas con savedAt extraído", async () => {
    const createdAt = new Date("2026-05-15");
    prismaMock.savedInternship.findMany.mockResolvedValue([
      {
        id: "sav-1",
        createdAt,
        internship: {
          id: "int-1",
          title: "Frontend",
          embedding: [],
          skills: [],
          company: { companyName: "Co", logo: null },
        },
      },
    ]);

    const result = await getSavedInternships("u-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("int-1");
    expect(result[0].savedAt).toBe(createdAt);
  });

  it("ordena por más reciente primero", async () => {
    prismaMock.savedInternship.findMany.mockResolvedValue([]);

    await getSavedInternships("u-1");

    expect(prismaMock.savedInternship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("calcula matchScore híbrido con el embedding y skills del estudiante", async () => {
    prismaMock.studentProfile.findUnique.mockResolvedValue({
      embedding: [1, 0, 0],
      skills: ["React"],
    });
    prismaMock.savedInternship.findMany.mockResolvedValue([
      {
        id: "sav-1",
        createdAt: new Date(),
        internship: {
          id: "int-1",
          title: "Frontend",
          embedding: [1, 0, 0],
          skills: ["React", "TypeScript"],
          company: { companyName: "Co", logo: null },
        },
      },
    ]);
    vi.mocked(calculateHybridMatchScore).mockReturnValue(85);

    const result = await getSavedInternships("u-1");

    expect(result[0].matchScore).toBe(85);
    expect(calculateHybridMatchScore).toHaveBeenCalledWith(
      [1, 0, 0],
      [1, 0, 0],
      ["React"],
      ["React", "TypeScript"],
    );
  });

  it("excluye el campo embedding del payload retornado", async () => {
    prismaMock.savedInternship.findMany.mockResolvedValue([
      {
        id: "sav-1",
        createdAt: new Date(),
        internship: {
          id: "int-1",
          title: "Frontend",
          embedding: [0.1, 0.2, 0.3],
          skills: [],
          company: { companyName: "Co", logo: null },
        },
      },
    ]);

    const result = await getSavedInternships("u-1");

    expect(result[0]).not.toHaveProperty("embedding");
  });
});

describe("getSavedInternshipIds", () => {
  it("retorna Set con los internshipIds guardados", async () => {
    prismaMock.savedInternship.findMany.mockResolvedValue([
      { internshipId: "int-1" },
      { internshipId: "int-2" },
    ]);

    const result = await getSavedInternshipIds("u-1");

    expect(result).toBeInstanceOf(Set);
    expect(result.has("int-1")).toBe(true);
    expect(result.has("int-2")).toBe(true);
    expect(result.has("int-3")).toBe(false);
  });

  it("retorna Set vacío si no hay nada guardado", async () => {
    prismaMock.savedInternship.findMany.mockResolvedValue([]);
    const result = await getSavedInternshipIds("u-1");
    expect(result.size).toBe(0);
  });
});

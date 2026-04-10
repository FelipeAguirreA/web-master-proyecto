import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import {
  applyToInternship,
  getApplicantsByInternship,
  updateApplicationStatus,
} from "@/server/services/applications.service";

beforeEach(() => {
  Object.values(prismaMock).forEach((model) =>
    Object.values(model).forEach((fn) =>
      (fn as ReturnType<typeof vi.fn>).mockReset()
    )
  );
});

const mockInternship = {
  id: "int-1",
  companyId: "cp-1",
  title: "Practicante Frontend",
  isActive: true,
};

const mockApplication = {
  id: "app-1",
  studentId: "user-1",
  internshipId: "int-1",
  status: "PENDING",
  matchScore: null,
  coverLetter: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("applyToInternship", () => {
  it("lanza error si la práctica no existe", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(null);

    await expect(applyToInternship("user-1", "int-1")).rejects.toThrow(
      "Internship not found"
    );
  });

  it("lanza error si la práctica está inactiva", async () => {
    prismaMock.internship.findUnique.mockResolvedValue({
      ...mockInternship,
      isActive: false,
    });

    await expect(applyToInternship("user-1", "int-1")).rejects.toThrow(
      "Internship is not active"
    );
  });

  it("lanza error si el estudiante ya está postulado", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(mockInternship);
    prismaMock.application.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint"), { code: "P2002" })
    );

    await expect(applyToInternship("user-1", "int-1")).rejects.toThrow(
      "Already applied"
    );
  });

  it("crea la postulación correctamente cuando todo es válido", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(mockInternship);
    prismaMock.application.create.mockResolvedValue(mockApplication);

    const result = await applyToInternship("user-1", "int-1", "Mi carta");

    expect(result).toEqual(mockApplication);
    expect(prismaMock.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: "user-1",
          internshipId: "int-1",
          coverLetter: "Mi carta",
        }),
      })
    );
  });
});

describe("getApplicantsByInternship", () => {
  it("lanza error si el usuario no es dueño de la práctica", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({ id: "cp-1", userId: "user-2" });
    prismaMock.internship.findFirst.mockResolvedValue(null);

    await expect(
      getApplicantsByInternship("int-1", "user-2")
    ).rejects.toThrow("Not found or not authorized");
  });

  it("retorna postulantes ordenados por matchScore descendente", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({ id: "cp-1", userId: "user-2" });
    prismaMock.internship.findFirst.mockResolvedValue(mockInternship);

    const applicants = [
      { ...mockApplication, matchScore: 90 },
      { ...mockApplication, id: "app-2", matchScore: 70 },
    ];
    prismaMock.application.findMany.mockResolvedValue(applicants);

    const result = await getApplicantsByInternship("int-1", "user-2");

    expect(result).toHaveLength(2);
    expect(prismaMock.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.objectContaining({ matchScore: "desc" }),
      })
    );
  });
});

describe("updateApplicationStatus", () => {
  it("lanza error si la postulación no existe", async () => {
    prismaMock.application.findUnique.mockResolvedValue(null);

    await expect(
      updateApplicationStatus("nonexistent", "REVIEWED")
    ).rejects.toThrow("Application not found");
  });

  it("actualiza el estado correctamente", async () => {
    prismaMock.application.findUnique.mockResolvedValue(mockApplication);
    prismaMock.application.update.mockResolvedValue({
      ...mockApplication,
      status: "REVIEWED",
    });

    const result = await updateApplicationStatus("app-1", "REVIEWED");

    expect(result.status).toBe("REVIEWED");
    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app-1" },
        data: { status: "REVIEWED" },
      })
    );
  });
});

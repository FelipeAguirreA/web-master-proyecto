import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import {
  listInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship,
} from "@/server/services/internships.service";

beforeEach(() => {
  Object.values(prismaMock).forEach((model) =>
    Object.values(model).forEach((fn) =>
      (fn as ReturnType<typeof vi.fn>).mockReset(),
    ),
  );
});

const mockInternship = {
  id: "int-1",
  companyId: "cp-1",
  title: "Practicante Frontend",
  description: "Desarrollo de interfaces",
  area: "Ingeniería",
  location: "Santiago",
  modality: "REMOTE",
  duration: "3 meses",
  requirements: ["Estudiante de último año"],
  skills: ["React", "TypeScript"],
  embedding: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  company: {
    companyName: "TechCorp",
    logo: null,
    user: { image: null },
  },
};

describe("listInternships", () => {
  it("retorna prácticas paginadas con total y totalPages", async () => {
    prismaMock.internship.findMany.mockResolvedValue([mockInternship]);
    prismaMock.internship.count.mockResolvedValue(1);

    const result = await listInternships({ page: 1, limit: 12 });

    expect(result.internships).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("filtra por area cuando se provee", async () => {
    prismaMock.internship.findMany.mockResolvedValue([mockInternship]);
    prismaMock.internship.count.mockResolvedValue(1);

    await listInternships({ area: "Ingeniería", page: 1, limit: 12 });

    expect(prismaMock.internship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ area: "Ingeniería" }),
      }),
    );
  });

  it("filtra por search en título y descripción", async () => {
    prismaMock.internship.findMany.mockResolvedValue([mockInternship]);
    prismaMock.internship.count.mockResolvedValue(1);

    await listInternships({ search: "react", page: 1, limit: 12 });

    expect(prismaMock.internship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ title: expect.any(Object) }),
          ]),
        }),
      }),
    );
  });

  it("solo retorna prácticas activas (isActive: true)", async () => {
    prismaMock.internship.findMany.mockResolvedValue([]);
    prismaMock.internship.count.mockResolvedValue(0);

    await listInternships({ page: 1, limit: 12 });

    expect(prismaMock.internship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
  });
});

describe("getInternshipById", () => {
  it("retorna la práctica con datos de la empresa cuando existe", async () => {
    const withCompany = {
      ...mockInternship,
      company: { companyName: "TechCorp" },
    };
    prismaMock.internship.findFirst.mockResolvedValue(withCompany);

    const result = await getInternshipById("int-1");

    expect(result).toEqual(withCompany);
  });

  it("retorna null cuando no existe", async () => {
    prismaMock.internship.findFirst.mockResolvedValue(null);

    const result = await getInternshipById("nonexistent");

    expect(result).toBeNull();
  });

  // #E1 — filtros para no exponer prácticas inactivas o de empresas no APPROVED
  it("filtra por isActive: true y company.companyStatus: APPROVED (#E1)", async () => {
    prismaMock.internship.findFirst.mockResolvedValue(null);

    await getInternshipById("int-1");

    expect(prismaMock.internship.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "int-1",
          isActive: true,
          company: { is: { companyStatus: "APPROVED" } },
        },
      }),
    );
  });

  it("retorna null si la práctica está soft-deleted (#E1)", async () => {
    // Con el filtro nuevo, una práctica con isActive=false queda fuera del findFirst
    prismaMock.internship.findFirst.mockResolvedValue(null);

    const result = await getInternshipById("int-soft-deleted");

    expect(result).toBeNull();
  });

  it("retorna null si la empresa dueña no está APPROVED (#E1)", async () => {
    // Mismo caso: empresa PENDING/REJECTED → findFirst devuelve null
    prismaMock.internship.findFirst.mockResolvedValue(null);

    const result = await getInternshipById("int-pending-company");

    expect(result).toBeNull();
  });
});

describe("createInternship", () => {
  const data = {
    title: "Practicante Frontend",
    description: "Desarrollo de interfaces modernas",
    area: "Ingeniería",
    location: "Santiago",
    modality: "REMOTE" as const,
    duration: "3 meses",
    requirements: ["Estudiante de último año"],
    skills: ["React"],
  };

  it("lanza error si el usuario no tiene CompanyProfile", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    await expect(createInternship("user-1", data)).rejects.toThrow(
      "Company profile required",
    );
  });

  it("crea y retorna la práctica con companyId correcto", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
      companyStatus: "APPROVED",
    });
    prismaMock.internship.create.mockResolvedValue({
      ...mockInternship,
      companyId: "cp-1",
    });

    const result = await createInternship("user-1", data);

    expect(result.companyId).toBe("cp-1");
    expect(prismaMock.internship.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: "cp-1" }),
      }),
    );
  });

  // #E4 — defensa en profundidad: no permitir crear con company PENDING/REJECTED
  it("rechaza si companyStatus es PENDING (#E4)", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
      companyStatus: "PENDING",
    });

    await expect(createInternship("user-1", data)).rejects.toThrow(
      "Company not approved",
    );
    expect(prismaMock.internship.create).not.toHaveBeenCalled();
  });

  it("rechaza si companyStatus es REJECTED (#E4)", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
      companyStatus: "REJECTED",
    });

    await expect(createInternship("user-1", data)).rejects.toThrow(
      "Company not approved",
    );
    expect(prismaMock.internship.create).not.toHaveBeenCalled();
  });
});

describe("updateInternship", () => {
  it("lanza error si el usuario no tiene CompanyProfile", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    await expect(
      updateInternship("int-1", "user-1", { title: "Nuevo título" }),
    ).rejects.toThrow("Not found or not authorized");
  });

  it("lanza error si la práctica no pertenece a la empresa", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue(null);

    await expect(
      updateInternship("int-1", "user-1", { title: "X" }),
    ).rejects.toThrow("Not found or not authorized");
  });

  it("actualiza la práctica cuando el usuario es dueño", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue(mockInternship);
    prismaMock.internship.update.mockResolvedValue({
      ...mockInternship,
      title: "Nuevo título",
    });

    const result = await updateInternship("int-1", "user-1", {
      title: "Nuevo título",
    });

    expect(result.title).toBe("Nuevo título");
    expect(prismaMock.internship.update).toHaveBeenCalledWith({
      where: { id: "int-1" },
      data: { title: "Nuevo título" },
    });
  });

  it("permite actualizar isActive (re-activar/desactivar)", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue(mockInternship);
    prismaMock.internship.update.mockResolvedValue({
      ...mockInternship,
      isActive: false,
    });

    await updateInternship("int-1", "user-1", { isActive: false });

    expect(prismaMock.internship.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });
});

describe("deleteInternship", () => {
  it("lanza error si el usuario no es dueño de la práctica", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue(null);

    await expect(deleteInternship("int-1", "user-1")).rejects.toThrow(
      "Not found or not authorized",
    );
  });

  it("hace soft delete (isActive: false) en lugar de borrar", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-1",
    });
    prismaMock.internship.findFirst.mockResolvedValue(mockInternship);
    prismaMock.internship.update.mockResolvedValue({
      ...mockInternship,
      isActive: false,
    });

    const result = await deleteInternship("int-1", "user-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.internship.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      }),
    );
  });
});

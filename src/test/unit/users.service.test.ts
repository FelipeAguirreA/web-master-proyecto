import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import {
  getUserWithProfile,
  updateStudentProfile,
  updateCompanyProfile,
} from "@/server/services/users.service";

beforeEach(() => {
  Object.values(prismaMock).forEach((model) =>
    Object.values(model).forEach((fn) => (fn as ReturnType<typeof vi.fn>).mockReset())
  );
});

describe("getUserWithProfile", () => {
  it("retorna el usuario con sus perfiles cuando existe", async () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role: "STUDENT",
      studentProfile: { id: "sp-1", userId: "user-1", skills: [] },
      companyProfile: null,
    };

    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const result = await getUserWithProfile("user-1");

    expect(result).toEqual(mockUser);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      include: { studentProfile: true, companyProfile: true },
    });
  });

  it("retorna null cuando el usuario no existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await getUserWithProfile("nonexistent");

    expect(result).toBeNull();
  });

  it("incluye studentProfile y companyProfile en la respuesta", async () => {
    const mockUser = {
      id: "user-2",
      email: "company@example.com",
      name: "Company User",
      role: "COMPANY",
      studentProfile: null,
      companyProfile: { id: "cp-1", userId: "user-2", companyName: "Acme" },
    };

    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const result = await getUserWithProfile("user-2");

    expect(result?.studentProfile).toBeNull();
    expect(result?.companyProfile).toEqual(mockUser.companyProfile);
  });
});

describe("updateStudentProfile", () => {
  it("actualiza y retorna el perfil del estudiante", async () => {
    const updatedProfile = {
      id: "sp-1",
      userId: "user-1",
      university: "UBA",
      career: "Sistemas",
      semester: 5,
      skills: ["TypeScript", "React"],
      bio: "Dev apasionado",
      cvUrl: null,
      cvText: null,
      embedding: [],
    };

    prismaMock.studentProfile.update.mockResolvedValue(updatedProfile);

    const result = await updateStudentProfile("user-1", {
      university: "UBA",
      career: "Sistemas",
      semester: 5,
      skills: ["TypeScript", "React"],
      bio: "Dev apasionado",
    });

    expect(result).toEqual(updatedProfile);
    expect(prismaMock.studentProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: expect.objectContaining({ university: "UBA" }),
    });
  });

  it("solo actualiza el perfil del userId provisto", async () => {
    prismaMock.studentProfile.update.mockResolvedValue({ id: "sp-2", userId: "user-2" });

    await updateStudentProfile("user-2", { bio: "Mi bio" });

    expect(prismaMock.studentProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-2" } })
    );
  });
});

describe("updateCompanyProfile", () => {
  it("actualiza y retorna el perfil de la empresa", async () => {
    const updatedProfile = {
      id: "cp-1",
      userId: "user-3",
      companyName: "TechCorp",
      industry: "Software",
      website: "https://techcorp.com",
      description: "Una empresa tech",
    };

    prismaMock.companyProfile.update.mockResolvedValue(updatedProfile);

    const result = await updateCompanyProfile("user-3", {
      companyName: "TechCorp",
      industry: "Software",
      website: "https://techcorp.com",
      description: "Una empresa tech",
    });

    expect(result).toEqual(updatedProfile);
    expect(prismaMock.companyProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-3" },
      data: expect.objectContaining({ companyName: "TechCorp" }),
    });
  });

  it("solo actualiza el perfil del userId provisto", async () => {
    prismaMock.companyProfile.update.mockResolvedValue({ id: "cp-2", userId: "user-4" });

    await updateCompanyProfile("user-4", { companyName: "Otra Empresa" });

    expect(prismaMock.companyProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-4" } })
    );
  });
});

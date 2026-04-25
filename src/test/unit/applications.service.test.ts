import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("@/server/lib/mail", () => ({
  sendNewApplicationEmail: vi.fn().mockResolvedValue(undefined),
  sendStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
}));

import {
  applyToInternship,
  getMyApplications,
  getApplicantsByInternship,
  updateApplicationStatus,
  notifyRejectedApplication,
  notifyAcceptedApplication,
} from "@/server/services/applications.service";
import { sendStatusUpdateEmail } from "@/server/lib/mail";

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
  isActive: true,
  embedding: [],
  company: {
    companyName: "TechCorp",
    user: { email: "empresa@example.com", name: "TechCorp" },
  },
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
  internship: { title: "Practicante Frontend" },
  student: { email: "estudiante@example.com", name: "Juan Pérez" },
};

describe("applyToInternship", () => {
  it("lanza error si la práctica no existe", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(null);

    await expect(applyToInternship("user-1", "int-1")).rejects.toThrow(
      "Internship not found",
    );
  });

  it("lanza error si la práctica está inactiva", async () => {
    prismaMock.internship.findUnique.mockResolvedValue({
      ...mockInternship,
      isActive: false,
    });

    await expect(applyToInternship("user-1", "int-1")).rejects.toThrow(
      "Internship is not active",
    );
  });

  it("lanza error si el estudiante ya está postulado", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(mockInternship);
    prismaMock.application.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint"), { code: "P2002" }),
    );

    await expect(applyToInternship("user-1", "int-1")).rejects.toThrow(
      "Already applied",
    );
  });

  it("crea la postulación correctamente cuando todo es válido", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(mockInternship);
    prismaMock.studentProfile.findUnique.mockResolvedValue({ embedding: [] });
    prismaMock.user.findUnique.mockResolvedValue({ name: "Juan Pérez" });
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
      }),
    );
  });
});

describe("getApplicantsByInternship", () => {
  it("lanza error si el usuario no es dueño de la práctica", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-2",
    });
    prismaMock.internship.findFirst.mockResolvedValue(null);

    await expect(getApplicantsByInternship("int-1", "user-2")).rejects.toThrow(
      "Not found or not authorized",
    );
  });

  it("retorna postulantes ordenados por matchScore descendente", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      id: "cp-1",
      userId: "user-2",
    });
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
      }),
    );
  });
});

describe("getMyApplications", () => {
  it("retorna las postulaciones del estudiante ordenadas por createdAt desc", async () => {
    const apps = [
      { ...mockApplication, id: "app-1" },
      { ...mockApplication, id: "app-2" },
    ];
    prismaMock.application.findMany.mockResolvedValue(apps);

    const result = await getMyApplications("user-1");

    expect(result).toHaveLength(2);
    expect(prismaMock.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: "user-1" },
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("retorna lista vacía cuando el estudiante no tiene postulaciones", async () => {
    prismaMock.application.findMany.mockResolvedValue([]);

    const result = await getMyApplications("user-without-apps");

    expect(result).toEqual([]);
  });
});

describe("updateApplicationStatus", () => {
  it("lanza error si la postulación no existe", async () => {
    prismaMock.application.findUnique.mockResolvedValue(null);

    await expect(
      updateApplicationStatus("nonexistent", "REVIEWED"),
    ).rejects.toThrow("Application not found");
  });

  it("actualiza el estado a REVIEWED y crea notificación", async () => {
    prismaMock.application.findUnique.mockResolvedValue(mockApplication);
    prismaMock.application.update.mockResolvedValue({
      ...mockApplication,
      status: "REVIEWED",
    });

    const result = await updateApplicationStatus("app-1", "REVIEWED");

    expect(result.status).toBe("REVIEWED");
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          type: "APPLICATION_REVIEWED",
        }),
      }),
    );
  });

  it("setea pipelineStatus INTERVIEW al pasar a ACCEPTED", async () => {
    prismaMock.application.findUnique.mockResolvedValue(mockApplication);
    prismaMock.application.update.mockResolvedValue({
      ...mockApplication,
      status: "ACCEPTED",
    });

    await updateApplicationStatus("app-1", "ACCEPTED");

    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACCEPTED",
          pipelineStatus: "INTERVIEW",
        }),
      }),
    );
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "APPLICATION_ACCEPTED" }),
      }),
    );
  });

  it("setea pipelineStatus REJECTED al pasar a REJECTED", async () => {
    prismaMock.application.findUnique.mockResolvedValue(mockApplication);
    prismaMock.application.update.mockResolvedValue({
      ...mockApplication,
      status: "REJECTED",
    });

    await updateApplicationStatus("app-1", "REJECTED");

    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REJECTED",
          pipelineStatus: "REJECTED",
        }),
      }),
    );
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "APPLICATION_REJECTED" }),
      }),
    );
  });

  it("no crea notificación si el status no está mapeado (PENDING)", async () => {
    prismaMock.application.findUnique.mockResolvedValue(mockApplication);
    prismaMock.application.update.mockResolvedValue({
      ...mockApplication,
      status: "PENDING",
    });

    await updateApplicationStatus("app-1", "PENDING");

    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });
});

describe("notifyRejectedApplication", () => {
  it("lanza error si la postulación no existe", async () => {
    prismaMock.application.findUnique.mockResolvedValue(null);

    await expect(notifyRejectedApplication("missing")).rejects.toThrow(
      "Application not found",
    );
  });

  it("lanza error si la postulación no está rechazada", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...mockApplication,
      status: "PENDING",
    });

    await expect(notifyRejectedApplication("app-1")).rejects.toThrow(
      "La postulación no está rechazada",
    );
  });

  it("envía email de rechazo cuando la postulación está REJECTED", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...mockApplication,
      status: "REJECTED",
    });

    await notifyRejectedApplication("app-1");

    expect(sendStatusUpdateEmail).toHaveBeenCalledWith(
      "estudiante@example.com",
      "Juan Pérez",
      "Practicante Frontend",
      "REJECTED",
    );
  });
});

describe("notifyAcceptedApplication", () => {
  it("lanza error si la postulación no existe", async () => {
    prismaMock.application.findUnique.mockResolvedValue(null);

    await expect(notifyAcceptedApplication("missing")).rejects.toThrow(
      "Application not found",
    );
  });

  it("lanza error si la postulación no está aceptada", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...mockApplication,
      status: "PENDING",
    });

    await expect(notifyAcceptedApplication("app-1")).rejects.toThrow(
      "La postulación no está aceptada",
    );
  });

  it("envía email de aceptación cuando la postulación está ACCEPTED", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...mockApplication,
      status: "ACCEPTED",
    });

    await notifyAcceptedApplication("app-1");

    expect(sendStatusUpdateEmail).toHaveBeenCalledWith(
      "estudiante@example.com",
      "Juan Pérez",
      "Practicante Frontend",
      "ACCEPTED",
    );
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

const { mockSentryCaptureException } = vi.hoisted(() => ({
  mockSentryCaptureException: vi.fn(),
}));

vi.mock("@/server/lib/mail", () => ({
  sendNewApplicationEmail: vi.fn().mockResolvedValue(undefined),
  sendStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

import {
  applyToInternship,
  getMyApplications,
  getApplicantsByInternship,
  updateApplicationStatus,
  notifyRejectedApplication,
  notifyAcceptedApplication,
} from "@/server/services/applications.service";
import {
  sendNewApplicationEmail,
  sendStatusUpdateEmail,
} from "@/server/lib/mail";

beforeEach(() => {
  Object.values(prismaMock).forEach((model) =>
    Object.values(model).forEach((fn) =>
      (fn as ReturnType<typeof vi.fn>).mockReset(),
    ),
  );
  mockSentryCaptureException.mockReset();
  (sendNewApplicationEmail as ReturnType<typeof vi.fn>).mockReset();
  (sendNewApplicationEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
    undefined,
  );
  (sendStatusUpdateEmail as ReturnType<typeof vi.fn>).mockReset();
  (sendStatusUpdateEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
    undefined,
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

// Helper: simula ownership OK — companyProfile existe + application del owner.
function mockOwnershipOK(application = mockApplication) {
  prismaMock.companyProfile.findUnique.mockResolvedValue({ id: "cp-1" });
  prismaMock.application.findFirst.mockResolvedValue(application);
}

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

describe("applyToInternship — mail failure → Sentry (#D4)", () => {
  it("si sendNewApplicationEmail falla, va a Sentry con tag mail=new_application", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(mockInternship);
    prismaMock.studentProfile.findUnique.mockResolvedValue({ embedding: [] });
    prismaMock.user.findUnique.mockResolvedValue({ name: "Juan Pérez" });
    prismaMock.application.create.mockResolvedValue(mockApplication);
    const mailErr = new Error("brevo down");
    (sendNewApplicationEmail as ReturnType<typeof vi.fn>).mockRejectedValue(
      mailErr,
    );

    await applyToInternship("user-1", "int-1");
    await new Promise((r) => setImmediate(r));

    expect(mockSentryCaptureException).toHaveBeenCalledWith(mailErr, {
      tags: { mail: "new_application" },
      extra: { internshipId: "int-1", studentUserId: "user-1" },
    });
  });

  it("si el mail OK, Sentry NO se llama", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(mockInternship);
    prismaMock.studentProfile.findUnique.mockResolvedValue({ embedding: [] });
    prismaMock.user.findUnique.mockResolvedValue({ name: "Juan Pérez" });
    prismaMock.application.create.mockResolvedValue(mockApplication);

    await applyToInternship("user-1", "int-1");
    await new Promise((r) => setImmediate(r));

    expect(mockSentryCaptureException).not.toHaveBeenCalled();
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

describe("updateApplicationStatus — ownership (#D1)", () => {
  it("lanza 'Not found or not authorized' si la company del session user no existe", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    await expect(
      updateApplicationStatus("app-1", "REVIEWED", "fake-user"),
    ).rejects.toThrow("Not found or not authorized");
    expect(prismaMock.application.update).not.toHaveBeenCalled();
  });

  it("lanza 'Not found or not authorized' si la application no pertenece al company owner", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({ id: "cp-1" });
    // findFirst retorna null cuando el WHERE { id, internship: { companyId } } no matchea
    prismaMock.application.findFirst.mockResolvedValue(null);

    await expect(
      updateApplicationStatus("app-foreign", "REJECTED", "company-user"),
    ).rejects.toThrow("Not found or not authorized");
    expect(prismaMock.application.update).not.toHaveBeenCalled();
  });

  it("filtra el findFirst por id + internship.companyId del owner", async () => {
    mockOwnershipOK();
    prismaMock.application.update.mockResolvedValue({
      ...mockApplication,
      status: "REVIEWED",
    });

    await updateApplicationStatus("app-1", "REVIEWED", "company-user");

    expect(prismaMock.application.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app-1", internship: { companyId: "cp-1" } },
      }),
    );
  });
});

describe("updateApplicationStatus — happy paths", () => {
  it("actualiza el estado a REVIEWED y crea notificación", async () => {
    mockOwnershipOK();
    prismaMock.application.update.mockResolvedValue({
      ...mockApplication,
      status: "REVIEWED",
    });

    const result = await updateApplicationStatus(
      "app-1",
      "REVIEWED",
      "company-user",
    );

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
    mockOwnershipOK();
    prismaMock.application.update.mockResolvedValue({
      ...mockApplication,
      status: "ACCEPTED",
    });

    await updateApplicationStatus("app-1", "ACCEPTED", "company-user");

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
    mockOwnershipOK();
    prismaMock.application.update.mockResolvedValue({
      ...mockApplication,
      status: "REJECTED",
    });

    await updateApplicationStatus("app-1", "REJECTED", "company-user");

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
    mockOwnershipOK();
    prismaMock.application.update.mockResolvedValue({
      ...mockApplication,
      status: "PENDING",
    });

    await updateApplicationStatus("app-1", "PENDING", "company-user");

    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });
});

describe("notifyRejectedApplication — ownership (#D2)", () => {
  it("lanza 'Not found or not authorized' si la company no existe", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    await expect(
      notifyRejectedApplication("app-1", "fake-user"),
    ).rejects.toThrow("Not found or not authorized");
    expect(sendStatusUpdateEmail).not.toHaveBeenCalled();
  });

  it("lanza 'Not found or not authorized' si la app es de otra company", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({ id: "cp-1" });
    prismaMock.application.findFirst.mockResolvedValue(null);

    await expect(
      notifyRejectedApplication("app-foreign", "company-user"),
    ).rejects.toThrow("Not found or not authorized");
    expect(sendStatusUpdateEmail).not.toHaveBeenCalled();
  });

  it("lanza error si la postulación no está rechazada (con ownership OK)", async () => {
    mockOwnershipOK({
      ...mockApplication,
      status: "PENDING",
    });

    await expect(
      notifyRejectedApplication("app-1", "company-user"),
    ).rejects.toThrow("La postulación no está rechazada");
  });

  it("envía email de rechazo cuando ownership OK + status REJECTED", async () => {
    mockOwnershipOK({
      ...mockApplication,
      status: "REJECTED",
    });

    await notifyRejectedApplication("app-1", "company-user");

    expect(sendStatusUpdateEmail).toHaveBeenCalledWith(
      "estudiante@example.com",
      "Juan Pérez",
      "Practicante Frontend",
      "REJECTED",
    );
  });
});

describe("notifyAcceptedApplication — ownership (#D2)", () => {
  it("lanza 'Not found or not authorized' si la company no existe", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    await expect(
      notifyAcceptedApplication("app-1", "fake-user"),
    ).rejects.toThrow("Not found or not authorized");
    expect(sendStatusUpdateEmail).not.toHaveBeenCalled();
  });

  it("lanza 'Not found or not authorized' si la app es de otra company", async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({ id: "cp-1" });
    prismaMock.application.findFirst.mockResolvedValue(null);

    await expect(
      notifyAcceptedApplication("app-foreign", "company-user"),
    ).rejects.toThrow("Not found or not authorized");
    expect(sendStatusUpdateEmail).not.toHaveBeenCalled();
  });

  it("lanza error si la postulación no está aceptada (con ownership OK)", async () => {
    mockOwnershipOK({
      ...mockApplication,
      status: "PENDING",
    });

    await expect(
      notifyAcceptedApplication("app-1", "company-user"),
    ).rejects.toThrow("La postulación no está aceptada");
  });

  it("envía email de aceptación cuando ownership OK + status ACCEPTED", async () => {
    mockOwnershipOK({
      ...mockApplication,
      status: "ACCEPTED",
    });

    await notifyAcceptedApplication("app-1", "company-user");

    expect(sendStatusUpdateEmail).toHaveBeenCalledWith(
      "estudiante@example.com",
      "Juan Pérez",
      "Practicante Frontend",
      "ACCEPTED",
    );
  });
});

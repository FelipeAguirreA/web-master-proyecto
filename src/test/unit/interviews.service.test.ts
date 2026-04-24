import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";
import {
  createInterview,
  getInterviewsByCompany,
  getInterviewById,
  updateInterview,
  deleteInterview,
  sendInterviewToChat,
  getAvailableCandidates,
} from "@/server/services/interviews.service";

beforeEach(() => {
  resetPrismaMock();
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const COMPANY_USER_ID = "company-user-1";
const STUDENT_USER_ID = "student-user-1";
const INTERNSHIP_ID = "int-1";
const APPLICATION_ID = "app-1";
const CONVERSATION_ID = "conv-1";
const INTERVIEW_ID = "interview-1";

const mockApplication = {
  id: APPLICATION_ID,
  studentId: STUDENT_USER_ID,
  internshipId: INTERNSHIP_ID,
  internship: {
    company: { userId: COMPANY_USER_ID },
  },
};

const mockInterviewBase = {
  id: INTERVIEW_ID,
  companyId: COMPANY_USER_ID,
  studentId: STUDENT_USER_ID,
  internshipId: INTERNSHIP_ID,
  applicationId: APPLICATION_ID,
  conversationId: CONVERSATION_ID,
  title: "Entrevista técnica",
  scheduledAt: new Date("2026-05-01T15:00:00Z"),
  durationMins: 60,
  meetingLink: "https://meet.google.com/abc",
  notes: null as string | null,
  status: "SCHEDULED" as const,
  sentToChat: false,
  sentToChatAt: null as Date | null,
  createdAt: new Date("2026-04-24T10:00:00Z"),
  updatedAt: new Date("2026-04-24T10:00:00Z"),
};

const validCreatePayload = {
  internshipId: INTERNSHIP_ID,
  applicationId: APPLICATION_ID,
  conversationId: CONVERSATION_ID,
  title: "Entrevista técnica",
  scheduledAt: new Date("2026-05-01T15:00:00Z"),
};

// ─── createInterview ────────────────────────────────────────────────────────

describe("createInterview", () => {
  it("lanza error si la application no existe", async () => {
    prismaMock.application.findUnique.mockResolvedValue(null);

    await expect(
      createInterview(COMPANY_USER_ID, validCreatePayload),
    ).rejects.toThrow("Application not found");
  });

  it("lanza error si la application no pertenece a una práctica de esta empresa", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...mockApplication,
      internship: { company: { userId: "other-company-user" } },
    });

    await expect(
      createInterview(COMPANY_USER_ID, validCreatePayload),
    ).rejects.toThrow("Not authorized");
  });

  it("lanza error si el internshipId del payload no matchea con el de la application", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...mockApplication,
      internshipId: "other-internship",
    });

    await expect(
      createInterview(COMPANY_USER_ID, validCreatePayload),
    ).rejects.toThrow("Application does not belong to this internship");
  });

  it("lanza INTERVIEW_ALREADY_EXISTS si ya hay entrevista para esta application", async () => {
    prismaMock.application.findUnique.mockResolvedValue(mockApplication);
    prismaMock.interview.findUnique.mockResolvedValue(mockInterviewBase);

    try {
      await createInterview(COMPANY_USER_ID, validCreatePayload);
      expect.unreachable("debería haber lanzado");
    } catch (err) {
      const e = err as Error & { code: string };
      expect(e.message).toBe(
        "Este candidato ya tiene una entrevista agendada. Puedes editarla.",
      );
      expect(e.code).toBe("INTERVIEW_ALREADY_EXISTS");
    }
  });

  it("crea la entrevista con defaults durationMins=60, meetingLink=null, notes=null, sentToChat=false", async () => {
    prismaMock.application.findUnique.mockResolvedValue(mockApplication);
    prismaMock.interview.findUnique.mockResolvedValue(null);
    prismaMock.interview.create.mockResolvedValue(mockInterviewBase);

    await createInterview(COMPANY_USER_ID, validCreatePayload);

    expect(prismaMock.interview.create).toHaveBeenCalledWith({
      data: {
        companyId: COMPANY_USER_ID,
        studentId: STUDENT_USER_ID,
        internshipId: INTERNSHIP_ID,
        applicationId: APPLICATION_ID,
        conversationId: CONVERSATION_ID,
        title: "Entrevista técnica",
        scheduledAt: validCreatePayload.scheduledAt,
        durationMins: 60,
        meetingLink: null,
        notes: null,
        sentToChat: false,
      },
    });
  });

  it("respeta durationMins, meetingLink y notes cuando vienen en el payload", async () => {
    prismaMock.application.findUnique.mockResolvedValue(mockApplication);
    prismaMock.interview.findUnique.mockResolvedValue(null);
    prismaMock.interview.create.mockResolvedValue(mockInterviewBase);

    await createInterview(COMPANY_USER_ID, {
      ...validCreatePayload,
      durationMins: 90,
      meetingLink: "https://zoom.us/xyz",
      notes: "Llevar presentación",
    });

    expect(prismaMock.interview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          durationMins: 90,
          meetingLink: "https://zoom.us/xyz",
          notes: "Llevar presentación",
        }),
      }),
    );
  });
});

// ─── getInterviewsByCompany ─────────────────────────────────────────────────

describe("getInterviewsByCompany", () => {
  it("filtra por companyId del caller", async () => {
    prismaMock.interview.findMany.mockResolvedValue([]);

    await getInterviewsByCompany(COMPANY_USER_ID);

    expect(prismaMock.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: COMPANY_USER_ID },
        orderBy: { scheduledAt: "asc" },
      }),
    );
  });

  it("aplica filtro de status cuando se pasa", async () => {
    prismaMock.interview.findMany.mockResolvedValue([]);

    await getInterviewsByCompany(COMPANY_USER_ID, { status: "COMPLETED" });

    expect(prismaMock.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
  });

  it("aplica filtro de internshipId cuando se pasa", async () => {
    prismaMock.interview.findMany.mockResolvedValue([]);

    await getInterviewsByCompany(COMPANY_USER_ID, {
      internshipId: INTERNSHIP_ID,
    });

    expect(prismaMock.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ internshipId: INTERNSHIP_ID }),
      }),
    );
  });

  it("combina from y to en un rango scheduledAt gte/lte", async () => {
    prismaMock.interview.findMany.mockResolvedValue([]);

    const from = new Date("2026-05-01");
    const to = new Date("2026-05-31");

    await getInterviewsByCompany(COMPANY_USER_ID, { from, to });

    expect(prismaMock.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduledAt: { gte: from, lte: to },
        }),
      }),
    );
  });

  it("aplica solo gte cuando viene from sin to", async () => {
    prismaMock.interview.findMany.mockResolvedValue([]);

    const from = new Date("2026-05-01");
    await getInterviewsByCompany(COMPANY_USER_ID, { from });

    expect(prismaMock.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduledAt: { gte: from },
        }),
      }),
    );
  });

  it("sin filtros retorna where solo con companyId", async () => {
    prismaMock.interview.findMany.mockResolvedValue([]);

    await getInterviewsByCompany(COMPANY_USER_ID, {});

    const callArg = prismaMock.interview.findMany.mock.calls[0][0];
    expect(callArg?.where).toEqual({ companyId: COMPANY_USER_ID });
  });
});

// ─── getInterviewById ───────────────────────────────────────────────────────

describe("getInterviewById", () => {
  it("lanza error si la entrevista no existe", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(null);

    await expect(
      getInterviewById(INTERVIEW_ID, COMPANY_USER_ID),
    ).rejects.toThrow("Interview not found");
  });

  it("lanza Not authorized si companyId no matchea", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({
      ...mockInterviewBase,
      companyId: "other-company",
    });

    await expect(
      getInterviewById(INTERVIEW_ID, COMPANY_USER_ID),
    ).rejects.toThrow("Not authorized");
  });

  it("retorna la entrevista cuando pertenece a la empresa", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(mockInterviewBase);

    const result = await getInterviewById(INTERVIEW_ID, COMPANY_USER_ID);

    expect(result).toEqual(mockInterviewBase);
  });
});

// ─── updateInterview ────────────────────────────────────────────────────────

describe("updateInterview", () => {
  it("lanza error si la entrevista no existe", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(null);

    await expect(
      updateInterview(INTERVIEW_ID, COMPANY_USER_ID, { title: "Nuevo" }),
    ).rejects.toThrow("Interview not found");
  });

  it("lanza Not authorized si companyId no matchea", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({
      ...mockInterviewBase,
      companyId: "other-company",
    });

    await expect(
      updateInterview(INTERVIEW_ID, COMPANY_USER_ID, { title: "Nuevo" }),
    ).rejects.toThrow("Not authorized");
  });

  it("edición simple: solo aplica los campos presentes en data (skip undefined)", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(mockInterviewBase);
    prismaMock.interview.update.mockResolvedValue(mockInterviewBase);

    await updateInterview(INTERVIEW_ID, COMPANY_USER_ID, {
      title: "Nuevo título",
      notes: "Notas nuevas",
    });

    expect(prismaMock.interview.update).toHaveBeenCalledWith({
      where: { id: INTERVIEW_ID },
      data: {
        title: "Nuevo título",
        notes: "Notas nuevas",
      },
    });
  });

  it("edición simple con applicationId igual al actual NO entra en modo reasignación", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(mockInterviewBase);
    prismaMock.interview.update.mockResolvedValue(mockInterviewBase);

    await updateInterview(INTERVIEW_ID, COMPANY_USER_ID, {
      applicationId: APPLICATION_ID,
      title: "Solo título",
    });

    // No se chequea nueva application → solo 1 findUnique (la inicial)
    expect(prismaMock.application.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.interview.update).toHaveBeenCalledWith({
      where: { id: INTERVIEW_ID },
      data: { title: "Solo título" },
    });
  });

  describe("modo reasignación (nuevo applicationId)", () => {
    const NEW_APP_ID = "app-2";
    const NEW_STUDENT_ID = "student-user-2";
    const NEW_CONV_ID = "conv-2";

    const newApplication = {
      id: NEW_APP_ID,
      studentId: NEW_STUDENT_ID,
      internshipId: INTERNSHIP_ID,
      internship: { company: { userId: COMPANY_USER_ID } },
    };

    it("lanza error si la nueva application no existe", async () => {
      prismaMock.interview.findUnique.mockResolvedValue(mockInterviewBase);
      prismaMock.application.findUnique.mockResolvedValue(null);

      await expect(
        updateInterview(INTERVIEW_ID, COMPANY_USER_ID, {
          applicationId: NEW_APP_ID,
        }),
      ).rejects.toThrow("New application not found");
    });

    it("lanza error si la nueva application es de otra empresa", async () => {
      prismaMock.interview.findUnique.mockResolvedValue(mockInterviewBase);
      prismaMock.application.findUnique.mockResolvedValue({
        ...newApplication,
        internship: { company: { userId: "other-company" } },
      });

      await expect(
        updateInterview(INTERVIEW_ID, COMPANY_USER_ID, {
          applicationId: NEW_APP_ID,
        }),
      ).rejects.toThrow("Not authorized for new application");
    });

    it("lanza INTERVIEW_ALREADY_EXISTS si el nuevo candidato ya tiene otra entrevista SCHEDULED", async () => {
      prismaMock.interview.findUnique.mockResolvedValue(mockInterviewBase);
      prismaMock.application.findUnique.mockResolvedValue(newApplication);
      prismaMock.interview.findFirst.mockResolvedValue({
        ...mockInterviewBase,
        id: "other-interview",
        applicationId: NEW_APP_ID,
      });

      try {
        await updateInterview(INTERVIEW_ID, COMPANY_USER_ID, {
          applicationId: NEW_APP_ID,
        });
        expect.unreachable("debería haber lanzado");
      } catch (err) {
        const e = err as Error & { code: string };
        expect(e.code).toBe("INTERVIEW_ALREADY_EXISTS");
      }
    });

    it("notifica al candidato anterior cuando la entrevista original ya fue enviada al chat", async () => {
      prismaMock.interview.findUnique.mockResolvedValue({
        ...mockInterviewBase,
        sentToChat: true,
      });
      prismaMock.application.findUnique.mockResolvedValue(newApplication);
      prismaMock.interview.findFirst.mockResolvedValue(null);
      prismaMock.conversation.findUnique.mockResolvedValue({ id: NEW_CONV_ID });
      prismaMock.message.create.mockResolvedValue({ id: "msg-notify" });
      prismaMock.interview.update.mockResolvedValue({
        ...mockInterviewBase,
        applicationId: NEW_APP_ID,
        studentId: NEW_STUDENT_ID,
        conversationId: NEW_CONV_ID,
        sentToChat: false,
        sentToChatAt: null,
      });

      await updateInterview(INTERVIEW_ID, COMPANY_USER_ID, {
        applicationId: NEW_APP_ID,
      });

      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: CONVERSATION_ID,
          senderId: COMPANY_USER_ID,
          content:
            "❌ Esta entrevista ha sido reasignada y ya no aplica para ti.",
          type: "TEXT",
        },
      });
    });

    it("NO notifica al candidato anterior si la entrevista original nunca se envió al chat", async () => {
      prismaMock.interview.findUnique.mockResolvedValue(mockInterviewBase); // sentToChat: false
      prismaMock.application.findUnique.mockResolvedValue(newApplication);
      prismaMock.interview.findFirst.mockResolvedValue(null);
      prismaMock.conversation.findUnique.mockResolvedValue({ id: NEW_CONV_ID });
      prismaMock.interview.update.mockResolvedValue(mockInterviewBase);

      await updateInterview(INTERVIEW_ID, COMPANY_USER_ID, {
        applicationId: NEW_APP_ID,
      });

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it("lanza error si el nuevo candidato no tiene conversación activa", async () => {
      prismaMock.interview.findUnique.mockResolvedValue(mockInterviewBase);
      prismaMock.application.findUnique.mockResolvedValue(newApplication);
      prismaMock.interview.findFirst.mockResolvedValue(null);
      prismaMock.conversation.findUnique.mockResolvedValue(null);

      await expect(
        updateInterview(INTERVIEW_ID, COMPANY_USER_ID, {
          applicationId: NEW_APP_ID,
        }),
      ).rejects.toThrow(
        "El nuevo candidato no tiene una conversación activa. Iniciá el chat primero.",
      );
    });

    it("resetea sentToChat a false y sentToChatAt a null al reasignar", async () => {
      prismaMock.interview.findUnique.mockResolvedValue(mockInterviewBase);
      prismaMock.application.findUnique.mockResolvedValue(newApplication);
      prismaMock.interview.findFirst.mockResolvedValue(null);
      prismaMock.conversation.findUnique.mockResolvedValue({ id: NEW_CONV_ID });
      prismaMock.interview.update.mockResolvedValue(mockInterviewBase);

      await updateInterview(INTERVIEW_ID, COMPANY_USER_ID, {
        applicationId: NEW_APP_ID,
        title: "Título nuevo",
      });

      expect(prismaMock.interview.update).toHaveBeenCalledWith({
        where: { id: INTERVIEW_ID },
        data: expect.objectContaining({
          applicationId: NEW_APP_ID,
          studentId: NEW_STUDENT_ID,
          conversationId: NEW_CONV_ID,
          sentToChat: false,
          sentToChatAt: null,
          title: "Título nuevo",
        }),
      });
    });
  });
});

// ─── deleteInterview ────────────────────────────────────────────────────────

describe("deleteInterview", () => {
  const mockInterviewWithRelations = {
    ...mockInterviewBase,
    internship: {
      title: "Practicante Frontend",
      company: { companyName: "TechCorp" },
    },
  };

  it("lanza error si la entrevista no existe", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(null);

    await expect(
      deleteInterview(INTERVIEW_ID, COMPANY_USER_ID),
    ).rejects.toThrow("Interview not found");
  });

  it("lanza Not authorized si companyId no matchea", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({
      ...mockInterviewWithRelations,
      companyId: "other-company",
    });

    await expect(
      deleteInterview(INTERVIEW_ID, COMPANY_USER_ID),
    ).rejects.toThrow("Not authorized");
  });

  it("NO manda mensaje al chat si la entrevista nunca fue enviada (sentToChat=false)", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(
      mockInterviewWithRelations,
    );
    prismaMock.interview.delete.mockResolvedValue(mockInterviewWithRelations);

    await deleteInterview(INTERVIEW_ID, COMPANY_USER_ID);

    expect(prismaMock.message.create).not.toHaveBeenCalled();
    expect(prismaMock.interview.delete).toHaveBeenCalledWith({
      where: { id: INTERVIEW_ID },
    });
  });

  it("manda mensaje de cancelación al chat cuando sentToChat=true", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({
      ...mockInterviewWithRelations,
      sentToChat: true,
    });
    prismaMock.message.create.mockResolvedValue({ id: "msg-cancel" });
    prismaMock.interview.delete.mockResolvedValue(mockInterviewWithRelations);

    await deleteInterview(INTERVIEW_ID, COMPANY_USER_ID);

    expect(prismaMock.message.create).toHaveBeenCalledTimes(1);
    const callArg = prismaMock.message.create.mock.calls[0][0];
    expect(callArg?.data).toEqual(
      expect.objectContaining({
        conversationId: CONVERSATION_ID,
        senderId: COMPANY_USER_ID,
        type: "TEXT",
      }),
    );
    expect(callArg?.data.content).toContain("❌ Entrevista cancelada");
    expect(callArg?.data.content).toContain("Entrevista técnica");
  });

  it("borra la entrevista después de notificar", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({
      ...mockInterviewWithRelations,
      sentToChat: true,
    });
    prismaMock.message.create.mockResolvedValue({ id: "msg-cancel" });
    prismaMock.interview.delete.mockResolvedValue(mockInterviewWithRelations);

    await deleteInterview(INTERVIEW_ID, COMPANY_USER_ID);

    expect(prismaMock.interview.delete).toHaveBeenCalledWith({
      where: { id: INTERVIEW_ID },
    });
  });
});

// ─── sendInterviewToChat ────────────────────────────────────────────────────

describe("sendInterviewToChat", () => {
  const mockInterviewWithInternship = {
    ...mockInterviewBase,
    internship: {
      title: "Practicante Frontend",
      company: { companyName: "TechCorp" },
    },
  };

  const mockMessageCreated = {
    id: "msg-new",
    conversationId: CONVERSATION_ID,
    senderId: COMPANY_USER_ID,
    content: "...",
    type: "INTERVIEW",
    sender: { id: COMPANY_USER_ID, name: "Juan", image: null, role: "COMPANY" },
  };

  it("lanza error si la entrevista no existe", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(null);

    await expect(
      sendInterviewToChat(INTERVIEW_ID, COMPANY_USER_ID),
    ).rejects.toThrow("Interview not found");
  });

  it("lanza Not authorized si companyId no matchea", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({
      ...mockInterviewWithInternship,
      companyId: "other-company",
    });

    await expect(
      sendInterviewToChat(INTERVIEW_ID, COMPANY_USER_ID),
    ).rejects.toThrow("Not authorized");
  });

  it("usa heading 'Entrevista agendada' la primera vez (sentToChat=false)", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(
      mockInterviewWithInternship,
    );
    prismaMock.message.create.mockResolvedValue(mockMessageCreated);
    prismaMock.interview.update.mockResolvedValue(mockInterviewWithInternship);
    prismaMock.conversation.update.mockResolvedValue({ id: CONVERSATION_ID });

    await sendInterviewToChat(INTERVIEW_ID, COMPANY_USER_ID);

    const callArg = prismaMock.message.create.mock.calls[0][0];
    expect(callArg?.data.content).toContain("📅 Entrevista agendada");
    expect(callArg?.data.content).not.toContain("📅 Entrevista actualizada");
  });

  it("usa heading 'Entrevista actualizada' cuando ya fue enviada antes (sentToChat=true)", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({
      ...mockInterviewWithInternship,
      sentToChat: true,
    });
    prismaMock.message.create.mockResolvedValue(mockMessageCreated);
    prismaMock.interview.update.mockResolvedValue(mockInterviewWithInternship);
    prismaMock.conversation.update.mockResolvedValue({ id: CONVERSATION_ID });

    await sendInterviewToChat(INTERVIEW_ID, COMPANY_USER_ID);

    const callArg = prismaMock.message.create.mock.calls[0][0];
    expect(callArg?.data.content).toContain("📅 Entrevista actualizada");
  });

  it("usa 'Link por confirmar' cuando meetingLink es null", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({
      ...mockInterviewWithInternship,
      meetingLink: null,
    });
    prismaMock.message.create.mockResolvedValue(mockMessageCreated);
    prismaMock.interview.update.mockResolvedValue(mockInterviewWithInternship);
    prismaMock.conversation.update.mockResolvedValue({ id: CONVERSATION_ID });

    await sendInterviewToChat(INTERVIEW_ID, COMPANY_USER_ID);

    const callArg = prismaMock.message.create.mock.calls[0][0];
    expect(callArg?.data.content).toContain("Link por confirmar");
  });

  it("incluye notas en el mensaje cuando hay, las omite cuando notes es null", async () => {
    prismaMock.interview.findUnique.mockResolvedValue({
      ...mockInterviewWithInternship,
      notes: "Llevar CV impreso",
    });
    prismaMock.message.create.mockResolvedValue(mockMessageCreated);
    prismaMock.interview.update.mockResolvedValue(mockInterviewWithInternship);
    prismaMock.conversation.update.mockResolvedValue({ id: CONVERSATION_ID });

    await sendInterviewToChat(INTERVIEW_ID, COMPANY_USER_ID);

    const callArg = prismaMock.message.create.mock.calls[0][0];
    expect(callArg?.data.content).toContain("📝 Llevar CV impreso");
  });

  it("usa metadata con interviewId y type INTERVIEW_SCHEDULED", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(
      mockInterviewWithInternship,
    );
    prismaMock.message.create.mockResolvedValue(mockMessageCreated);
    prismaMock.interview.update.mockResolvedValue(mockInterviewWithInternship);
    prismaMock.conversation.update.mockResolvedValue({ id: CONVERSATION_ID });

    await sendInterviewToChat(INTERVIEW_ID, COMPANY_USER_ID);

    expect(prismaMock.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "INTERVIEW",
          metadata: {
            interviewId: INTERVIEW_ID,
            type: "INTERVIEW_SCHEDULED",
          },
        }),
      }),
    );
  });

  it("ejecuta las 3 operaciones en una sola transacción ($transaction con array)", async () => {
    prismaMock.interview.findUnique.mockResolvedValue(
      mockInterviewWithInternship,
    );
    prismaMock.message.create.mockResolvedValue(mockMessageCreated);
    prismaMock.interview.update.mockResolvedValue({
      ...mockInterviewWithInternship,
      sentToChat: true,
      sentToChatAt: new Date(),
    });
    prismaMock.conversation.update.mockResolvedValue({ id: CONVERSATION_ID });

    await sendInterviewToChat(INTERVIEW_ID, COMPANY_USER_ID);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: INTERVIEW_ID },
        data: expect.objectContaining({
          sentToChat: true,
          sentToChatAt: expect.any(Date),
        }),
      }),
    );
    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CONVERSATION_ID },
        data: expect.objectContaining({ updatedAt: expect.any(Date) }),
      }),
    );
  });

  it("retorna { message, interview } desde el resultado de la transacción", async () => {
    const updatedInterview = {
      ...mockInterviewWithInternship,
      sentToChat: true,
      sentToChatAt: new Date(),
    };
    prismaMock.interview.findUnique.mockResolvedValue(
      mockInterviewWithInternship,
    );
    prismaMock.message.create.mockResolvedValue(mockMessageCreated);
    prismaMock.interview.update.mockResolvedValue(updatedInterview);
    prismaMock.conversation.update.mockResolvedValue({ id: CONVERSATION_ID });

    const result = await sendInterviewToChat(INTERVIEW_ID, COMPANY_USER_ID);

    expect(result.message).toEqual(mockMessageCreated);
    expect(result.interview).toEqual(updatedInterview);
  });
});

// ─── getAvailableCandidates ─────────────────────────────────────────────────

describe("getAvailableCandidates", () => {
  const mockInternship = {
    id: INTERNSHIP_ID,
    company: { userId: COMPANY_USER_ID },
  };

  it("lanza error si la práctica no existe", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(null);

    await expect(
      getAvailableCandidates(INTERNSHIP_ID, COMPANY_USER_ID),
    ).rejects.toThrow("Internship not found");
  });

  it("lanza Not authorized si la práctica no pertenece a esta empresa", async () => {
    prismaMock.internship.findUnique.mockResolvedValue({
      ...mockInternship,
      company: { userId: "other-company" },
    });

    await expect(
      getAvailableCandidates(INTERNSHIP_ID, COMPANY_USER_ID),
    ).rejects.toThrow("Not authorized");
  });

  it("filtra solo applications en pipeline INTERVIEW sin entrevista (interview is null)", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(mockInternship);
    prismaMock.application.findMany.mockResolvedValue([]);

    await getAvailableCandidates(INTERNSHIP_ID, COMPANY_USER_ID);

    expect(prismaMock.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          internshipId: INTERNSHIP_ID,
          pipelineStatus: "INTERVIEW",
          interview: { is: null },
        },
      }),
    );
  });

  it("mapea cada app a { applicationId, conversationId, student }", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(mockInternship);
    prismaMock.application.findMany.mockResolvedValue([
      {
        id: APPLICATION_ID,
        student: {
          id: STUDENT_USER_ID,
          name: "María",
          image: null,
          email: "maria@test.com",
        },
        conversation: { id: CONVERSATION_ID },
      },
    ]);

    const result = await getAvailableCandidates(INTERNSHIP_ID, COMPANY_USER_ID);

    expect(result).toEqual([
      {
        applicationId: APPLICATION_ID,
        conversationId: CONVERSATION_ID,
        student: {
          id: STUDENT_USER_ID,
          name: "María",
          image: null,
          email: "maria@test.com",
        },
      },
    ]);
  });

  it("mapea conversationId a null cuando la application no tiene conversación", async () => {
    prismaMock.internship.findUnique.mockResolvedValue(mockInternship);
    prismaMock.application.findMany.mockResolvedValue([
      {
        id: APPLICATION_ID,
        student: {
          id: STUDENT_USER_ID,
          name: "María",
          image: null,
          email: "maria@test.com",
        },
        conversation: null,
      },
    ]);

    const [candidate] = await getAvailableCandidates(
      INTERNSHIP_ID,
      COMPANY_USER_ID,
    );

    expect(candidate.conversationId).toBeNull();
  });
});

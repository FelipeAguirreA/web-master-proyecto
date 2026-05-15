import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";
import {
  getOrCreateConversation,
  getConversationsByUser,
  getConversationById,
  getMessages,
  sendMessage,
  markConversationRead,
  toggleConversationPin,
  toggleConversationMarkedUnread,
} from "@/server/services/chat.service";

beforeEach(() => {
  resetPrismaMock();
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const COMPANY_USER_ID = "company-user-1";
const STUDENT_USER_ID = "student-user-1";
const APPLICATION_ID = "app-1";
const CONVERSATION_ID = "conv-1";

const mockApplicationInInterview = {
  id: APPLICATION_ID,
  studentId: STUDENT_USER_ID,
  pipelineStatus: "INTERVIEW",
  internship: {
    company: { userId: COMPANY_USER_ID },
  },
};

const mockConversationRow = {
  id: CONVERSATION_ID,
  companyId: COMPANY_USER_ID,
  studentId: STUDENT_USER_ID,
  applicationId: APPLICATION_ID,
  companyPinned: false,
  studentPinned: false,
  companyMarkedUnread: false,
  studentMarkedUnread: false,
  createdAt: new Date("2026-04-23T10:00:00Z"),
  updatedAt: new Date("2026-04-23T10:00:00Z"),
};

const mockConversationListItemRaw = {
  ...mockConversationRow,
  company: {
    id: COMPANY_USER_ID,
    name: "Juan",
    lastName: "Pérez",
    image: null,
    companyProfile: { companyName: "TechCorp", logo: "techcorp.png" },
  },
  student: {
    id: STUDENT_USER_ID,
    name: "María",
    lastName: "García",
    image: "maria.png",
  },
  application: {
    id: APPLICATION_ID,
    pipelineStatus: "INTERVIEW",
    internship: { id: "int-1", title: "Practicante Frontend" },
  },
  messages: [
    {
      content: "Hola María",
      type: "TEXT",
      createdAt: new Date("2026-04-23T10:30:00Z"),
      isRead: true,
      senderId: COMPANY_USER_ID,
    },
  ],
  interviews: [{ sentToChat: false }],
  _count: { messages: 2 },
};

// ─── getOrCreateConversation ────────────────────────────────────────────────

describe("getOrCreateConversation", () => {
  it("lanza error con code NOT_FOUND si la application no existe", async () => {
    prismaMock.application.findUnique.mockResolvedValue(null);

    await expect(
      getOrCreateConversation(COMPANY_USER_ID, APPLICATION_ID),
    ).rejects.toMatchObject({
      message: "Application not found",
      code: "NOT_FOUND",
    });
  });

  it("lanza error con code INTERVIEW_REQUIRED si la application no está en INTERVIEW", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...mockApplicationInInterview,
      pipelineStatus: "REVIEWED",
    });

    await expect(
      getOrCreateConversation(COMPANY_USER_ID, APPLICATION_ID),
    ).rejects.toMatchObject({
      message: "Chat only available for applications in INTERVIEW stage",
      code: "INTERVIEW_REQUIRED",
    });
  });

  it("lanza error con code NOT_FOUND (no FORBIDDEN) si el companyUserId no es dueño de la práctica — anti-enumeration", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...mockApplicationInInterview,
      internship: { company: { userId: "other-company-user" } },
    });

    await expect(
      getOrCreateConversation(COMPANY_USER_ID, APPLICATION_ID),
    ).rejects.toMatchObject({
      message: "Application not found",
      code: "NOT_FOUND",
    });
  });

  it("ownership se chequea ANTES que pipelineStatus para no leak el stage de apps ajenas", async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      ...mockApplicationInInterview,
      pipelineStatus: "REVIEWED",
      internship: { company: { userId: "other-company-user" } },
    });

    // Una app que NO es del caller y NO está en INTERVIEW debería caer
    // en NOT_FOUND (no INTERVIEW_REQUIRED), para no diferenciar paths.
    await expect(
      getOrCreateConversation(COMPANY_USER_ID, APPLICATION_ID),
    ).rejects.toMatchObject({
      message: "Application not found",
      code: "NOT_FOUND",
    });
  });

  it("retorna la conversación existente sin crear otra (idempotente)", async () => {
    prismaMock.application.findUnique.mockResolvedValue(
      mockApplicationInInterview,
    );
    prismaMock.conversation.findUnique.mockResolvedValue(mockConversationRow);

    const result = await getOrCreateConversation(
      COMPANY_USER_ID,
      APPLICATION_ID,
    );

    expect(result).toEqual(mockConversationRow);
    expect(prismaMock.conversation.create).not.toHaveBeenCalled();
  });

  it("crea una nueva conversación si no existe", async () => {
    prismaMock.application.findUnique.mockResolvedValue(
      mockApplicationInInterview,
    );
    prismaMock.conversation.findUnique.mockResolvedValue(null);
    prismaMock.conversation.create.mockResolvedValue(mockConversationRow);

    const result = await getOrCreateConversation(
      COMPANY_USER_ID,
      APPLICATION_ID,
    );

    expect(result).toEqual(mockConversationRow);
    expect(prismaMock.conversation.create).toHaveBeenCalledWith({
      data: {
        companyId: COMPANY_USER_ID,
        studentId: STUDENT_USER_ID,
        applicationId: APPLICATION_ID,
      },
    });
  });
});

// ─── getConversationsByUser ─────────────────────────────────────────────────

describe("getConversationsByUser", () => {
  it("filtra por companyId cuando role es COMPANY", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([]);

    await getConversationsByUser(COMPANY_USER_ID, "COMPANY");

    expect(prismaMock.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: COMPANY_USER_ID },
      }),
    );
  });

  it("filtra por studentId cuando role es STUDENT", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([]);

    await getConversationsByUser(STUDENT_USER_ID, "STUDENT");

    expect(prismaMock.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: STUDENT_USER_ID },
      }),
    );
  });

  it("usa companyProfile.companyName y logo sobre user.name e image", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      mockConversationListItemRaw,
    ]);

    const [conv] = await getConversationsByUser(COMPANY_USER_ID, "COMPANY");

    expect(conv.company.name).toBe("TechCorp");
    expect(conv.company.image).toBe("techcorp.png");
    expect(conv.company.contactName).toBe("Juan Pérez");
  });

  it("cae en user.name e image si companyProfile no tiene companyName/logo", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      {
        ...mockConversationListItemRaw,
        company: {
          ...mockConversationListItemRaw.company,
          image: "user-fallback.png",
          companyProfile: null,
        },
      },
    ]);

    const [conv] = await getConversationsByUser(COMPANY_USER_ID, "COMPANY");

    expect(conv.company.name).toBe("Juan");
    expect(conv.company.image).toBe("user-fallback.png");
  });

  it("expone unreadCount desde _count.messages", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      { ...mockConversationListItemRaw, _count: { messages: 7 } },
    ]);

    const [conv] = await getConversationsByUser(COMPANY_USER_ID, "COMPANY");

    expect(conv.unreadCount).toBe(7);
  });

  it("hasPendingInterview true cuando hay interview con sentToChat false", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      { ...mockConversationListItemRaw, interviews: [{ sentToChat: false }] },
    ]);

    const [conv] = await getConversationsByUser(COMPANY_USER_ID, "COMPANY");

    expect(conv.hasPendingInterview).toBe(true);
  });

  it("hasPendingInterview false cuando no hay interview o ya se mandó al chat", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      { ...mockConversationListItemRaw, interviews: [] },
      { ...mockConversationListItemRaw, interviews: [{ sentToChat: true }] },
    ]);

    const [conv1, conv2] = await getConversationsByUser(
      COMPANY_USER_ID,
      "COMPANY",
    );

    expect(conv1.hasPendingInterview).toBe(false);
    expect(conv2.hasPendingInterview).toBe(false);
  });

  it("lastMessage es null cuando la conversación no tiene mensajes", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      { ...mockConversationListItemRaw, messages: [] },
    ]);

    const [conv] = await getConversationsByUser(COMPANY_USER_ID, "COMPANY");

    expect(conv.lastMessage).toBeNull();
  });
});

// ─── getConversationById ────────────────────────────────────────────────────

describe("getConversationById", () => {
  const mockSingleConversation = {
    ...mockConversationRow,
    company: {
      id: COMPANY_USER_ID,
      name: "Juan",
      lastName: "Pérez",
      image: null,
      companyProfile: { companyName: "TechCorp", logo: "techcorp.png" },
    },
    student: {
      id: STUDENT_USER_ID,
      name: "María",
      lastName: "García",
      image: "maria.png",
    },
    application: {
      internship: {
        id: "int-1",
        title: "Practicante Frontend",
        company: { companyName: "TechCorp" },
      },
    },
  };

  it("lanza error con code NOT_FOUND si la conversación no existe", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(null);

    await expect(
      getConversationById(CONVERSATION_ID, COMPANY_USER_ID),
    ).rejects.toMatchObject({
      message: "Conversation not found",
      code: "NOT_FOUND",
    });
  });

  it("lanza error con code FORBIDDEN si el userId no pertenece a la conversación", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(
      mockSingleConversation,
    );

    await expect(
      getConversationById(CONVERSATION_ID, "intruder-user"),
    ).rejects.toMatchObject({
      message: "Not authorized",
      code: "FORBIDDEN",
    });
  });

  it("mapea la identidad de empresa con fallback al user", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(
      mockSingleConversation,
    );

    const result = await getConversationById(CONVERSATION_ID, COMPANY_USER_ID);

    expect(result.company.name).toBe("TechCorp");
    expect(result.company.contactName).toBe("Juan Pérez");
    expect(result.student.name).toBe("María García");
  });
});

// ─── getMessages ────────────────────────────────────────────────────────────

describe("getMessages", () => {
  const mockMessages = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `msg-${i}`,
      conversationId: CONVERSATION_ID,
      senderId: COMPANY_USER_ID,
      content: `mensaje ${i}`,
      type: "TEXT",
      isRead: false,
      createdAt: new Date(`2026-04-23T11:0${i}:00Z`),
      sender: {
        id: COMPANY_USER_ID,
        name: "Juan",
        image: null,
        role: "COMPANY",
      },
    }));

  it("lanza error con code NOT_FOUND si la conversación no existe", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(null);

    await expect(
      getMessages(CONVERSATION_ID, COMPANY_USER_ID),
    ).rejects.toMatchObject({
      message: "Conversation not found",
      code: "NOT_FOUND",
    });
  });

  it("lanza error con code FORBIDDEN si el userId no pertenece a la conversación", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });

    await expect(
      getMessages(CONVERSATION_ID, "intruder-user"),
    ).rejects.toMatchObject({
      message: "Not authorized",
      code: "FORBIDDEN",
    });
  });

  it("marca como leídos los mensajes recibidos no leídos (side effect)", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });
    prismaMock.message.findMany.mockResolvedValue([]);

    await getMessages(CONVERSATION_ID, STUDENT_USER_ID);

    expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
      where: {
        conversationId: CONVERSATION_ID,
        isRead: false,
        senderId: { not: STUDENT_USER_ID },
      },
      data: { isRead: true },
    });
  });

  it("retorna nextCursor null si recibe menos mensajes que el limit", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });
    prismaMock.message.findMany.mockResolvedValue(mockMessages(3));

    const result = await getMessages(
      CONVERSATION_ID,
      STUDENT_USER_ID,
      undefined,
      50,
    );

    expect(result.nextCursor).toBeNull();
    expect(result.messages).toHaveLength(3);
  });

  it("retorna nextCursor del más viejo del batch cuando llega al limit (paginación hacia atrás)", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });
    // El service pide orderBy desc, así que el mock devuelve desc (más nuevo
    // primero). Después el service hace .reverse() para devolver asc al cliente.
    const desc = mockMessages(5).slice().reverse();
    prismaMock.message.findMany.mockResolvedValue(desc);

    const result = await getMessages(
      CONVERSATION_ID,
      STUDENT_USER_ID,
      undefined,
      5,
    );

    // El nextCursor debe ser el createdAt del MÁS VIEJO de los devueltos —
    // para cargar mensajes más antiguos en la próxima página.
    expect(result.nextCursor).toBe(result.messages[0].createdAt.toISOString());
    // Messages quedan en orden ascendente (cronológico) para el cliente.
    for (let i = 1; i < result.messages.length; i++) {
      expect(
        result.messages[i].createdAt >= result.messages[i - 1].createdAt,
      ).toBe(true);
    }
  });

  it("aplica el cursor con createdAt < cursor cuando se provee (paginación hacia atrás)", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });
    prismaMock.message.findMany.mockResolvedValue([]);

    const cursor = "2026-04-23T11:00:00.000Z";
    await getMessages(CONVERSATION_ID, STUDENT_USER_ID, cursor, 50);

    expect(prismaMock.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId: CONVERSATION_ID,
          createdAt: { lt: new Date(cursor) },
        }),
      }),
    );
  });

  it("ordena descendente al consultar (para traer los ÚLTIMOS N, no los primeros)", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });
    prismaMock.message.findMany.mockResolvedValue([]);

    await getMessages(CONVERSATION_ID, STUDENT_USER_ID);

    expect(prismaMock.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});

// ─── sendMessage ────────────────────────────────────────────────────────────

describe("sendMessage", () => {
  const mockMessageCreated = {
    id: "msg-new",
    conversationId: CONVERSATION_ID,
    senderId: COMPANY_USER_ID,
    content: "Hola",
    type: "TEXT",
    isRead: false,
    createdAt: new Date(),
    sender: {
      id: COMPANY_USER_ID,
      name: "Juan",
      image: null,
      role: "COMPANY",
    },
  };

  it("lanza error con code NOT_FOUND si la conversación no existe", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(null);

    await expect(
      sendMessage(CONVERSATION_ID, COMPANY_USER_ID, "Hola"),
    ).rejects.toMatchObject({
      message: "Conversation not found",
      code: "NOT_FOUND",
    });
  });

  it("lanza error con code FORBIDDEN si el senderId no pertenece a la conversación", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      ...mockConversationRow,
      messages: [],
    });

    await expect(
      sendMessage(CONVERSATION_ID, "intruder-user", "Hola"),
    ).rejects.toMatchObject({
      message: "Not authorized",
      code: "FORBIDDEN",
    });
  });

  it("lanza error con code STUDENT_CANNOT_INITIATE si el estudiante intenta iniciar la conversación", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      ...mockConversationRow,
      messages: [],
    });

    try {
      await sendMessage(CONVERSATION_ID, STUDENT_USER_ID, "Hola");
      expect.unreachable("debería haber lanzado");
    } catch (err) {
      const e = err as Error & { code: string };
      expect(e.message).toBe("La empresa debe iniciar la conversación");
      expect(e.code).toBe("STUDENT_CANNOT_INITIATE");
    }
  });

  it("permite a la empresa iniciar la conversación (sin mensajes previos)", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      ...mockConversationRow,
      messages: [],
      // Mensaje de empresa → service crea NEW_MESSAGE para estudiante.
      student: { name: "María" },
      company: {
        name: "Juan",
        companyProfile: { companyName: "TechCorp" },
      },
      application: { internship: { title: "Practicante Frontend" } },
    });
    prismaMock.message.create.mockResolvedValue(mockMessageCreated);
    prismaMock.conversation.update.mockResolvedValue(mockConversationRow);
    prismaMock.notification.findFirst.mockResolvedValue(null);

    const result = await sendMessage(CONVERSATION_ID, COMPANY_USER_ID, "Hola");

    expect(result).toEqual(mockMessageCreated);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: STUDENT_USER_ID,
          type: "NEW_MESSAGE",
          entityId: CONVERSATION_ID,
        }),
      }),
    );
  });

  it("permite al estudiante responder si ya hay mensajes en la conversación", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      ...mockConversationRow,
      messages: [{ id: "msg-prev", senderId: COMPANY_USER_ID }],
      // Mensaje de estudiante → service crea NEW_MESSAGE para empresa.
      student: { name: "María" },
      company: {
        name: "Juan",
        companyProfile: { companyName: "TechCorp" },
      },
      application: { internship: { title: "Practicante Frontend" } },
    });
    prismaMock.message.create.mockResolvedValue({
      ...mockMessageCreated,
      senderId: STUDENT_USER_ID,
    });
    prismaMock.conversation.update.mockResolvedValue(mockConversationRow);
    prismaMock.notification.findFirst.mockResolvedValue(null);

    const result = await sendMessage(
      CONVERSATION_ID,
      STUDENT_USER_ID,
      "Gracias",
    );

    expect(result.senderId).toBe(STUDENT_USER_ID);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: COMPANY_USER_ID,
          type: "NEW_MESSAGE",
          entityId: CONVERSATION_ID,
        }),
      }),
    );
  });

  it("usa $transaction para crear mensaje y bumpear updatedAt en una sola operación atómica", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      ...mockConversationRow,
      messages: [{ id: "msg-prev", senderId: COMPANY_USER_ID }],
      student: { name: "María" },
      company: {
        name: "Juan",
        companyProfile: { companyName: "TechCorp" },
      },
      application: { internship: { title: "Practicante Frontend" } },
    });
    prismaMock.message.create.mockResolvedValue(mockMessageCreated);
    prismaMock.conversation.update.mockResolvedValue(mockConversationRow);
    prismaMock.notification.findFirst.mockResolvedValue(null);

    await sendMessage(CONVERSATION_ID, COMPANY_USER_ID, "Otro mensaje");

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: CONVERSATION_ID,
          senderId: COMPANY_USER_ID,
          content: "Otro mensaje",
          type: "TEXT",
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
});

// ─── markConversationRead ───────────────────────────────────────────────────

describe("markConversationRead", () => {
  it("lanza error con code NOT_FOUND si la conversación no existe", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(null);

    await expect(
      markConversationRead(CONVERSATION_ID, COMPANY_USER_ID),
    ).rejects.toMatchObject({
      message: "Conversation not found",
      code: "NOT_FOUND",
    });
  });

  it("lanza error con code FORBIDDEN si el userId no pertenece a la conversación", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });

    await expect(
      markConversationRead(CONVERSATION_ID, "intruder-user"),
    ).rejects.toMatchObject({
      message: "Not authorized",
      code: "FORBIDDEN",
    });
  });

  it("marca como leídos solo los mensajes recibidos no leídos (no los propios)", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });

    await markConversationRead(CONVERSATION_ID, STUDENT_USER_ID);

    expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
      where: {
        conversationId: CONVERSATION_ID,
        isRead: false,
        senderId: { not: STUDENT_USER_ID },
      },
      data: { isRead: true },
    });
  });

  it("limpia el markedUnread del rol que abre (estudiante)", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });

    await markConversationRead(CONVERSATION_ID, STUDENT_USER_ID);

    expect(prismaMock.conversation.update).toHaveBeenCalledWith({
      where: { id: CONVERSATION_ID },
      data: { studentMarkedUnread: false },
    });
  });

  it("limpia el markedUnread del rol que abre (empresa)", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });

    await markConversationRead(CONVERSATION_ID, COMPANY_USER_ID);

    expect(prismaMock.conversation.update).toHaveBeenCalledWith({
      where: { id: CONVERSATION_ID },
      data: { companyMarkedUnread: false },
    });
  });
});

// ─── toggleConversationPin ──────────────────────────────────────────────────

describe("toggleConversationPin", () => {
  it("lanza NOT_FOUND si la conversación no existe", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(null);

    await expect(
      toggleConversationPin(CONVERSATION_ID, COMPANY_USER_ID),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lanza FORBIDDEN si el userId no pertenece a la conversación", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });

    await expect(
      toggleConversationPin(CONVERSATION_ID, "intruder-user"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("alterna companyPinned cuando el caller es la empresa", async () => {
    prismaMock.conversation.findUnique
      .mockResolvedValueOnce({
        companyId: COMPANY_USER_ID,
        studentId: STUDENT_USER_ID,
      })
      .mockResolvedValueOnce({ companyPinned: false });

    const result = await toggleConversationPin(
      CONVERSATION_ID,
      COMPANY_USER_ID,
    );

    expect(prismaMock.conversation.update).toHaveBeenCalledWith({
      where: { id: CONVERSATION_ID },
      data: { companyPinned: true },
    });
    expect(result.isPinned).toBe(true);
  });

  it("alterna studentPinned cuando el caller es el estudiante", async () => {
    prismaMock.conversation.findUnique
      .mockResolvedValueOnce({
        companyId: COMPANY_USER_ID,
        studentId: STUDENT_USER_ID,
      })
      .mockResolvedValueOnce({ studentPinned: true });

    const result = await toggleConversationPin(
      CONVERSATION_ID,
      STUDENT_USER_ID,
    );

    expect(prismaMock.conversation.update).toHaveBeenCalledWith({
      where: { id: CONVERSATION_ID },
      data: { studentPinned: false },
    });
    expect(result.isPinned).toBe(false);
  });
});

// ─── toggleConversationMarkedUnread ─────────────────────────────────────────

describe("toggleConversationMarkedUnread", () => {
  it("lanza FORBIDDEN si el userId no pertenece a la conversación", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      companyId: COMPANY_USER_ID,
      studentId: STUDENT_USER_ID,
    });

    await expect(
      toggleConversationMarkedUnread(CONVERSATION_ID, "intruder-user"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("alterna companyMarkedUnread cuando el caller es la empresa", async () => {
    prismaMock.conversation.findUnique
      .mockResolvedValueOnce({
        companyId: COMPANY_USER_ID,
        studentId: STUDENT_USER_ID,
      })
      .mockResolvedValueOnce({ companyMarkedUnread: false });

    const result = await toggleConversationMarkedUnread(
      CONVERSATION_ID,
      COMPANY_USER_ID,
    );

    expect(prismaMock.conversation.update).toHaveBeenCalledWith({
      where: { id: CONVERSATION_ID },
      data: { companyMarkedUnread: true },
    });
    expect(result.markedUnread).toBe(true);
  });
});

// ─── getConversationsByUser — campos nuevos ─────────────────────────────────

describe("getConversationsByUser — pin / unread / pipelineStatus", () => {
  it("expone isPinned/markedUnread según el rol COMPANY", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      {
        ...mockConversationListItemRaw,
        companyPinned: true,
        studentPinned: false,
        companyMarkedUnread: true,
        studentMarkedUnread: false,
      },
    ]);

    const [conv] = await getConversationsByUser(COMPANY_USER_ID, "COMPANY");

    expect(conv.isPinned).toBe(true);
    expect(conv.markedUnread).toBe(true);
  });

  it("expone isPinned/markedUnread según el rol STUDENT (no se cruzan)", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      {
        ...mockConversationListItemRaw,
        companyPinned: true,
        studentPinned: false,
        companyMarkedUnread: true,
        studentMarkedUnread: false,
      },
    ]);

    const [conv] = await getConversationsByUser(STUDENT_USER_ID, "STUDENT");

    expect(conv.isPinned).toBe(false);
    expect(conv.markedUnread).toBe(false);
  });

  it("expone pipelineStatus y applicationId del application", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      mockConversationListItemRaw,
    ]);

    const [conv] = await getConversationsByUser(COMPANY_USER_ID, "COMPANY");

    expect(conv.pipelineStatus).toBe("INTERVIEW");
    expect(conv.applicationId).toBe(APPLICATION_ID);
  });
});

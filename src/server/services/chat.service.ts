import { prisma } from "@/server/lib/db";

type ChatErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INTERVIEW_REQUIRED"
  | "STUDENT_CANNOT_INITIATE";

function chatError(code: ChatErrorCode, message: string) {
  const err = new Error(message) as Error & { code: ChatErrorCode };
  err.code = code;
  return err;
}

// ─── Conversations ──────────────────────────────────────────────────────────

export async function getOrCreateConversation(
  companyUserId: string,
  applicationId: string,
) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      internship: {
        include: { company: { select: { userId: true } } },
      },
    },
  });

  // Anti-enumeration: ownership ANTES que stage para no leak pipelineStatus
  // de apps ajenas. Apps que no son del owner devuelven el mismo NOT_FOUND
  // que apps inexistentes.
  if (!application) throw chatError("NOT_FOUND", "Application not found");
  if (application.internship.company.userId !== companyUserId) {
    throw chatError("NOT_FOUND", "Application not found");
  }
  if (application.pipelineStatus !== "INTERVIEW") {
    throw chatError(
      "INTERVIEW_REQUIRED",
      "Chat only available for applications in INTERVIEW stage",
    );
  }

  // Retornar existente si ya hay conversación
  const existing = await prisma.conversation.findUnique({
    where: { applicationId },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      companyId: companyUserId,
      studentId: application.studentId,
      applicationId,
    },
  });
}

export async function getConversationsByUser(
  userId: string,
  role: "COMPANY" | "STUDENT",
) {
  const where =
    role === "COMPANY" ? { companyId: userId } : { studentId: userId };

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          lastName: true,
          image: true,
          companyProfile: { select: { companyName: true, logo: true } },
        },
      },
      student: {
        select: { id: true, name: true, lastName: true, image: true },
      },
      application: {
        select: {
          id: true,
          pipelineStatus: true,
          internship: { select: { id: true, title: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          type: true,
          createdAt: true,
          isRead: true,
          senderId: true,
        },
      },
      interviews: {
        where: { status: "SCHEDULED" },
        select: { sentToChat: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          messages: {
            where: {
              isRead: false,
              senderId: { not: userId },
            },
          },
        },
      },
    },
  });

  // Orden por actividad real de la conversación: createdAt del último mensaje,
  // con fallback a createdAt de la conversación (cuando no hay mensajes). NO
  // usamos updatedAt porque también se toca al marcar leído / pin / unread,
  // y eso movería al top conversaciones sin actividad nueva.
  conversations.sort((a, b) => {
    const aTime = (a.messages[0]?.createdAt ?? a.createdAt).getTime();
    const bTime = (b.messages[0]?.createdAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });

  return conversations.map((c) => ({
    id: c.id,
    companyId: c.companyId,
    studentId: c.studentId,
    company: {
      id: c.company.id,
      name: c.company.companyProfile?.companyName ?? c.company.name,
      contactName: [c.company.name, c.company.lastName]
        .filter(Boolean)
        .join(" "),
      image: c.company.companyProfile?.logo ?? c.company.image,
    },
    student: {
      id: c.student.id,
      name: [c.student.name, c.student.lastName].filter(Boolean).join(" "),
      image: c.student.image,
    },
    internship: c.application.internship,
    applicationId: c.application.id,
    pipelineStatus: c.application.pipelineStatus,
    isPinned: role === "COMPANY" ? c.companyPinned : c.studentPinned,
    markedUnread:
      role === "COMPANY" ? c.companyMarkedUnread : c.studentMarkedUnread,
    lastMessage: c.messages[0] ?? null,
    unreadCount: c._count.messages,
    hasPendingInterview: c.interviews.length > 0 && !c.interviews[0].sentToChat,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  }));
}

// ─── Pin / Marked-as-unread ─────────────────────────────────────────────────
// Cada lado (empresa, estudiante) anclla y marca-no-leído independientemente.
// 4 columnas planas en Conversation porque la cardinalidad es 1:1 y son flags
// visuales — ver migration 20260512100000_add_conversation_pin_unread.

async function getConversationRoleOrThrow(
  conversationId: string,
  userId: string,
): Promise<"COMPANY" | "STUDENT"> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { companyId: true, studentId: true },
  });
  if (!conv) throw chatError("NOT_FOUND", "Conversation not found");
  if (conv.companyId === userId) return "COMPANY";
  if (conv.studentId === userId) return "STUDENT";
  throw chatError("FORBIDDEN", "Not authorized");
}

export async function toggleConversationPin(
  conversationId: string,
  userId: string,
) {
  const role = await getConversationRoleOrThrow(conversationId, userId);

  // Read-modify-write: la otra opción (raw SQL con NOT) ahorra una query pero
  // pierde el contrato Prisma. El uso es de baja frecuencia (click manual).
  const current = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { companyPinned: true, studentPinned: true },
  });
  if (!current) throw chatError("NOT_FOUND", "Conversation not found");

  const next =
    role === "COMPANY" ? !current.companyPinned : !current.studentPinned;
  const field = role === "COMPANY" ? "companyPinned" : "studentPinned";

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { [field]: next },
  });
  return { isPinned: next };
}

export async function toggleConversationMarkedUnread(
  conversationId: string,
  userId: string,
) {
  const role = await getConversationRoleOrThrow(conversationId, userId);

  const current = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { companyMarkedUnread: true, studentMarkedUnread: true },
  });
  if (!current) throw chatError("NOT_FOUND", "Conversation not found");

  const next =
    role === "COMPANY"
      ? !current.companyMarkedUnread
      : !current.studentMarkedUnread;
  const field =
    role === "COMPANY" ? "companyMarkedUnread" : "studentMarkedUnread";

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { [field]: next },
  });
  return { markedUnread: next };
}

export async function getConversationById(
  conversationId: string,
  userId: string,
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          lastName: true,
          image: true,
          companyProfile: { select: { companyName: true, logo: true } },
        },
      },
      student: {
        select: { id: true, name: true, lastName: true, image: true },
      },
      application: {
        select: {
          pipelineStatus: true,
          internship: {
            select: {
              id: true,
              title: true,
              company: { select: { companyName: true } },
            },
          },
        },
      },
    },
  });

  if (!conv) throw chatError("NOT_FOUND", "Conversation not found");
  if (conv.companyId !== userId && conv.studentId !== userId) {
    throw chatError("FORBIDDEN", "Not authorized");
  }

  return {
    ...conv,
    company: {
      id: conv.company.id,
      name: conv.company.companyProfile?.companyName ?? conv.company.name,
      contactName: [conv.company.name, conv.company.lastName]
        .filter(Boolean)
        .join(" "),
      image: conv.company.companyProfile?.logo ?? conv.company.image,
    },
    student: {
      id: conv.student.id,
      name: [conv.student.name, conv.student.lastName]
        .filter(Boolean)
        .join(" "),
      image: conv.student.image,
    },
  };
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function getMessages(
  conversationId: string,
  userId: string,
  cursor?: string,
  limit = 50,
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { companyId: true, studentId: true },
  });

  if (!conv) throw chatError("NOT_FOUND", "Conversation not found");
  if (conv.companyId !== userId && conv.studentId !== userId) {
    throw chatError("FORBIDDEN", "Not authorized");
  }

  // Traer los ÚLTIMOS N mensajes (los más nuevos) en orden cronológico
  // ascendente como espera el cliente. Antes traía los PRIMEROS N — bug
  // crítico para conversaciones con >limit mensajes: los recién enviados
  // nunca volvían del polling y desaparecían visualmente del chat.
  //
  // Paginación hacia atrás (cargar mensajes más viejos): cursor=createdAt
  // del más viejo conocido por el cliente, server filtra createdAt < cursor.
  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    include: {
      sender: { select: { id: true, name: true, image: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Marcar como leídos los mensajes no leídos del receptor
  await prisma.message.updateMany({
    where: {
      conversationId,
      isRead: false,
      senderId: { not: userId },
    },
    data: { isRead: true },
  });

  const messages = rows.slice().reverse();
  const nextCursor =
    rows.length === limit && messages.length > 0
      ? messages[0].createdAt.toISOString()
      : null;

  return { messages, nextCursor };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });

  if (!conv) throw chatError("NOT_FOUND", "Conversation not found");
  if (conv.companyId !== senderId && conv.studentId !== senderId) {
    throw chatError("FORBIDDEN", "Not authorized");
  }

  // Estudiante no puede iniciar la conversación
  const isStudent = conv.studentId === senderId;
  const hasMessages = conv.messages.length > 0;
  if (isStudent && !hasMessages) {
    throw chatError(
      "STUDENT_CANNOT_INITIATE",
      "La empresa debe iniciar la conversación",
    );
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        type: "TEXT",
      },
      include: {
        sender: { select: { id: true, name: true, image: true, role: true } },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  // Notificación in-app para el destinatario. Dedupe GLOBAL por user (no
  // por conversación): si ya tiene una NEW_MESSAGE no leída — sin importar
  // de qué chat — solo refrescamos createdAt para que suba al top. Esto
  // evita 20 campanitas si llegan mensajes de 10 personas; queda 1 sola
  // "Tienes mensajes sin leer" hasta que el destinatario entre al inbox.
  const recipientId = isStudent ? conv.companyId : conv.studentId;
  const body = "Tienes mensajes sin leer.";

  const existing = await prisma.notification.findFirst({
    where: {
      userId: recipientId,
      type: "NEW_MESSAGE",
      read: false,
    },
    select: { id: true },
  });
  if (existing) {
    await prisma.notification.update({
      where: { id: existing.id },
      data: { body, createdAt: new Date() },
    });
  } else {
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: "NEW_MESSAGE",
        title: "Nuevo mensaje",
        body,
        entityId: conversationId,
      },
    });
  }

  return message;
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { companyId: true, studentId: true },
  });

  if (!conv) throw chatError("NOT_FOUND", "Conversation not found");
  if (conv.companyId !== userId && conv.studentId !== userId) {
    throw chatError("FORBIDDEN", "Not authorized");
  }

  const unreadField =
    conv.companyId === userId ? "companyMarkedUnread" : "studentMarkedUnread";

  await prisma.$transaction([
    prisma.message.updateMany({
      where: {
        conversationId,
        isRead: false,
        senderId: { not: userId },
      },
      data: { isRead: true },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { [unreadField]: false },
    }),
    // Sincroniza la campanita con el estado leído del chat. Como la notif
    // NEW_MESSAGE es global (1 por user, no 1 por conversación — ver
    // sendMessage), limpiamos TODAS las NEW_MESSAGE no leídas del user:
    // si abriste un chat, asumimos que viste el inbox.
    prisma.notification.updateMany({
      where: {
        userId,
        type: "NEW_MESSAGE",
        read: false,
      },
      data: { read: true },
    }),
  ]);
}

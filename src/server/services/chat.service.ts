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
    orderBy: { updatedAt: "desc" },
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
    lastMessage: c.messages[0] ?? null,
    unreadCount: c._count.messages,
    hasPendingInterview: c.interviews.length > 0 && !c.interviews[0].sentToChat,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  }));
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

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(cursor ? { createdAt: { gt: new Date(cursor) } } : {}),
    },
    include: {
      sender: { select: { id: true, name: true, image: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
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

  const nextCursor =
    messages.length === limit
      ? messages[messages.length - 1].createdAt.toISOString()
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

  await prisma.message.updateMany({
    where: {
      conversationId,
      isRead: false,
      senderId: { not: userId },
    },
    data: { isRead: true },
  });
}

import { prisma } from "@/server/lib/db";
import { Prisma } from "@prisma/client";

function formatInterviewMessage(
  interview: {
    title: string;
    scheduledAt: Date;
    durationMins: number;
    meetingLink: string | null;
    notes: string | null;
    internship: { title: string; company: { companyName: string } };
  },
  isUpdate: boolean,
): string {
  const heading = isUpdate
    ? "📅 Entrevista actualizada"
    : "📅 Entrevista agendada";
  const separator = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  const fecha = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(interview.scheduledAt);

  const fechaCapitalizada = fecha.charAt(0).toUpperCase() + fecha.slice(1);

  const lines = [
    heading,
    separator,
    `📌 ${interview.title}`,
    `🏢 ${interview.internship.company.companyName} — ${interview.internship.title}`,
    `🗓️ ${fechaCapitalizada}`,
    `⏱️ ${interview.durationMins} minutos`,
    `🔗 ${interview.meetingLink ?? "Link por confirmar"}`,
  ];

  if (interview.notes) {
    lines.push(`📝 ${interview.notes}`);
  }

  lines.push(separator);
  lines.push("¡Mucha suerte! 🎉");

  return lines.join("\n");
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createInterview(
  companyUserId: string,
  data: {
    internshipId: string;
    applicationId: string;
    conversationId: string;
    title: string;
    scheduledAt: Date;
    durationMins?: number;
    meetingLink?: string;
    notes?: string;
  },
) {
  // Verificar que la aplicación pertenece a una práctica de esta empresa
  const application = await prisma.application.findUnique({
    where: { id: data.applicationId },
    include: {
      internship: { include: { company: { select: { userId: true } } } },
    },
  });

  if (!application) throw new Error("Application not found");
  if (application.internship.company.userId !== companyUserId) {
    throw new Error("Not authorized");
  }
  if (application.internshipId !== data.internshipId) {
    throw new Error("Application does not belong to this internship");
  }

  // Verificar que no exista ya entrevista para esta aplicación
  const existing = await prisma.interview.findUnique({
    where: { applicationId: data.applicationId },
  });

  if (existing) {
    const err = new Error(
      "Este candidato ya tiene una entrevista agendada. Puedes editarla.",
    ) as Error & { code: string };
    err.code = "INTERVIEW_ALREADY_EXISTS";
    throw err;
  }

  return prisma.interview.create({
    data: {
      companyId: companyUserId,
      studentId: application.studentId,
      internshipId: data.internshipId,
      applicationId: data.applicationId,
      conversationId: data.conversationId,
      title: data.title,
      scheduledAt: data.scheduledAt,
      durationMins: data.durationMins ?? 60,
      meetingLink: data.meetingLink ?? null,
      notes: data.notes ?? null,
      sentToChat: false,
    },
  });
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function getInterviewsByCompany(
  companyUserId: string,
  filters: {
    from?: Date;
    to?: Date;
    internshipId?: string;
    status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  } = {},
) {
  const where: Prisma.InterviewWhereInput = {
    companyId: companyUserId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.internshipId ? { internshipId: filters.internshipId } : {}),
    ...(filters.from || filters.to
      ? {
          scheduledAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  return prisma.interview.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, image: true, email: true } },
      internship: { select: { id: true, title: true } },
      conversation: { select: { id: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

// ─── Get one ─────────────────────────────────────────────────────────────────

export async function getInterviewById(
  interviewId: string,
  companyUserId: string,
) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      student: { select: { id: true, name: true, image: true } },
      internship: {
        select: {
          id: true,
          title: true,
          company: { select: { companyName: true } },
        },
      },
      conversation: { select: { id: true } },
    },
  });

  if (!interview) throw new Error("Interview not found");
  if (interview.companyId !== companyUserId) throw new Error("Not authorized");

  return interview;
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateInterview(
  interviewId: string,
  companyUserId: string,
  data: {
    title?: string;
    scheduledAt?: Date;
    durationMins?: number;
    meetingLink?: string | null;
    notes?: string | null;
    applicationId?: string;
  },
) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      internship: { include: { company: { select: { userId: true } } } },
    },
  });

  if (!interview) throw new Error("Interview not found");
  if (interview.companyId !== companyUserId) throw new Error("Not authorized");

  const changingCandidate =
    data.applicationId && data.applicationId !== interview.applicationId;

  if (changingCandidate) {
    const newApplication = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: {
        internship: { include: { company: { select: { userId: true } } } },
      },
    });

    if (!newApplication) throw new Error("New application not found");
    if (newApplication.internship.company.userId !== companyUserId) {
      throw new Error("Not authorized for new application");
    }

    // Verificar que el nuevo candidato no tenga ya entrevista
    const existingForNew = await prisma.interview.findFirst({
      where: {
        applicationId: data.applicationId,
        id: { not: interviewId },
        status: "SCHEDULED",
      },
    });

    if (existingForNew) {
      const err = new Error(
        "Este candidato ya tiene una entrevista agendada. Puedes editarla.",
      ) as Error & { code: string };
      err.code = "INTERVIEW_ALREADY_EXISTS";
      throw err;
    }

    // Si ya fue enviada al chat anterior → notificar al candidato anterior
    if (interview.sentToChat) {
      await prisma.message.create({
        data: {
          conversationId: interview.conversationId,
          senderId: companyUserId,
          content:
            "❌ Esta entrevista ha sido reasignada y ya no aplica para ti.",
          type: "TEXT",
        },
      });
    }

    // Obtener la conversación del nuevo candidato
    const newConv = await prisma.conversation.findUnique({
      where: { applicationId: data.applicationId },
    });

    if (!newConv) {
      throw new Error(
        "El nuevo candidato no tiene una conversación activa. Iniciá el chat primero.",
      );
    }

    return prisma.interview.update({
      where: { id: interviewId },
      data: {
        applicationId: data.applicationId,
        studentId: newApplication.studentId,
        conversationId: newConv.id,
        sentToChat: false,
        sentToChatAt: null,
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.scheduledAt !== undefined
          ? { scheduledAt: data.scheduledAt }
          : {}),
        ...(data.durationMins !== undefined
          ? { durationMins: data.durationMins }
          : {}),
        ...(data.meetingLink !== undefined
          ? { meetingLink: data.meetingLink }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  }

  // Solo cambios de fecha/hora/link/notas — no resetear sentToChat
  return prisma.interview.update({
    where: { id: interviewId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.scheduledAt !== undefined
        ? { scheduledAt: data.scheduledAt }
        : {}),
      ...(data.durationMins !== undefined
        ? { durationMins: data.durationMins }
        : {}),
      ...(data.meetingLink !== undefined
        ? { meetingLink: data.meetingLink }
        : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteInterview(
  interviewId: string,
  companyUserId: string,
) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      internship: {
        select: {
          title: true,
          company: { select: { companyName: true } },
        },
      },
    },
  });

  if (!interview) throw new Error("Interview not found");
  if (interview.companyId !== companyUserId) throw new Error("Not authorized");

  // Si ya fue enviada → notificar al candidato
  if (interview.sentToChat) {
    const fecha = new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Santiago",
    }).format(interview.scheduledAt);

    const fechaCapitalizada = fecha.charAt(0).toUpperCase() + fecha.slice(1);

    await prisma.message.create({
      data: {
        conversationId: interview.conversationId,
        senderId: companyUserId,
        content: `❌ Entrevista cancelada\nLa entrevista "${interview.title}" programada para ${fechaCapitalizada} ha sido cancelada.\nLa empresa se pondrá en contacto contigo para reagendar.`,
        type: "TEXT",
      },
    });
  }

  await prisma.interview.delete({ where: { id: interviewId } });
}

// ─── Send to chat ────────────────────────────────────────────────────────────

export async function sendInterviewToChat(
  interviewId: string,
  companyUserId: string,
) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      internship: {
        include: { company: { select: { companyName: true } } },
      },
    },
  });

  if (!interview) throw new Error("Interview not found");
  if (interview.companyId !== companyUserId) throw new Error("Not authorized");

  const isUpdate = interview.sentToChat;
  const content = formatInterviewMessage(
    {
      title: interview.title,
      scheduledAt: interview.scheduledAt,
      durationMins: interview.durationMins,
      meetingLink: interview.meetingLink,
      notes: interview.notes,
      internship: {
        title: interview.internship.title,
        company: { companyName: interview.internship.company.companyName },
      },
    },
    isUpdate,
  );

  const metadata = {
    interviewId: interview.id,
    type: "INTERVIEW_SCHEDULED",
  };

  const [message, updated] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: interview.conversationId,
        senderId: companyUserId,
        content,
        type: "INTERVIEW",
        metadata,
      },
      include: {
        sender: { select: { id: true, name: true, image: true, role: true } },
      },
    }),
    prisma.interview.update({
      where: { id: interviewId },
      data: {
        sentToChat: true,
        sentToChatAt: new Date(),
      },
    }),
    prisma.conversation.update({
      where: { id: interview.conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return { message, interview: updated };
}

// ─── Available candidates ────────────────────────────────────────────────────

export async function getAvailableCandidates(
  internshipId: string,
  companyUserId: string,
) {
  // Verificar que la práctica pertenece a esta empresa
  const internship = await prisma.internship.findUnique({
    where: { id: internshipId },
    include: { company: { select: { userId: true } } },
  });

  if (!internship) throw new Error("Internship not found");
  if (internship.company.userId !== companyUserId) {
    throw new Error("Not authorized");
  }

  // Candidatos en INTERVIEW que no tienen entrevista SCHEDULED
  const applications = await prisma.application.findMany({
    where: {
      internshipId,
      pipelineStatus: "INTERVIEW",
      interview: { is: null },
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      conversation: { select: { id: true } },
    },
  });

  return applications.map((app) => ({
    applicationId: app.id,
    conversationId: app.conversation?.id ?? null,
    student: app.student,
  }));
}

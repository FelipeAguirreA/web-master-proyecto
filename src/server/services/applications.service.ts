import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/server/lib/db";
import { calculateMatchScore } from "@/server/lib/embeddings";
import {
  sendNewApplicationEmail,
  sendStatusUpdateEmail,
} from "@/server/lib/mail";

export async function applyToInternship(
  studentUserId: string,
  internshipId: string,
  coverLetter?: string,
) {
  const internship = await prisma.internship.findUnique({
    where: { id: internshipId },
    include: {
      company: { include: { user: { select: { email: true, name: true } } } },
    },
  });

  if (!internship) throw new Error("Internship not found");
  if (!internship.isActive) throw new Error("Internship is not active");

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: studentUserId },
    });

    const studentUser = await prisma.user.findUnique({
      where: { id: studentUserId },
      select: { name: true },
    });

    let matchScore: number | null = null;
    if (student?.embedding.length && internship.embedding.length) {
      matchScore = calculateMatchScore(student.embedding, internship.embedding);
    }

    const application = await prisma.application.create({
      data: {
        studentId: studentUserId,
        internshipId,
        coverLetter,
        matchScore,
      },
    });

    // Email no bloqueante. Si falla, va a Sentry con tag para alertas.
    sendNewApplicationEmail(
      internship.company.user.email,
      internship.company.companyName,
      studentUser?.name ?? "Un estudiante",
      internship.title,
    ).catch((err) =>
      Sentry.captureException(err, {
        tags: { mail: "new_application" },
        extra: { internshipId, studentUserId },
      }),
    );

    return application;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      throw new Error("Already applied");
    }
    throw error;
  }
}

export async function getMyApplications(studentUserId: string) {
  return prisma.application.findMany({
    where: { studentId: studentUserId },
    include: {
      internship: {
        select: {
          id: true,
          title: true,
          description: true,
          area: true,
          location: true,
          modality: true,
          duration: true,
          requirements: true,
          skills: true,
          isActive: true,
          createdAt: true,
          company: { select: { companyName: true, logo: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApplicantsByInternship(
  internshipId: string,
  companyUserId: string,
) {
  const company = await prisma.companyProfile.findUnique({
    where: { userId: companyUserId },
  });

  if (!company) throw new Error("Not found or not authorized");

  const internship = await prisma.internship.findFirst({
    where: { id: internshipId, companyId: company.id },
  });

  if (!internship) throw new Error("Not found or not authorized");

  return prisma.application.findMany({
    where: { internshipId },
    include: {
      student: {
        select: {
          name: true,
          email: true,
          image: true,
          studentProfile: true,
        },
      },
    },
    orderBy: { matchScore: "desc" },
  });
}

// Resuelve la application sólo si pertenece a una internship de la company
// del companyUserId. Devuelve null si no existe o si no es del owner —
// los callers traducen ambos casos al mismo error "Not found or not authorized"
// para no leak de existence.
async function findOwnedApplication(
  applicationId: string,
  companyUserId: string,
) {
  const company = await prisma.companyProfile.findUnique({
    where: { userId: companyUserId },
    select: { id: true },
  });
  if (!company) return null;

  return prisma.application.findFirst({
    where: { id: applicationId, internship: { companyId: company.id } },
    include: {
      internship: { select: { title: true } },
      student: { select: { email: true, name: true } },
    },
  });
}

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  companyUserId: string,
) {
  const existing = await findOwnedApplication(applicationId, companyUserId);
  if (!existing) throw new Error("Not found or not authorized");

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: status as "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED",
      ...(status === "ACCEPTED" ? { pipelineStatus: "INTERVIEW" } : {}),
      ...(status === "REJECTED" ? { pipelineStatus: "REJECTED" } : {}),
    },
  });

  // Crear notificación para el estudiante
  const notificationMap: Record<string, { title: string; body: string }> = {
    REVIEWED: {
      title: "Tu postulación está en revisión",
      body: `Tu postulación a "${existing.internship.title}" está siendo revisada por la empresa.`,
    },
    ACCEPTED: {
      title: "¡Postulación aprobada! 🎉",
      body: `Tu postulación a "${existing.internship.title}" fue aprobada. La empresa te contactará pronto.`,
    },
    REJECTED: {
      title: "Postulación rechazada",
      body: `Tu postulación a "${existing.internship.title}" no fue seleccionada en esta oportunidad.`,
    },
  };

  const notif = notificationMap[status];
  if (notif) {
    await prisma.notification.create({
      data: {
        userId: existing.studentId,
        type: `APPLICATION_${status}` as
          | "APPLICATION_REVIEWED"
          | "APPLICATION_ACCEPTED"
          | "APPLICATION_REJECTED",
        title: notif.title,
        body: notif.body,
        entityId: applicationId,
      },
    });
  }

  return updated;
}

export async function notifyRejectedApplication(
  applicationId: string,
  companyUserId: string,
) {
  const app = await findOwnedApplication(applicationId, companyUserId);
  if (!app) throw new Error("Not found or not authorized");
  if (app.status !== "REJECTED")
    throw new Error("La postulación no está rechazada");

  await sendStatusUpdateEmail(
    app.student.email,
    app.student.name,
    app.internship.title,
    "REJECTED",
  );
}

export async function notifyAcceptedApplication(
  applicationId: string,
  companyUserId: string,
) {
  const app = await findOwnedApplication(applicationId, companyUserId);
  if (!app) throw new Error("Not found or not authorized");
  if (app.status !== "ACCEPTED")
    throw new Error("La postulación no está aceptada");

  await sendStatusUpdateEmail(
    app.student.email,
    app.student.name,
    app.internship.title,
    "ACCEPTED",
  );
}

import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/server/lib/db";
import { calculateHybridMatchScore } from "@/server/lib/embeddings";
import { sendNewApplicationEmail } from "@/server/lib/mail";

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

  if (!internship || internship.deletedAt)
    throw new Error("Internship not found");
  if (!internship.isActive) throw new Error("Internship is not active");

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: studentUserId },
    });

    const studentUser = await prisma.user.findUnique({
      where: { id: studentUserId },
      select: { name: true },
    });

    // Score híbrido: combina similitud semántica del CV (70%) con overlap
    // de skills declaradas en el perfil (30%). Estudiantes sin CV pero
    // con skills declaradas pueden obtener score > 0 — antes era 0.
    // matchScore queda null si no hay NADA con qué calcular (sin CV ni
    // skills declaradas), para distinguir "no calculable" de "calculé 0%".
    const hasEmbedding =
      (student?.embedding.length ?? 0) > 0 && internship.embedding.length > 0;
    const hasSkillsInfo =
      (student?.skills.length ?? 0) > 0 && internship.skills.length > 0;
    const matchScore =
      hasEmbedding || hasSkillsInfo
        ? calculateHybridMatchScore(
            student?.embedding ?? [],
            internship.embedding,
            student?.skills ?? [],
            internship.skills,
          )
        : null;

    const application = await prisma.application.create({
      data: {
        studentId: studentUserId,
        internshipId,
        coverLetter,
        matchScore,
      },
    });

    // Notificación in-app para la empresa (campanita del topbar).
    await prisma.notification.create({
      data: {
        userId: internship.company.userId,
        type: "NEW_APPLICATION",
        title: "Nueva postulación",
        body: `${studentUser?.name ?? "Un estudiante"} postuló a "${internship.title}".`,
        entityId: application.id,
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
      // Interview programada (1:1). El dashboard estudiante la usa para
      // mostrar "Próxima entrevista" con fecha/hora real.
      interview: {
        select: {
          id: true,
          scheduledAt: true,
          durationMins: true,
          meetingLink: true,
          status: true,
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

  // No filtramos deletedAt acá: el ATS de una práctica eliminada debe seguir
  // mostrando aplicaciones existentes (historial preservado). Si la práctica
  // fue soft-deleted, la empresa puede volver a verla en la tab "Eliminadas".
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

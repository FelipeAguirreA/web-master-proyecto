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

    sendNewApplicationEmail(
      internship.company.user.email,
      internship.company.companyName,
      studentUser?.name ?? "Un estudiante",
      internship.title,
    ).catch(console.error);

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

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
) {
  const existing = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      internship: { select: { title: true } },
      student: { select: { email: true, name: true } },
    },
  });

  if (!existing) throw new Error("Application not found");

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: status as "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED",
    },
  });

  // Emails de ACCEPTED y REJECTED los dispara la empresa manualmente

  return updated;
}

export async function notifyRejectedApplication(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      internship: { select: { title: true } },
      student: { select: { email: true, name: true } },
    },
  });

  if (!app) throw new Error("Application not found");
  if (app.status !== "REJECTED")
    throw new Error("La postulación no está rechazada");

  await sendStatusUpdateEmail(
    app.student.email,
    app.student.name,
    app.internship.title,
    "REJECTED",
  );
}

export async function notifyAcceptedApplication(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      internship: { select: { title: true } },
      student: { select: { email: true, name: true } },
    },
  });

  if (!app) throw new Error("Application not found");
  if (app.status !== "ACCEPTED")
    throw new Error("La postulación no está aceptada");

  await sendStatusUpdateEmail(
    app.student.email,
    app.student.name,
    app.internship.title,
    "ACCEPTED",
  );
}

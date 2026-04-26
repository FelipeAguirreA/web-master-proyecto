import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const DOCKER_DB =
  process.env.INTEGRATION_DB_URL ??
  "postgresql://practix:practix@localhost:5433/practix";

const pool = new Pool({ connectionString: DOCKER_DB });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function truncateAll() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "interviews",
      "messages",
      "conversations",
      "ats_modules",
      "ats_configs",
      "applications",
      "internships",
      "company_profiles",
      "student_profiles",
      "notifications",
      "refresh_tokens",
      "users"
    RESTART IDENTITY CASCADE;
  `);
}

async function makeStudent(suffix: string) {
  return prisma.user.create({
    data: {
      email: `student-${suffix}@test.local`,
      name: "Student",
      role: "STUDENT",
      studentProfile: { create: {} },
    },
    include: { studentProfile: true },
  });
}

async function makeCompany(suffix: string) {
  return prisma.user.create({
    data: {
      email: `company-${suffix}@test.local`,
      name: "Company Owner",
      role: "COMPANY",
      passwordHash: await bcrypt.hash("Test1234!", 10),
      companyProfile: {
        create: { companyName: `Company ${suffix}`, companyStatus: "APPROVED" },
      },
    },
    include: { companyProfile: true },
  });
}

async function makeInternship(companyProfileId: string) {
  return prisma.internship.create({
    data: {
      companyId: companyProfileId,
      title: "Test internship",
      description: "...",
      area: "Tech",
      location: "Remote",
      modality: "REMOTE",
      duration: "3m",
      requirements: [],
      skills: [],
      embedding: [],
    },
  });
}

async function makeApplication(studentId: string, internshipId: string) {
  return prisma.application.create({
    data: { studentId, internshipId },
  });
}

async function makeConversation(
  companyId: string,
  studentId: string,
  applicationId: string,
) {
  return prisma.conversation.create({
    data: { companyId, studentId, applicationId },
  });
}

async function makeMessage(conversationId: string, senderId: string) {
  return prisma.message.create({
    data: { conversationId, senderId, content: "hi" },
  });
}

async function makeInterview(args: {
  companyId: string;
  studentId: string;
  internshipId: string;
  applicationId: string;
  conversationId: string;
}) {
  return prisma.interview.create({
    data: {
      ...args,
      title: "Tech interview",
      scheduledAt: new Date(Date.now() + 86400000),
    },
  });
}

describe("FK cascade policy (DB integration)", () => {
  beforeEach(truncateAll);
  afterAll(async () => {
    await truncateAll();
    await prisma.$disconnect();
  });

  it("delete student User cascades application + conversation + message + interview", async () => {
    const company = await makeCompany("scenario1");
    const student = await makeStudent("scenario1");
    const internship = await makeInternship(company.companyProfile!.id);
    const application = await makeApplication(student.id, internship.id);
    const conversation = await makeConversation(
      company.id,
      student.id,
      application.id,
    );
    await makeMessage(conversation.id, student.id);
    await makeInterview({
      companyId: company.id,
      studentId: student.id,
      internshipId: internship.id,
      applicationId: application.id,
      conversationId: conversation.id,
    });

    await prisma.user.delete({ where: { id: student.id } });

    expect(await prisma.application.count()).toBe(0);
    expect(await prisma.conversation.count()).toBe(0);
    expect(await prisma.message.count()).toBe(0);
    expect(await prisma.interview.count()).toBe(0);
    expect(await prisma.user.count({ where: { id: company.id } })).toBe(1);
  });

  it("delete company User cascades companyProfile + internship + application + conversation + interview", async () => {
    const company = await makeCompany("scenario2");
    const student = await makeStudent("scenario2");
    const internship = await makeInternship(company.companyProfile!.id);
    const application = await makeApplication(student.id, internship.id);
    const conversation = await makeConversation(
      company.id,
      student.id,
      application.id,
    );
    await makeInterview({
      companyId: company.id,
      studentId: student.id,
      internshipId: internship.id,
      applicationId: application.id,
      conversationId: conversation.id,
    });

    await prisma.user.delete({ where: { id: company.id } });

    expect(await prisma.companyProfile.count()).toBe(0);
    expect(await prisma.internship.count()).toBe(0);
    expect(await prisma.application.count()).toBe(0);
    expect(await prisma.conversation.count()).toBe(0);
    expect(await prisma.interview.count()).toBe(0);
    expect(await prisma.user.count({ where: { id: student.id } })).toBe(1);
  });

  it("delete Internship cascades application + interview + atsConfig + atsModules", async () => {
    const company = await makeCompany("scenario3");
    const student = await makeStudent("scenario3");
    const internship = await makeInternship(company.companyProfile!.id);
    const application = await makeApplication(student.id, internship.id);
    const conversation = await makeConversation(
      company.id,
      student.id,
      application.id,
    );
    await makeInterview({
      companyId: company.id,
      studentId: student.id,
      internshipId: internship.id,
      applicationId: application.id,
      conversationId: conversation.id,
    });
    await prisma.aTSConfig.create({
      data: {
        internshipId: internship.id,
        modules: {
          create: [
            {
              type: "SKILLS",
              label: "Skills",
              weight: 50,
              order: 0,
              params: {},
            },
          ],
        },
      },
    });

    await prisma.internship.delete({ where: { id: internship.id } });

    expect(await prisma.application.count()).toBe(0);
    expect(await prisma.interview.count()).toBe(0);
    expect(await prisma.aTSConfig.count()).toBe(0);
    expect(await prisma.aTSModule.count()).toBe(0);
  });

  it("delete Application cascades conversation + message + interview", async () => {
    const company = await makeCompany("scenario4");
    const student = await makeStudent("scenario4");
    const internship = await makeInternship(company.companyProfile!.id);
    const application = await makeApplication(student.id, internship.id);
    const conversation = await makeConversation(
      company.id,
      student.id,
      application.id,
    );
    await makeMessage(conversation.id, student.id);
    await makeInterview({
      companyId: company.id,
      studentId: student.id,
      internshipId: internship.id,
      applicationId: application.id,
      conversationId: conversation.id,
    });

    await prisma.application.delete({ where: { id: application.id } });

    expect(await prisma.conversation.count()).toBe(0);
    expect(await prisma.message.count()).toBe(0);
    expect(await prisma.interview.count()).toBe(0);
  });

  it("delete sender User sets Message.senderId to NULL without removing conversation", async () => {
    const company = await makeCompany("scenario5");
    const student = await makeStudent("scenario5");
    const ghost = await makeStudent("scenario5-ghost");
    const internship = await makeInternship(company.companyProfile!.id);
    const application = await makeApplication(student.id, internship.id);
    const conversation = await makeConversation(
      company.id,
      student.id,
      application.id,
    );
    await makeMessage(conversation.id, ghost.id);

    await prisma.user.delete({ where: { id: ghost.id } });

    const msgs = await prisma.message.findMany();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].senderId).toBeNull();
    expect(await prisma.conversation.count()).toBe(1);
    expect(await prisma.user.count({ where: { id: student.id } })).toBe(1);
  });

  it("delete company User with active Interview no longer blocks (regression for pre-fix deadlock)", async () => {
    const company = await makeCompany("scenario6");
    const student = await makeStudent("scenario6");
    const internship = await makeInternship(company.companyProfile!.id);
    const application = await makeApplication(student.id, internship.id);
    const conversation = await makeConversation(
      company.id,
      student.id,
      application.id,
    );
    await makeInterview({
      companyId: company.id,
      studentId: student.id,
      internshipId: internship.id,
      applicationId: application.id,
      conversationId: conversation.id,
    });

    await expect(
      prisma.user.delete({ where: { id: company.id } }),
    ).resolves.toBeTruthy();

    expect(await prisma.interview.count()).toBe(0);
  });
});

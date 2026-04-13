import { prisma } from "@/server/lib/db";
import type { z } from "zod";
import type {
  studentProfileSchema,
  companyProfileSchema,
} from "@/server/validators";

type StudentProfileInput = z.infer<typeof studentProfileSchema>;
type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

export async function getUserWithProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true, companyProfile: true },
  });
}

export async function updateStudentProfile(
  userId: string,
  data: StudentProfileInput,
) {
  return prisma.studentProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function updateCompanyProfile(
  userId: string,
  data: CompanyProfileInput,
) {
  return prisma.companyProfile.update({
    where: { userId },
    data,
  });
}

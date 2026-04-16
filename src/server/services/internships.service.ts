import { prisma } from "@/server/lib/db";
import { generateEmbedding } from "@/server/lib/embeddings";
import type { z } from "zod";
import type {
  filterInternshipSchema,
  createInternshipSchema,
} from "@/server/validators";

type ListFilters = z.infer<typeof filterInternshipSchema>;
type InternshipData = z.infer<typeof createInternshipSchema>;

export async function listInternships(filters: ListFilters) {
  const { area, location, modality, search, page, limit } = filters;

  const where: Record<string, unknown> = {
    isActive: true,
    company: { companyStatus: "APPROVED" },
  };

  if (area) where.area = area;
  if (location) where.location = { contains: location, mode: "insensitive" };
  if (modality) where.modality = modality;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.internship.findMany({
      where,
      include: {
        company: {
          select: {
            companyName: true,
            logo: true,
            user: { select: { image: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.internship.count({ where }),
  ]);

  // Normalizar logo: preferir CompanyProfile.logo, caer en User.image
  const internships = rows.map(({ company, ...rest }) => ({
    ...rest,
    company: {
      companyName: company.companyName,
      logo: company.logo ?? company.user.image ?? null,
    },
  }));

  return {
    internships,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getInternshipById(id: string) {
  return prisma.internship.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          companyName: true,
          logo: true,
          industry: true,
          website: true,
        },
      },
    },
  });
}

export async function createInternship(
  companyUserId: string,
  data: InternshipData,
) {
  const company = await prisma.companyProfile.findUnique({
    where: { userId: companyUserId },
  });

  if (!company) throw new Error("Company profile required");

  const textForEmbedding = `${data.title} ${data.description} ${data.skills.join(" ")}`;
  const embedding = await generateEmbedding(textForEmbedding);

  return prisma.internship.create({
    data: {
      ...data,
      companyId: company.id,
      embedding,
    },
  });
}

export async function updateInternship(
  internshipId: string,
  companyUserId: string,
  data: Partial<InternshipData> & { isActive?: boolean },
) {
  const company = await prisma.companyProfile.findUnique({
    where: { userId: companyUserId },
  });

  if (!company) throw new Error("Not found or not authorized");

  const existing = await prisma.internship.findFirst({
    where: { id: internshipId, companyId: company.id },
  });

  if (!existing) throw new Error("Not found or not authorized");

  return prisma.internship.update({
    where: { id: internshipId },
    data,
  });
}

export async function deleteInternship(
  internshipId: string,
  companyUserId: string,
) {
  const company = await prisma.companyProfile.findUnique({
    where: { userId: companyUserId },
  });

  if (!company) throw new Error("Not found or not authorized");

  const existing = await prisma.internship.findFirst({
    where: { id: internshipId, companyId: company.id },
  });

  if (!existing) throw new Error("Not found or not authorized");

  await prisma.internship.delete({
    where: { id: internshipId },
  });

  return { success: true };
}

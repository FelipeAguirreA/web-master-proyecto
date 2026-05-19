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
    deletedAt: null,
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

export async function getInternshipById(id: string, ownerUserId?: string) {
  // #E1 — espejo del filtro del listado: una práctica soft-deleted o de empresa
  // PENDING/REJECTED debe ser invisible incluso accediendo por ID directo
  // PARA EL PÚBLICO. El owner sí puede ver siempre su propia práctica
  // (ej. empresa PENDING navegando al ATS de una práctica que publicó).
  const publicVisible = {
    id,
    isActive: true,
    deletedAt: null,
    company: { is: { companyStatus: "APPROVED" as const } },
  };
  // El owner ve SIEMPRE sus prácticas — incluso eliminadas (deletedAt!=null) y
  // pendientes (companyStatus PENDING). Esto habilita la tab "Eliminadas" del
  // dashboard como archivo histórico: la empresa puede entrar al detalle y al
  // ATS de una práctica borrada para revisar postulantes pasados, descripción,
  // skills, etc. Las acciones destructivas (update/apply/score) sí filtran
  // deletedAt en sus propios services.
  const ownedByMe = ownerUserId
    ? { id, company: { is: { userId: ownerUserId } } }
    : null;

  return prisma.internship.findFirst({
    where: ownedByMe ? { OR: [publicVisible, ownedByMe] } : publicVisible,
    include: {
      company: {
        select: {
          companyName: true,
          logo: true,
          industry: true,
          website: true,
          description: true,
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

  // #E4 — defensa en profundidad: el dashboard avisa visualmente cuando la empresa
  // está PENDING/REJECTED, pero el backend NO bloqueaba el POST. Sin este gate, una
  // empresa no aprobada puede crear N internships (waste de embeddings + bypass del
  // flow de moderación si después la aprueban).
  if (company.companyStatus !== "APPROVED") {
    throw new Error("Company not approved");
  }

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

// Mensaje literal que el route mapea a 409. Igual que NOT_FOUND_MESSAGE en
// route.ts, es la ÚNICA cadena segura para propagar al cliente.
export const APPLICATIONS_EXIST_MESSAGE = "Cannot edit: applications exist";

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
    where: { id: internshipId, companyId: company.id, deletedAt: null },
  });

  if (!existing) throw new Error("Not found or not authorized");

  // Gate: solo permitimos editar contenido (no toggles isActive solos) si NO
  // hay postulantes. Cualquier postulante ya fue scoreado contra el embedding
  // actual y leyó la descripción/skills actuales — cambiarlas ahora es injusto.
  // El toggle de isActive (finalizar/reactivar) NO entra en este gate: es una
  // acción de gestión, no edita la práctica en sí.
  const isContentEdit = Object.keys(data).some((k) => k !== "isActive");
  if (isContentEdit) {
    const applicationsCount = await prisma.application.count({
      where: { internshipId },
    });
    if (applicationsCount > 0) {
      throw new Error(APPLICATIONS_EXIST_MESSAGE);
    }
  }

  // Si cambiaron title/description/skills hay que regenerar el embedding —
  // sino los nuevos postulantes se scorean contra el vector viejo (que ya no
  // refleja la práctica real).
  //
  // Diff REAL contra `existing`: el frontend manda todos los campos del form
  // en cada PUT (no solo los modificados), así que un `!== undefined` no
  // alcanza — comparamos valor contra el actual en DB. Para skills usamos
  // JSON.stringify porque el embedding text incluye `skills.join(" ")`, así
  // que un reorder también cuenta como cambio real.
  const titleChanged =
    data.title !== undefined && data.title !== existing.title;
  const descriptionChanged =
    data.description !== undefined && data.description !== existing.description;
  const skillsChanged =
    data.skills !== undefined &&
    JSON.stringify(data.skills) !== JSON.stringify(existing.skills);

  const needsReembed =
    isContentEdit && (titleChanged || descriptionChanged || skillsChanged);

  let embedding: number[] | undefined;
  if (needsReembed) {
    const title = data.title ?? existing.title;
    const description = data.description ?? existing.description;
    const skills = data.skills ?? existing.skills;
    embedding = await generateEmbedding(
      `${title} ${description} ${skills.join(" ")}`,
    );
  }

  return prisma.internship.update({
    where: { id: internshipId },
    data: embedding ? { ...data, embedding } : data,
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
    where: { id: internshipId, companyId: company.id, deletedAt: null },
  });

  if (!existing) throw new Error("Not found or not authorized");

  // Soft delete real: setea deletedAt para distinguir "eliminada" de "finalizada"
  // (isActive=false). Las cascadas FK siguen intactas — el día que querramos
  // purge físico, basta con un cron que haga prisma.internship.deleteMany sobre
  // deletedAt < now() - 90d.
  await prisma.internship.update({
    where: { id: internshipId },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}

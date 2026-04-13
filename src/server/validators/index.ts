import { z } from "zod";

function validarRUT(rut: string): boolean {
  const limpio = rut.replace(/[.\s]/g, "").toUpperCase();
  const match = limpio.match(/^(\d{7,8})-?([0-9K])$/);
  if (!match) return false;
  const cuerpo = match[1];
  const dv = match[2];
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dv === dvEsperado;
}

function validarTelefono(tel: string): boolean {
  const limpio = tel.replace(/[\s\-]/g, "");
  return /^(\+56)?9\d{8}$/.test(limpio);
}

export function normalizarRUT(rut: string): string {
  const limpio = rut.replace(/[.\s]/g, "").toUpperCase();
  const match = limpio.match(/^(\d{7,8})-?([0-9K])$/);
  if (!match) return rut;
  return `${match[1]}-${match[2]}`;
}

export const registrationSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
    rut: z.string().min(1, "El documento es obligatorio"),
    documentType: z.enum(["rut", "passport"]).default("rut"),
    phone: z.string().min(1, "El teléfono es obligatorio"),
  })
  .superRefine((data, ctx) => {
    if (data.documentType === "rut" && !validarRUT(data.rut)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RUT chileno inválido",
        path: ["rut"],
      });
    }
    if (
      data.documentType === "passport" &&
      !/^[A-Z0-9]{6,20}$/i.test(data.rut.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Documento inválido (6–20 caracteres alfanuméricos)",
        path: ["rut"],
      });
    }
    if (!validarTelefono(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Teléfono inválido",
        path: ["phone"],
      });
    }
  });

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["STUDENT", "COMPANY"]),
  provider: z.string().optional(),
  providerId: z.string().optional(),
  image: z.string().url().optional(),
});

export const studentProfileSchema = z.object({
  university: z.string().optional(),
  career: z.string().optional(),
  semester: z.number().int().min(1).max(16).optional(),
  skills: z.array(z.string()).optional(),
  bio: z.string().max(500).optional(),
});

export const companyProfileSchema = z.object({
  companyName: z.string().min(2),
  industry: z.string().optional(),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
});

export const createInternshipSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
  area: z.string(),
  location: z.string(),
  modality: z.enum(["REMOTE", "ONSITE", "HYBRID"]),
  duration: z.string(),
  requirements: z.array(z.string()),
  skills: z.array(z.string()),
});

export const filterInternshipSchema = z.object({
  area: z.string().optional(),
  location: z.string().optional(),
  modality: z.enum(["REMOTE", "ONSITE", "HYBRID"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const applySchema = z.object({
  internshipId: z.string(),
  coverLetter: z.string().max(2000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["REVIEWED", "ACCEPTED", "REJECTED"]),
});

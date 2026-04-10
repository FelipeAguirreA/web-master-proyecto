import { z } from "zod";

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

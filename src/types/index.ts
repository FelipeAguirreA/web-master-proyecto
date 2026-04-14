import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      registrationCompleted: boolean;
      companyStatus?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    registrationCompleted: boolean;
    companyStatus?: string;
  }
}

// App types

export interface User {
  id: string;
  email: string;
  name: string;
  lastName?: string | null;
  rut?: string | null;
  phone?: string | null;
  role: "STUDENT" | "COMPANY";
  image?: string | null;
  provider?: string | null;
  providerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile {
  id: string;
  userId: string;
  university?: string | null;
  career?: string | null;
  semester?: number | null;
  skills: string[];
  bio?: string | null;
  cvUrl?: string | null;
  cvText?: string | null;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyProfile {
  id: string;
  userId: string;
  companyName: string;
  industry?: string | null;
  website?: string | null;
  logo?: string | null;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Internship {
  id: string;
  companyId: string;
  title: string;
  description: string;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  requirements: string[];
  skills: string[];
  embedding: number[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Application {
  id: string;
  studentId: string;
  internshipId: string;
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
  matchScore?: number | null;
  coverLetter?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

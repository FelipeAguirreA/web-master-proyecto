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
//
// Tipos compartidos del shape público del proyecto. Solo se mantienen los
// realmente importados externamente — los tipos `User`, `StudentProfile`,
// `CompanyProfile`, `PaginatedResponse` se eliminaron en 1.10.18 (Fase 4) tras
// confirmar con knip que ningún módulo los importaba.

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
  pipelineStatus?: "PENDING" | "REVIEWING" | "INTERVIEW" | "REJECTED";
  matchScore?: number | null;
  coverLetter?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CompanyStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type Internship = {
  id: string;
  title: string;
  area: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  isActive: boolean;
};

export type CompanyProfile = {
  id: string;
  companyName: string;
  empresaRut: string | null;
  industry: string | null;
  website: string | null;
  logo: string | null;
  description: string | null;
  companyStatus: CompanyStatus;
  createdAt: string;
  updatedAt: string;
  internships?: Internship[];
};

export type UserMe = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  companyProfile: CompanyProfile | null;
};

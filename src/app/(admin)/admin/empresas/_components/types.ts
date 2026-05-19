export type CompanyStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type Company = {
  id: string;
  companyName: string;
  empresaRut: string | null;
  companyStatus: CompanyStatus;
  industry: string | null;
  website: string | null;
  logo: string | null;
  description: string | null;
  suspensionReason: string | null;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { internships: number };
  user: {
    id: string;
    email: string;
    name: string | null;
    lastName: string | null;
    phone: string | null;
    createdAt: string;
  };
};

export type TabKey = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type Risk = "low" | "medium" | "high";

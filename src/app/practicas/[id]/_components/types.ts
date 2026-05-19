export type InternshipDetail = {
  id: string;
  title: string;
  description: string;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  responsibilities?: string[];
  requirements: string[];
  skills: string[];
  createdAt: string;
  company: {
    companyName: string;
    logo: string | null;
    industry: string | null;
    website: string | null;
    description: string | null;
  };
};

// Catálogo de skills comunes. Cada entry tiene un canónico + aliases para
// matchear variantes en el texto del CV. Los aliases se buscan como palabras
// completas case-insensitive — evitamos matchear "go" dentro de "google".

type SkillEntry = {
  canonical: string;
  aliases: string[];
};

const CATALOG: SkillEntry[] = [
  // Lenguajes / técnicos
  { canonical: "Python", aliases: ["python", "pandas", "numpy"] },
  { canonical: "JavaScript", aliases: ["javascript", "js", "ecmascript"] },
  { canonical: "TypeScript", aliases: ["typescript", "ts"] },
  { canonical: "Java", aliases: ["java"] },
  { canonical: "C++", aliases: ["c++", "cpp"] },
  { canonical: "C#", aliases: ["c#", "csharp", ".net"] },
  { canonical: "Go", aliases: ["golang"] },
  { canonical: "Rust", aliases: ["rust"] },
  { canonical: "Ruby", aliases: ["ruby", "rails"] },
  { canonical: "PHP", aliases: ["php", "laravel"] },
  { canonical: "Kotlin", aliases: ["kotlin"] },
  { canonical: "Swift", aliases: ["swift"] },
  { canonical: "R", aliases: ["rstudio", "r-studio"] },
  {
    canonical: "SQL",
    aliases: ["sql", "tsql", "plsql", "mysql", "postgresql", "postgres"],
  },
  { canonical: "NoSQL", aliases: ["nosql", "mongodb", "mongo"] },
  { canonical: "HTML", aliases: ["html", "html5"] },
  { canonical: "CSS", aliases: ["css", "css3", "scss", "sass", "less"] },

  // Frontend
  { canonical: "React", aliases: ["react", "react.js", "reactjs"] },
  { canonical: "Next.js", aliases: ["next.js", "nextjs", "next js"] },
  { canonical: "Vue", aliases: ["vue", "vue.js", "vuejs"] },
  { canonical: "Angular", aliases: ["angular", "angularjs"] },
  { canonical: "Svelte", aliases: ["svelte"] },
  { canonical: "Tailwind", aliases: ["tailwind", "tailwindcss"] },

  // Backend
  { canonical: "Node.js", aliases: ["node", "node.js", "nodejs"] },
  { canonical: "Express", aliases: ["express", "expressjs"] },
  { canonical: "Django", aliases: ["django"] },
  { canonical: "Flask", aliases: ["flask"] },
  { canonical: "FastAPI", aliases: ["fastapi"] },
  { canonical: "Spring", aliases: ["spring", "spring boot", "springboot"] },

  // DevOps / Cloud
  { canonical: "Docker", aliases: ["docker"] },
  { canonical: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { canonical: "AWS", aliases: ["aws", "amazon web services"] },
  { canonical: "Azure", aliases: ["azure"] },
  { canonical: "GCP", aliases: ["gcp", "google cloud"] },
  { canonical: "Vercel", aliases: ["vercel"] },
  { canonical: "Git", aliases: ["git", "github", "gitlab"] },
  {
    canonical: "CI/CD",
    aliases: ["ci/cd", "cicd", "jenkins", "github actions"],
  },
  { canonical: "Terraform", aliases: ["terraform"] },
  { canonical: "Linux", aliases: ["linux", "ubuntu", "debian"] },

  // Data / Analytics
  { canonical: "Excel", aliases: ["excel", "microsoft excel"] },
  { canonical: "Power BI", aliases: ["power bi", "powerbi"] },
  { canonical: "Tableau", aliases: ["tableau"] },
  { canonical: "Looker", aliases: ["looker", "looker studio", "data studio"] },
  { canonical: "Google Analytics", aliases: ["google analytics", "ga4", "ga"] },
  { canonical: "Big Data", aliases: ["big data", "hadoop", "spark"] },
  {
    canonical: "Machine Learning",
    aliases: ["machine learning", "ml", "tensorflow", "pytorch", "scikit"],
  },
  { canonical: "Deep Learning", aliases: ["deep learning", "neural network"] },
  {
    canonical: "Estadística",
    aliases: ["estadística", "statistics", "estadistica"],
  },
  {
    canonical: "Econometría",
    aliases: ["econometría", "econometrics", "econometria"],
  },

  // Diseño / Producto
  { canonical: "Figma", aliases: ["figma"] },
  { canonical: "Adobe XD", aliases: ["adobe xd", "xd"] },
  { canonical: "Photoshop", aliases: ["photoshop", "ps"] },
  { canonical: "Illustrator", aliases: ["illustrator", "ai"] },
  { canonical: "Sketch", aliases: ["sketch"] },
  { canonical: "Diseño UX", aliases: ["ux", "ux design", "user experience"] },
  { canonical: "Diseño UI", aliases: ["ui", "ui design", "user interface"] },
  {
    canonical: "Research",
    aliases: ["user research", "ux research", "investigación de usuarios"],
  },
  {
    canonical: "Prototipado",
    aliases: ["prototype", "prototipado", "wireframe", "wireframing"],
  },
  {
    canonical: "Product Management",
    aliases: ["product management", "pm", "product manager"],
  },

  // Marketing / Comercial
  {
    canonical: "Marketing Digital",
    aliases: ["marketing digital", "digital marketing"],
  },
  { canonical: "SEO", aliases: ["seo"] },
  { canonical: "SEM", aliases: ["sem", "google ads", "adwords"] },
  {
    canonical: "Growth",
    aliases: ["growth", "growth marketing", "growth hacking"],
  },
  {
    canonical: "Content",
    aliases: ["content marketing", "copywriting", "redacción"],
  },
  {
    canonical: "Social Media",
    aliases: ["social media", "instagram", "tiktok", "redes sociales"],
  },
  { canonical: "Email Marketing", aliases: ["email marketing", "mailchimp"] },
  { canonical: "CRM", aliases: ["crm", "hubspot", "salesforce"] },
  {
    canonical: "E-commerce",
    aliases: ["e-commerce", "ecommerce", "shopify", "vtex"],
  },

  // Finanzas / Negocio
  { canonical: "Finanzas", aliases: ["finanzas", "finance", "financiero"] },
  {
    canonical: "Contabilidad",
    aliases: ["contabilidad", "accounting", "contable"],
  },
  { canonical: "Valoración", aliases: ["valoración", "valuation", "dcf"] },
  {
    canonical: "Modelos financieros",
    aliases: ["modelo financiero", "financial modeling"],
  },
  {
    canonical: "Inversiones",
    aliases: ["inversiones", "investing", "portfolio"],
  },
  { canonical: "Auditoría", aliases: ["auditoría", "auditoria", "audit"] },
  { canonical: "Banca", aliases: ["banca", "banking"] },
  { canonical: "Trading", aliases: ["trading", "bloomberg"] },

  // Operaciones / Logística
  {
    canonical: "Supply Chain",
    aliases: ["supply chain", "cadena de suministro"],
  },
  { canonical: "Logística", aliases: ["logística", "logistics", "logistica"] },
  {
    canonical: "Procesos",
    aliases: ["procesos", "process improvement", "kaizen"],
  },
  { canonical: "Lean", aliases: ["lean", "lean manufacturing", "six sigma"] },
  {
    canonical: "Project Management",
    aliases: ["project management", "gestión de proyectos", "pmp"],
  },
  { canonical: "Agile", aliases: ["agile", "scrum", "kanban"] },
  { canonical: "Jira", aliases: ["jira"] },
  { canonical: "Notion", aliases: ["notion"] },
  { canonical: "Trello", aliases: ["trello"] },

  // Idiomas
  { canonical: "Inglés", aliases: ["inglés", "english", "ingles"] },
  { canonical: "Portugués", aliases: ["portugués", "portuguese", "portugues"] },
  { canonical: "Francés", aliases: ["francés", "french", "frances"] },
  { canonical: "Alemán", aliases: ["alemán", "german", "aleman"] },
  { canonical: "Italiano", aliases: ["italiano", "italian"] },
  { canonical: "Mandarín", aliases: ["mandarín", "mandarin", "chino"] },

  // Soft skills
  { canonical: "Liderazgo", aliases: ["liderazgo", "leadership", "lider"] },
  {
    canonical: "Trabajo en equipo",
    aliases: ["trabajo en equipo", "teamwork", "team work"],
  },
  {
    canonical: "Comunicación",
    aliases: ["comunicación", "communication", "comunicacion"],
  },
  {
    canonical: "Resolución de problemas",
    aliases: ["resolución de problemas", "problem solving"],
  },
  {
    canonical: "Pensamiento crítico",
    aliases: ["pensamiento crítico", "critical thinking"],
  },
  {
    canonical: "Negociación",
    aliases: ["negociación", "negotiation", "negociacion"],
  },
  {
    canonical: "Presentaciones",
    aliases: ["presentaciones", "presentations", "public speaking"],
  },
  {
    canonical: "Atención al cliente",
    aliases: ["atención al cliente", "customer service", "atencion al cliente"],
  },
  { canonical: "Storytelling", aliases: ["storytelling", "data storytelling"] },
  { canonical: "Adaptabilidad", aliases: ["adaptabilidad", "adaptability"] },

  // Investigación / Académico
  {
    canonical: "Investigación",
    aliases: ["investigación", "research", "investigacion"],
  },
  {
    canonical: "Redacción técnica",
    aliases: ["redacción técnica", "technical writing"],
  },
  { canonical: "SPSS", aliases: ["spss"] },
  { canonical: "STATA", aliases: ["stata"] },
  { canonical: "MATLAB", aliases: ["matlab"] },
  { canonical: "LaTeX", aliases: ["latex"] },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extrae el set de skills canónicas que aparecen en el texto. Match es
 * case-insensitive y por palabra completa (no matchea "go" dentro de "google").
 */
export function matchSkills(text: string): string[] {
  if (!text || text.length === 0) return [];
  const found = new Set<string>();
  const normalized = text.toLowerCase();

  for (const entry of CATALOG) {
    for (const alias of entry.aliases) {
      const pattern = new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapeRegex(alias.toLowerCase())}(?=$|[^\\p{L}\\p{N}])`,
        "u",
      );
      if (pattern.test(normalized)) {
        found.add(entry.canonical);
        break;
      }
    }
  }

  return Array.from(found).sort();
}

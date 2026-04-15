/**
 * Extrae datos estructurados del cvText (texto plano) + skills del perfil.
 * No usa IA externa — solo regex y coincidencia de keywords.
 */

export interface CVData {
  skills: string[];
  softSkills: string[];
  experience: {
    totalYears: number;
    roles: string[];
  };
  education: {
    degree: string;
    gpa: number;
    institution: string;
  };
  languages: string[];
  hasPortfolio: boolean;
  portfolioLinks: string[];
  rawText: string;
}

const DEGREE_PATTERNS = [
  "ingeniería",
  "ingenieria",
  "licenciatura",
  "licenciado",
  "licenciada",
  "bachelor",
  "máster",
  "master",
  "magíster",
  "magister",
  "doctorado",
  "phd",
  "técnico",
  "tecnico",
  "tecnólogo",
  "tecnologo",
  "contador",
  "abogado",
  "médico",
  "medico",
];

const SOFT_SKILLS_KEYWORDS = [
  "liderazgo",
  "trabajo en equipo",
  "comunicación",
  "proactividad",
  "resolución de problemas",
  "adaptabilidad",
  "creatividad",
  "responsabilidad",
  "organización",
  "autonomía",
];

const LANGUAGE_LEVELS = [
  "a1",
  "a2",
  "b1",
  "b2",
  "c1",
  "c2",
  "nativo",
  "native",
  "fluido",
  "fluent",
  "básico",
  "intermedio",
  "avanzado",
];

const PORTFOLIO_URL_PATTERN =
  /https?:\/\/(github\.com|gitlab\.com|behance\.net|dribbble\.com|portfolio\.|netlify\.app|vercel\.app|web\.|dev\.to)[^\s<"']*/gi;

export function parseCVText(
  cvText: string,
  profileSkills: string[] = [],
): CVData {
  const text = cvText ?? "";
  const lower = text.toLowerCase();

  // --- Skills: combinar profile skills con detección en texto ---
  const skillSet = new Set<string>(profileSkills.map((s) => s.toLowerCase()));

  // --- Soft skills ---
  const softSkills = SOFT_SKILLS_KEYWORDS.filter((sk) => lower.includes(sk));

  // --- Experience: buscar años de experiencia ---
  let totalYears = 0;
  const yearsMatches = [
    ...lower.matchAll(
      /(\d+)\s*(?:\+\s*)?(?:años?|years?)\s+(?:de\s+)?(?:experiencia|experience)/g,
    ),
  ];
  if (yearsMatches.length > 0) {
    // Tomar el primer match válido — suele ser el más representativo
    const firstValid = yearsMatches.find((m) => {
      const n = parseInt(m[1], 10);
      return n > 0 && n < 50;
    });
    if (firstValid) totalYears = parseInt(firstValid[1], 10);
  }

  // Fallback: calcular por rangos de fecha usando el span de carrera completa
  // (no suma — evita doble conteo por experiencias simultáneas)
  if (totalYears === 0) {
    const dateRanges = [
      ...lower.matchAll(
        /20(\d{2})\s*[-–—-]\s*(?:20(\d{2})|presente|actual|present|now)/g,
      ),
    ];
    if (dateRanges.length > 0) {
      const currentYear = new Date().getFullYear();
      const starts = dateRanges.map((m) => 2000 + parseInt(m[1], 10));
      const ends = dateRanges.map((m) =>
        m[2] ? 2000 + parseInt(m[2], 10) : currentYear,
      );
      const earliest = Math.min(...starts);
      const latest = Math.max(...ends);
      totalYears = Math.min(Math.max(0, latest - earliest), 40);
    }
  }

  // Roles previos: líneas que contienen palabras clave de cargos
  const roleKeywords =
    /\b(developer|engineer|diseñador|diseñadora|analista|analyst|manager|coordinador|coordinadora|jefe|jefa|director|directora|consultant|consultor|intern|pasante|practicante)\b/gi;
  const roles: string[] = [];
  for (const m of text.matchAll(roleKeywords)) {
    if (!roles.includes(m[0].toLowerCase())) roles.push(m[0].toLowerCase());
  }

  // --- Education ---
  let degree = "";
  for (const pattern of DEGREE_PATTERNS) {
    if (lower.includes(pattern)) {
      // Tomar contexto alrededor del match
      const idx = lower.indexOf(pattern);
      degree = text
        .slice(Math.max(0, idx - 10), idx + 60)
        .split("\n")[0]
        .trim();
      break;
    }
  }

  // GPA: buscar patrones como "promedio 6.2", "GPA 3.8", "nota 6.5"
  let gpa = 0;
  const gpaMatch = lower.match(
    /(?:promedio|nota|gpa|average)[:\s]+(\d(?:[.,]\d)?)/,
  );
  if (gpaMatch) {
    gpa = parseFloat(gpaMatch[1].replace(",", "."));
  }

  // Institución: heurística simple — línea que contiene "universidad", "university", "instituto"
  let institution = "";
  const lines = text.split("\n");
  for (const line of lines) {
    const l = line.toLowerCase();
    if (
      l.includes("universidad") ||
      l.includes("university") ||
      l.includes("instituto") ||
      l.includes("college")
    ) {
      institution = line.trim();
      break;
    }
  }

  // --- Languages ---
  const languages: string[] = [];
  const langPatterns = [
    { name: "Inglés", keywords: ["inglés", "ingles", "english"] },
    { name: "Portugués", keywords: ["portugués", "portugues", "portuguese"] },
    { name: "Francés", keywords: ["francés", "frances", "french"] },
    { name: "Alemán", keywords: ["alemán", "aleman", "german", "deutsch"] },
    { name: "Italiano", keywords: ["italiano", "italian"] },
    { name: "Chino", keywords: ["chino", "chinese", "mandarin"] },
  ];

  for (const lang of langPatterns) {
    for (const kw of lang.keywords) {
      if (lower.includes(kw)) {
        // Buscar nivel si existe
        let label = lang.name;
        const levelMatch = lower
          .slice(lower.indexOf(kw), lower.indexOf(kw) + 30)
          .match(new RegExp(LANGUAGE_LEVELS.join("|"), "i"));
        if (levelMatch) label += ` ${levelMatch[0].toUpperCase()}`;
        languages.push(label);
        break;
      }
    }
  }

  // --- Portfolio ---
  const portfolioLinks = [...text.matchAll(PORTFOLIO_URL_PATTERN)].map(
    (m) => m[0],
  );
  const hasPortfolio =
    portfolioLinks.length > 0 ||
    lower.includes("portafolio") ||
    lower.includes("portfolio") ||
    lower.includes("github") ||
    lower.includes("behance");

  return {
    skills: Array.from(skillSet),
    softSkills,
    experience: { totalYears, roles },
    education: { degree, gpa, institution },
    languages,
    hasPortfolio,
    portfolioLinks,
    rawText: text,
  };
}

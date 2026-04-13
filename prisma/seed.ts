import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const rawUrl = new URL(process.env.DATABASE_URL!);
rawUrl.searchParams.delete("sslmode");

const pool = new Pool({
  connectionString: rawUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.warn("[seed] HUGGINGFACE_API_KEY no configurada — embedding vacío");
    return [];
  }
  try {
    const res = await fetch(
      "https://router.huggingface.co/hf-inference/models/intfloat/multilingual-e5-small",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text.slice(0, 512) }),
      },
    );
    if (!res.ok) {
      console.warn("[seed] HuggingFace error:", await res.text());
      return [];
    }
    const result = await res.json();
    const embedding: number[] = Array.isArray(result[0]) ? result[0] : result;
    console.log(`    → embedding generado: ${embedding.length} dims`);
    return embedding;
  } catch {
    return [];
  }
}

async function main() {
  // Empresas
  const techcorp = await prisma.user.upsert({
    where: { email: "techcorp@example.com" },
    update: {},
    create: {
      email: "techcorp@example.com",
      name: "TechCorp",
      role: "COMPANY",
      companyProfile: {
        create: {
          companyName: "TechCorp",
          industry: "Tecnología",
          website: "https://techcorp.cl",
        },
      },
    },
    include: { companyProfile: true },
  });

  const startupx = await prisma.user.upsert({
    where: { email: "startupx@example.com" },
    update: {},
    create: {
      email: "startupx@example.com",
      name: "StartupX",
      role: "COMPANY",
      companyProfile: {
        create: {
          companyName: "StartupX",
          industry: "Fintech",
          website: "https://startupx.cl",
        },
      },
    },
    include: { companyProfile: true },
  });

  // Estudiante
  await prisma.user.upsert({
    where: { email: "maria.garcia@example.com" },
    update: {},
    create: {
      email: "maria.garcia@example.com",
      name: "María García",
      role: "STUDENT",
      studentProfile: {
        create: {
          university: "Universidad de Chile",
          career: "Ingeniería Informática",
          skills: ["React", "TypeScript", "Node.js", "Python"],
        },
      },
    },
  });

  console.log("✓ Usuarios creados");

  const techcorpId = techcorp.companyProfile!.id;
  const startupxId = startupx.companyProfile!.id;

  const internshipsData = [
    {
      id: "seed-int-1",
      companyId: techcorpId,
      title: "Practicante Desarrollo Web Frontend",
      description:
        "Desarrollarás interfaces modernas usando React y TypeScript. Trabajarás junto a un equipo de producto en funcionalidades reales para usuarios finales.",
      area: "Ingeniería",
      location: "Santiago",
      modality: "REMOTE" as const,
      duration: "3 meses",
      requirements: [
        "Estudiante de último año de carrera afín",
        "Conocimientos básicos de Git",
      ],
      skills: ["React", "TypeScript", "TailwindCSS"],
    },
    {
      id: "seed-int-2",
      companyId: techcorpId,
      title: "Practicante Data Science",
      description:
        "Analizarás grandes volúmenes de datos para extraer insights de negocio. Aplicarás modelos de machine learning en datasets reales de la empresa.",
      area: "Datos",
      location: "Santiago",
      modality: "HYBRID" as const,
      duration: "6 meses",
      requirements: ["Conocimientos en Python y estadística", "Manejo de SQL"],
      skills: ["Python", "SQL", "Pandas", "Machine Learning"],
    },
    {
      id: "seed-int-3",
      companyId: techcorpId,
      title: "Practicante UX/UI Design",
      description:
        "Diseñarás flujos de usuario y prototipos interactivos para nuestros productos digitales. Participarás en sesiones de investigación con usuarios reales.",
      area: "Diseño",
      location: "Valparaíso",
      modality: "ONSITE" as const,
      duration: "3 meses",
      requirements: ["Portfolio de proyectos", "Manejo de Figma"],
      skills: ["Figma", "Adobe XD", "Prototyping"],
    },
    {
      id: "seed-int-4",
      companyId: startupxId,
      title: "Practicante Marketing Digital",
      description:
        "Gestionarás campañas de performance marketing en Google y Meta. Analizarás métricas y propondrás optimizaciones para mejorar el ROI.",
      area: "Marketing",
      location: "Santiago",
      modality: "REMOTE" as const,
      duration: "3 meses",
      requirements: [
        "Conocimientos básicos de marketing digital",
        "Excel intermedio",
      ],
      skills: ["Google Ads", "Meta Ads", "Analytics", "SEO"],
    },
    {
      id: "seed-int-5",
      companyId: startupxId,
      title: "Practicante Backend Engineer",
      description:
        "Desarrollarás APIs REST para nuestra plataforma de pagos. Trabajarás con arquitectura de microservicios y bases de datos PostgreSQL.",
      area: "Ingeniería",
      location: "Concepción",
      modality: "REMOTE" as const,
      duration: "6 meses",
      requirements: [
        "Conocimientos en Node.js o similar",
        "Fundamentos de bases de datos",
      ],
      skills: ["Node.js", "PostgreSQL", "Docker", "APIs REST"],
    },
    {
      id: "seed-int-6",
      companyId: startupxId,
      title: "Practicante Finanzas",
      description:
        "Apoyarás al equipo de finanzas en el análisis de estados financieros y proyecciones. Automatizarás reportes usando Python y Excel avanzado.",
      area: "Finanzas",
      location: "Santiago",
      modality: "ONSITE" as const,
      duration: "3 meses",
      requirements: [
        "Estudiante de Ingeniería Comercial o afín",
        "Excel avanzado",
      ],
      skills: ["Excel avanzado", "Python", "Análisis financiero"],
    },
  ];

  for (const internship of internshipsData) {
    console.log(`  Generando embedding para "${internship.title}"...`);
    const text = `${internship.title} ${internship.description} ${internship.skills.join(" ")}`;
    const embedding = await generateEmbedding(text);

    await prisma.internship.upsert({
      where: { id: internship.id },
      update: { embedding },
      create: { ...internship, embedding },
    });
  }

  console.log("✓ 6 prácticas creadas con embeddings");
  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
